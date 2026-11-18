import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createCoupon,
  getCategories,
  getCouponById,
  updateCoupon,
  deleteCoupon,
} from "../services/coupons.service";

export const couponSchema = z.object({
  code: z.string().min(1).max(50),
  couponType: z.enum(["amount", "percentage"]),
  discount: z.number().int(),
  maxDiscount: z.number().int().nullable(),
  minimumOrder: z.number().int().min(0),
  fromDate: z.string(),
  toDate: z.string().nullable(),
  isActive: z.boolean(),
});

const parseId = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Adjust to wherever your auth middleware puts the logged-in user
const getCurrentUserId = (req: Request): number | null =>
  (req as any).user?.userId ?? null;

export const createCouponController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("HEADERS:", req.headers.authorization);
    console.log("REQ.USER:", req.user);
    const userId = getCurrentUserId(req);
    if (userId === null) {
      res.status(401).json({ status: "fail", message: "Unauthorized" });
      return;
    }

    const data = couponSchema.parse(req.body);
    const coupon = await createCoupon({ ...data, createdBy: userId });
    res.status(201).json({ status: "success", data: coupon });
  } catch (err) {
    next(err);
  }
};

export const getCategoriesController = async (
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getCategories();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getCouponByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid id" });
      return;
    }

    const coupon = await getCouponById(id);
    if (!coupon) {
      res.status(404).json({ status: "fail", message: "Coupon not found" });
      return;
    }

    res.json({ status: "success", data: coupon });
  } catch (err) {
    next(err);
  }
};

export const updateCouponController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid id" });
      return;
    }

    const userId = getCurrentUserId(req);
    if (userId === null) {
      res.status(401).json({ status: "fail", message: "Unauthorized" });
      return;
    }

    const data = couponSchema.partial().parse(req.body);
    const updated = await updateCoupon(id, { ...data, updatedBy: userId });
    if (!updated) {
      res.status(404).json({ status: "fail", message: "Coupon not found" });
      return;
    }

    res.json({ status: "success", data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCouponController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid id" });
      return;
    }

    const result = await deleteCoupon(id);
    if (!result.success) {
      res.status(404).json({ status: "fail", message: "Coupon not found" });
      return;
    }

    res.json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
};
