import { Router } from "express";
import {
  createCouponController,
  getCategoriesController,
  getCouponByIdController,
  updateCouponController,
  deleteCouponController,
} from "../controllers/coupons.controller";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create", authenticateUser, createCouponController);
router.get("/get", getCategoriesController);
router.get("/get/:id", getCouponByIdController);
router.put("/update/:id", authenticateUser, updateCouponController);
router.delete("/delete/:id", authenticateUser, deleteCouponController);

export default router;
