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

const router = Router();

//router.use(authenticateUser);

router.post("/register", register);
router.post("/verify-registration", verifyRegistrationController);
router.post("/resend-otp", resendRegistrationOtpController);
router.post("/login", login);
router.get("/get-all-users", getUsersController);
router.get("/user-by-userId/:userId", getUserByIdController);
router.get("/users-by-roles", getUsersWithRoles);
router.put("/users/:userId", updateUserController);
router.patch("/change-password/:userId", changePasswordController);
router.delete("/delete-user/:userId", deleteUserController);
router.patch("/toggle-user-status/:userId", toggleUserStatusController);
router.patch("/switch-user-role/:userId", switchUserRoleController);

export default router;
