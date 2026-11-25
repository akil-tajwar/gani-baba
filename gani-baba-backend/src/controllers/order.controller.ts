import { Request, Response } from "express";
import { z } from "zod";
import {
  completeOrder,
  confirmOrder,
  createOrder,
  deleteOrder,
  getAllOrders,
  getOrdersByUserId,
} from "../services/order.service";
import { inArray, eq } from "drizzle-orm";
import { db } from "../config/database";
import { couponsModel, productsModel } from "../schemas";
import { requirePermission } from "../services/utils/jwt.utils";
import { createOtp, resendOtp } from "../services/otp.service";

export const ordersSchema = z.object({
  orderMaster: z.object({
    couponId: z.number().int().nullable().optional(),
    fullName: z.string().max(255),
    division: z.string().max(15),
    district: z.string().max(15),
    address: z.string().max(100),
    phone: z.string().max(14),
    email: z.string().max(50).nullable().optional(),
    method: z.enum(["bkash", "nagad", "rocket", "cod"]),
    billingPhone: z.string().max(14).optional(),
    transactionId: z.string().max(255).nullable().optional(),
    totalAmount: z.number().int().nonnegative(),
    discountAmount: z.number().int().nonnegative().optional(),
  }),

  orderDetails: z
    .array(
      z.object({
        productId: z.number().int(),
        quantity: z.number().int().min(1).default(1),
        amount: z.number().int().nonnegative(),
      }),
    )
    .min(1, "Order must contain at least one item"),

  otpCode: z.string().min(1).optional(),
});

export type CreateOrderType = z.infer<typeof ordersSchema>;
export type GetOrderType = z.infer<typeof ordersSchema>;

const phoneSchema = z.object({ phone: z.string().min(10).max(14) });

const parseId = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getCurrentUserId = (req: Request): number | null => {
  console.log("🚀 ~ getCurrentUserId ~ req:", req)
  return (req as any).user?.userId ?? null;
};

const handleError = (error: unknown, res: Response, fallback: string) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues,
    });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, message: fallback });
};

const todayStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toDateOnly = (s: string | null | undefined): string | null => {
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const computeServerTotals = async (payload: CreateOrderType) => {
  const { orderDetails, orderMaster } = payload;

  const productIds = Array.from(new Set(orderDetails.map((d) => d.productId)));

  const dbProducts = await db
    .select()
    .from(productsModel)
    .where(inArray(productsModel.productId, productIds));

  if (dbProducts.length !== productIds.length) {
    const found = new Set(dbProducts.map((p) => p.productId));
    const missing = productIds.filter((id) => !found.has(id));
    throw new Error(`Product(s) not found: ${missing.join(", ")}`);
  }

  const productMap = new Map(dbProducts.map((p) => [p.productId, p]));

  let serverSubtotal = 0;

  for (const line of orderDetails) {
    const product = productMap.get(line.productId)!;
    const basePrice = Number(product.price);
    const discountPct = Number(product.discount ?? 0);

    const effectiveUnitPrice =
      discountPct > 0 ? basePrice - (basePrice * discountPct) / 100 : basePrice;

    const expectedLine = Math.round(effectiveUnitPrice * line.quantity);

    if (Math.round(line.amount) !== expectedLine) {
      throw new Error(
        `Price mismatch for product ${line.productId}: ` +
          `expected ${expectedLine}, received ${line.amount}. ` +
          `Prices may have changed — please refresh your cart.`,
      );
    }

    serverSubtotal += expectedLine;
  }

  let serverDiscount = 0;

  if (orderMaster.couponId != null) {
    const [coupon] = await db
      .select()
      .from(couponsModel)
      .where(eq(couponsModel.couponId, orderMaster.couponId))
      .limit(1);

    if (!coupon) throw new Error("Selected coupon no longer exists.");
    if (!coupon.isActive) throw new Error("This coupon is no longer active.");

    const today = todayStr();
    const from = toDateOnly(coupon.fromDate as unknown as string);
    const to = toDateOnly(coupon.toDate as unknown as string | null);

    if (from && today < from) throw new Error("This coupon is not valid yet.");
    if (to && today > to) throw new Error("This coupon has expired.");

    if (serverSubtotal < (coupon.minimumOrder ?? 0)) {
      throw new Error(
        `Order total must be at least ৳${coupon.minimumOrder} to use this coupon.`,
      );
    }

    if (coupon.couponType === "amount") {
      serverDiscount = coupon.discount;
    } else {
      serverDiscount = (serverSubtotal * coupon.discount) / 100;
      if (coupon.maxDiscount != null && serverDiscount > coupon.maxDiscount) {
        serverDiscount = coupon.maxDiscount;
      }
    }

    serverDiscount = Math.min(
      Math.round(serverDiscount),
      Math.round(serverSubtotal),
    );
  }

  const serverTotal = Math.max(0, Math.round(serverSubtotal) - serverDiscount);

  return { serverSubtotal, serverDiscount, serverTotal };
};

// ================================================================
// CREATE ORDER — public (guest-friendly)
// ================================================================
export const createOrderController = async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId(req); // number | null — guests allowed

    const payload = ordersSchema.parse(req.body);

    let totals: {
      serverSubtotal: number;
      serverDiscount: number;
      serverTotal: number;
    };
    try {
      totals = await computeServerTotals(payload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Order validation failed";
      res.status(400).json({ success: false, message });
      return;
    }

    const claimedTotal = Math.round(payload.orderMaster.totalAmount);
    if (claimedTotal !== totals.serverTotal) {
      res.status(400).json({
        success: false,
        message:
          "Order total mismatch. Prices or discounts may have changed — please refresh and try again.",
        data: {
          claimedTotal,
          serverTotal: totals.serverTotal,
          subtotal: totals.serverSubtotal,
          discount: totals.serverDiscount,
        },
      });
      return;
    }

    // Insert — service verifies OTP (guest or expired-window user) BEFORE insert
    const result = await createOrder(
      {
        ...payload,
        orderMaster: {
          ...payload.orderMaster,
          totalAmount: totals.serverTotal,
          discountAmount: totals.serverDiscount,
        },
      },
      userId,
      payload.otpCode,
    );

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: result,
    });
  } catch (error) {
    // Surface the OTP-required / invalid-OTP error as a 400, not 500
    if (error instanceof Error && !(error instanceof z.ZodError)) {
      const msg = error.message || "";
      if (
        msg.includes("OTP") ||
        msg.includes("Verification") ||
        msg.includes("verify")
      ) {
        res.status(400).json({ success: false, message: msg });
        return;
      }
    }
    handleError(error, res, "Failed to create order");
  }
};

