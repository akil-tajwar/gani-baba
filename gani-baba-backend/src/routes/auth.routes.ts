import { Router } from "express";
import {
  changePasswordController,
  deleteUserController,
  getUserByIdController,
  getUsersController,
  getUsersWithRoles,
  login,
  register,
  resendRegistrationOtpController,
  switchUserRoleController,
  toggleUserStatusController,
  updateUserController,
  verifyRegistrationController,
} from "../controllers/auth.controller";
import { authenticateUser, authLimiter } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/verify-registration", verifyRegistrationController);
router.post("/resend-otp", resendRegistrationOtpController);
router.get("/get-all-users", authenticateUser, getUsersController);
router.get("/get-user-by-id", authenticateUser, getUserByIdController);
router.get("/user-by-userId/:userId", authenticateUser, getUserByIdController);
router.get("/users-by-roles", authenticateUser, getUsersWithRoles);
router.put("/users/:userId", authenticateUser, updateUserController);
router.patch("/change-password", authenticateUser, changePasswordController);
router.delete("/delete-user/:userId", authenticateUser, deleteUserController);
router.patch("/toggle-user-status/:userId", authenticateUser, toggleUserStatusController);
router.patch("/switch-user-role/:userId", authenticateUser, switchUserRoleController);

export default router;
