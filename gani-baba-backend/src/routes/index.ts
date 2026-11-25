import { Router } from "express";

import authRoutes from "./auth.routes";
import categoryRoutes from "./categories.routes";
import brandRoutes from "./brands.routes"
import couponRoutes from "./coupons.routes";
import productRoutes from "./product.routes";
import orderRoutes from "./order.routes";
import dashboardRoutes from "./dashboard.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/coupons", couponRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
