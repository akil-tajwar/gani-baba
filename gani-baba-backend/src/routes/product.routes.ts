import { Router } from "express";
import {
  createProductController,
  getProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
} from "../controllers/product.controller";
import { upload } from "../middlewares/upload";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create", authenticateUser, upload.single("photo"), createProductController);
router.get("/get", getProductsController);
router.get("/get/:id", getProductByIdController);
router.put("/update/:id", authenticateUser, upload.single("photo"), updateProductController);
router.delete("/delete/:id", authenticateUser, deleteProductController);

export default router;
