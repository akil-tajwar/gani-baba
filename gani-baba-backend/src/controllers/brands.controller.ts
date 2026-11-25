import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createBrand,
  getCategories,
  getBrandById,
  updateBrand,
  deleteBrand,
} from "../services/brands.service";
import { requirePermission } from "../services/utils/jwt.utils";

export const brandSchema = z.object({
  name: z.string().min(1).max(100),
});

const parseId = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Adjust to wherever your auth middleware puts the logged-in user
const getCurrentUserId = (req: Request): number | null =>
  (req as any).user?.userId ?? null;

export const createBrandController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requirePermission(req, "create_brand");
    console.log("HEADERS:", req.headers.authorization);
    console.log("REQ.USER:", req.user);
    const userId = getCurrentUserId(req);
    if (userId === null) {
      res.status(401).json({ status: "fail", message: "Unauthorized" });
      return;
    }

    const data = brandSchema.parse(req.body);
    const brand = await createBrand({ ...data, createdBy: userId });
    res.status(201).json({ status: "success", data: brand });
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

export const getBrandByIdController = async (
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

    const brand = await getBrandById(id);
    if (!brand) {
      res.status(404).json({ status: "fail", message: "Brand not found" });
      return;
    }

    res.json({ status: "success", data: brand });
  } catch (err) {
    next(err);
  }
};

export const updateBrandController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requirePermission(req, "update_brand");
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

    const data = brandSchema.partial().parse(req.body);
    const updated = await updateBrand(id, { ...data, updatedBy: userId });
    if (!updated) {
      res.status(404).json({ status: "fail", message: "Brand not found" });
      return;
    }

    res.json({ status: "success", data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteBrandController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requirePermission(req, "delete_brand");
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid id" });
      return;
    }

    const result = await deleteBrand(id);
    if (!result.success) {
      res.status(404).json({ status: "fail", message: "Brand not found" });
      return;
    }

    res.json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
};
