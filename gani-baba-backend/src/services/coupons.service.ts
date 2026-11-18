import { db } from "../config/database";
import { couponsModel, NewCoupon } from "../schemas";
import { eq } from "drizzle-orm";

export const createCoupon = async (data: NewCoupon) => {
  const [newCoupon] = await db
    .insert(couponsModel)
    .values(data)
    .returning();
  return newCoupon;
};

export const getCategories = async () => {
  return await db.select().from(couponsModel);
};

export const getCouponById = async (id: number) => {
  return await db.query.couponsModel.findFirst({
    where: eq(couponsModel.couponId, id),
    with: { products: true },
  });
};

export const updateCoupon = async (
  id: number,
  data: Partial<NewCoupon>
) => {
  const [updated] = await db
    .update(couponsModel)
    .set(data)
    .where(eq(couponsModel.couponId, id))
    .returning();

  if (!updated) return undefined;

  return getCouponById(id);
};

export const deleteCoupon = async (id: number) => {
  const deleted = await db
    .delete(couponsModel)
    .where(eq(couponsModel.couponId, id))
    .returning({ couponId: couponsModel.couponId });

  return { success: deleted.length > 0 };
};