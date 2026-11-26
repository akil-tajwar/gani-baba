import { eq, desc } from "drizzle-orm";
import { db } from "../config/database";
import {
  ordersDetailsModel,
  ordersMasterModel,
  productsModel,
} from "../schemas";
import type { CreateOrderType } from "../controllers/order.controller";
import {
  hasRecentMonthlyVerification,
  verifyOtp,
  verifyPhoneOtp,
} from "./otp.service";
import { BadRequestError } from "./utils/errors.utils";

/**
 * CREATE ORDER
 * - Order is inserted ONLY after verification succeeds.
 * - Logged-in user with fresh 30-day window → skip OTP.
 * - Logged-in user with expired window → verify "order" OTP by phone.
 * - Guest → verify "order" OTP by phone.
 */
export const createOrder = async (
  payload: CreateOrderType,
  userId: number | null,
  otpCode?: string,
) => {
  const { orderMaster, orderDetails } = payload;
  const method = orderMaster.method;

  if (method === "cod") {
    throw new Error("Cash on delivery is not supported");
  }

  // ==========================================
  // VERIFICATION — must succeed BEFORE insert
  // ==========================================
  if (userId !== null) {
    const isVerifiedRecently = await hasRecentMonthlyVerification(userId);

    if (!isVerifiedRecently) {
      if (!otpCode) {
        throw BadRequestError(
          "Verification required. Please request an OTP to continue.",
        );
      }
      // Verify by phone using "order" purpose — works whether the
      // OTP was requested keyed on userId or keyed on phone (guests).
      // If you prefer monthly keyed on userId, swap to:
      //   await verifyOtp(userId, otpCode, "monthly");
      await verifyPhoneOtp(orderMaster.phone, otpCode, "order");
    }
  } else {
    if (!otpCode) {
      throw BadRequestError(
        "Phone verification required. Please request an OTP to continue.",
      );
    }
    await verifyPhoneOtp(orderMaster.phone, otpCode, "order");
  }
  // ==========================================

  return await db.transaction(async (trx) => {
    const [master] = await trx
      .insert(ordersMasterModel)
      .values({
        userId: userId ?? null,
        couponId: orderMaster.couponId ?? null,
        fullName: orderMaster.fullName,
        division: orderMaster.division,
        district: orderMaster.district,
        address: orderMaster.address,
        phone: orderMaster.phone,
        email: orderMaster.email ?? null,
        status: "pending",
        method,
        billingPhone: orderMaster.billingPhone ?? orderMaster.phone,
        transactionId: orderMaster.transactionId ?? "",
        totalAmount: orderMaster.totalAmount,
        createdBy: userId ?? null,
      })
      .returning({ ordersMasterId: ordersMasterModel.ordersMasterId });

    const ordersMasterId = master.ordersMasterId;

    await trx.insert(ordersDetailsModel).values(
      orderDetails.map((item) => ({
        ordersMasterId,
        productId: item.productId,
        quantity: item.quantity,
        amount: item.amount,
        createdBy: userId ?? null,
      })),
    );

    return {
      ordersMasterId,
      message: "Order created successfully",
    };
  });
};

/** GET ALL ORDERS */
export const getAllOrders = async () => {
  const masters = await db
    .select()
    .from(ordersMasterModel)
    .orderBy(desc(ordersMasterModel.createdAt));

  return await Promise.all(
    masters.map(async (master) => {
      const details = await db
        .select({
          ordersDetailsId: ordersDetailsModel.ordersDetailsId,
          ordersMasterId: ordersDetailsModel.ordersMasterId,
          productId: ordersDetailsModel.productId,
          quantity: ordersDetailsModel.quantity,
          amount: ordersDetailsModel.amount,
          createdBy: ordersDetailsModel.createdBy,
          createdAt: ordersDetailsModel.createdAt,
          updatedBy: ordersDetailsModel.updatedBy,
          updatedAt: ordersDetailsModel.updatedAt,
          // ✅ joined fields from products
          productName: productsModel.name,
          photoUrl: productsModel.photoUrl,
        })
        .from(ordersDetailsModel)
        .leftJoin(
          productsModel,
          eq(ordersDetailsModel.productId, productsModel.productId),
        )
        .where(eq(ordersDetailsModel.ordersMasterId, master.ordersMasterId));

      return {
        orderMaster: master,
        orderDetails: details,
      };
    }),
  );
};

/** GET ORDERS BY USER ID (guests excluded) */
export const getOrdersByUserId = async (userId: number) => {
  if (!userId || Number.isNaN(userId)) return [];

  const masters = await db
    .select()
    .from(ordersMasterModel)
    .where(eq(ordersMasterModel.userId, userId))
    .orderBy(desc(ordersMasterModel.createdAt));

  return await Promise.all(
    masters.map(async (master) => {
      const details = await db
        .select({
          ordersDetailsId: ordersDetailsModel.ordersDetailsId,
          ordersMasterId: ordersDetailsModel.ordersMasterId,
          productId: ordersDetailsModel.productId,
          productName: productsModel.name,
          quantity: ordersDetailsModel.quantity,
          amount: ordersDetailsModel.amount,
          createdAt: ordersDetailsModel.createdAt,
        })
        .from(ordersDetailsModel)
        .leftJoin(
          productsModel,
          eq(ordersDetailsModel.productId, productsModel.productId),
        )
        .where(eq(ordersDetailsModel.ordersMasterId, master.ordersMasterId));

      return {
        orderMaster: master,
        orderDetails: details,
      };
    }),
  );
};

/** DELETE ORDER */
export const deleteOrder = async (orderMasterId: number) => {
  return await db.transaction(async (trx) => {
    await trx
      .delete(ordersDetailsModel)
      .where(eq(ordersDetailsModel.ordersMasterId, orderMasterId));

    const [deleted] = await trx
      .delete(ordersMasterModel)
      .where(eq(ordersMasterModel.ordersMasterId, orderMasterId))
      .returning({ ordersMasterId: ordersMasterModel.ordersMasterId });

    if (!deleted) return null;

    return { orderMasterId, message: "Order deleted successfully" };
  });
};

const setOrderStatus = async (
  orderMasterId: number,
  status: "confirmed" | "delivered",
  userId: number,
) => {
  const [updated] = await db
    .update(ordersMasterModel)
    .set({ status, updatedBy: userId })
    .where(eq(ordersMasterModel.ordersMasterId, orderMasterId))
    .returning({ ordersMasterId: ordersMasterModel.ordersMasterId });

  return updated ?? null;
};

export const confirmOrder = async (orderMasterId: number, userId: number) => {
  const updated = await setOrderStatus(orderMasterId, "confirmed", userId);
  if (!updated) return null;

  return {
    orderMasterId,
    status: "confirmed",
    message: "Order confirmed successfully",
  };
};

export const completeOrder = async (orderMasterId: number, userId: number) => {
  const updated = await setOrderStatus(orderMasterId, "delivered", userId);
  if (!updated) return null;

  return {
    orderMasterId,
    status: "delivered",
    message: "Order marked as delivered",
  };
};