// ================================================================
// OTP REQUEST — public (guests + logged-in re-verification)
// ================================================================
export const requestOrderOtpController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const userId = getCurrentUserId(req); // null for guests

    try {
      await createOtp(userId, phone, "order");
    } catch {
      await resendOtp(userId, phone, "order");
    }

    res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    handleError(error, res, "Failed to send OTP");
  }
};

// ================================================================
// REST (unchanged)
// ================================================================
export const getAllOrdersController = async (_req: Request, res: Response) => {
  try {
    requirePermission(_req, "view_all_orders");
    const result = await getAllOrders();
    res.status(200).json(result);
  } catch (error) {
    handleError(error, res, "Failed to fetch orders");
  }
};

export const getOrdersByUserIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    requirePermission(req, "view_orders");
    const userId = parseId(req.params.userId);
    if (userId === null) {
      res.status(400).json({ success: false, message: "Invalid userId" });
      return;
    }
    const result = await getOrdersByUserId(userId);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, res, "Failed to fetch user orders");
  }
};

export const deleteOrderController = async (req: Request, res: Response) => {
  try {
    requirePermission(req, "delete_orders");
    const orderMasterId = parseId(req.params.orderMasterId);
    if (orderMasterId === null) {
      res
        .status(400)
        .json({ success: false, message: "Invalid orderMasterId" });
      return;
    }
    const result = await deleteOrder(orderMasterId);
    if (!result) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.status(200).json({
      success: true,
      message: result.message,
      orderMasterId: result.orderMasterId,
    });
  } catch (error) {
    handleError(error, res, "Failed to delete order");
  }
};

export const confirmOrderController = async (req: Request, res: Response) => {
  try {
    requirePermission(req, "confirm_orders");
    const orderMasterId = parseId(req.params.id);
    if (orderMasterId === null) {
      res
        .status(400)
        .json({ success: false, message: "Invalid orderMasterId" });
      return;
    }
    const userId = getCurrentUserId(req);
    if (userId === null) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const result = await confirmOrder(orderMasterId, userId);
    if (!result) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    handleError(error, res, "Failed to confirm order");
  }
};

export const completeOrderController = async (req: Request, res: Response) => {
  try {
    requirePermission(req, "complete_orders");
    const orderMasterId = parseId(req.params.id);
    if (orderMasterId === null) {
      res
        .status(400)
        .json({ success: false, message: "Invalid orderMasterId" });
      return;
    }
    const userId = getCurrentUserId(req);
    if (userId === null) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const result = await completeOrder(orderMasterId, userId);
    if (!result) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    handleError(error, res, "Failed to complete order");
  }
};
