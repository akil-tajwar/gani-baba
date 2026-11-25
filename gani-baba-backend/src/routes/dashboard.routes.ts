import { Router } from "express";
import { getDashboardOverviewController } from "../controllers/dashboard.controller";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

// GET /api/dashboard/overview?range=7D|15D|1M|3M|6M|1Y   (admin only)
router.get("/overview", authenticateUser, getDashboardOverviewController);

export default router;
