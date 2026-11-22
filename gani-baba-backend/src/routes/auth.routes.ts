import { Router } from "express";
import {
  changePasswordController,
  getUserByIdController,
  getUsersWithRoles,
  login,
  register,
  resendRegistrationOtpController,
  updateUserController,
  verifyRegistrationController,
} from "../controllers/auth.controller";
import { getUserList } from "../controllers/users.controller";

const router = Router();

//router.use(authenticateUser);

router.post("/register", register);
router.post("/verify-registration", verifyRegistrationController);
router.post("/resend-otp", resendRegistrationOtpController);
router.post("/login", login);
router.get("/users", getUserList);
router.get("/user-by-userId/:userId", getUserByIdController);
router.get("/users-by-roles", getUsersWithRoles);
router.put("/users/:userId", updateUserController);
router.patch("/change-password/:userId", changePasswordController);

export default router;
