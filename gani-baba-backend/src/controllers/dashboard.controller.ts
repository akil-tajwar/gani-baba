import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  DASHBOARD_RANGES,
  getDashboardOverview,
} from "../services/dashboard.service";

// ?range=7D | 15D | 1M | 3M | 6M | 1Y   (D = days, M = months, Y = years)
export const dashboardQuerySchema = z.object({
  range: z.enum(DASHBOARD_RANGES).default("1M"),
});

// Only admins can see the dashboard: role 1, or the "view_dashboard" permission
const requireAdmin = (req: Request) => {
  const allowed =
    req.user?.hasRole(1) || req.user?.hasPermission("view_dashboard");
  if (!allowed) {
    throw new Error("Forbidden");
  }
};

export const getDashboardOverviewController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requireAdmin(req);

    const { range } = dashboardQuerySchema.parse(req.query);
    const data = await getDashboardOverview(range);

    res.json(data);
  } catch (err) {
    next(err);
  }
};
