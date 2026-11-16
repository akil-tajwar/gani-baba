import { Router } from "express";
import {
  createBrandController,
  getCategoriesController,
  getBrandByIdController,
  updateBrandController,
  deleteBrandController,
} from "../controllers/brands.controller";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create", authenticateUser, createBrandController);
router.get("/get", getCategoriesController);
router.get("/get/:id", getBrandByIdController);
router.put("/update/:id", authenticateUser, updateBrandController);
router.delete("/delete/:id", authenticateUser, deleteBrandController);

export default router;
