import { Router } from "express";
import {
  createCategoryController,
  getCategoriesController,
  getCategoryByIdController,
  updateCategoryController,
  deleteCategoryController,
} from "../controllers/categories.controller";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create", authenticateUser, createCategoryController);
router.get("/get", getCategoriesController);
router.get("/get/:id", getCategoryByIdController);
router.put("/update/:id", authenticateUser, updateCategoryController);
router.delete("/delete/:id", authenticateUser, deleteCategoryController);

export default router;
