import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { db } from "../config/database";
import { roleModel, userModel } from "../schemas";
import { eq } from "drizzle-orm";
import {
  changePassword,
  createUser,
  deleteUser,
  findUserByPhone,
  getUserById,
  getUsers,
  loginUser,
  switchUserRole,
  toggleUserStatus,
  updateUser,
  verifyRegistration,
} from "../services/auth.service";
import { resendOtp, verifyOtp } from "../services/otp.service";
import { requirePermission } from "../services/utils/jwt.utils";

const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(/^[0-9]{10,15}$/, "Invalid phone number"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

const registerSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    phone: z
      .string()
      .min(1, "Phone is required")
      .regex(/^[0-9]{10,15}$/, "Invalid phone number"),
    email: z
      .string()
      .email("Invalid email address")
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    active: z.boolean().default(true),
    fullName: z.string().optional(),
    division: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z
      .string()
      .min(8, "Confirm new password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"],
  });

const parseId = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const result = await loginUser(phone, password);

    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      username,
      phone,
      email,
      password,
      active,
      fullName,
      division,
      district,
      address,
    } = registerSchema.parse(req.body);

    const user = await createUser({
      username,
      phone,
      email: email ?? null,
      password,
      active,
      roleId: 2,
      fullName,
      division,
      district,
      address,
    });

    res.status(201).json({
      status: "success",
      data: {
        user: {
          username: user.username,
          phone: user.phone,
          email: user.email,
          roleId: user.roleId,
          active: user.active,
          fullName: user.fullName,
          division: user.division,
          district: user.district,
          address: user.address,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRegistrationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { phone, otpCode } = req.body;

    if (!phone || !otpCode) {
      res
        .status(400)
        .json({ status: "fail", message: "Phone and OTP are required" });
      return;
    }

    // 1. Find the user
    const user = await findUserByPhone(phone);
    if (!user) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    // 2. If they are already active, no need to verify again
    if (user.active) {
      res
        .status(400)
        .json({
          status: "fail",
          message: "Account is already verified. Please login.",
        });
      return;
    }

    // 3. Verify the OTP (this will throw an error if wrong/expired)
    await verifyOtp(user.userId, otpCode, "registration");

    // 4. Activate the user
    await verifyRegistration(user.userId);

    res.status(200).json({
      status: "success",
      message: "Account verified successfully. You can now login.",
    });
  } catch (error) {
    next(error); // passes OTP errors to your global error handler
  }
};

export const resendRegistrationOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { phone } = req.body;
    const user = await findUserByPhone(phone);

    if (!user) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    await resendOtp(user.userId, phone, "registration");

    res
      .status(200)
      .json({ status: "success", message: "OTP resent successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    requirePermission(req, "edit_users");
    const id = parseId(req.params.userId);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid userId" });
      return;
    }

    const {
      username,
      phone,
      email,
      roleId,
      active,
      fullName,
      division,
      district,
      address,
    } = req.body;

    const updateData: {
      username?: string;
      phone?: string;
      email?: string | null;
      roleId?: number;
      active?: boolean;
      fullName?: string;
      division?: string;
      district?: string;
      address?: string;
    } = {};

    if (username !== undefined) updateData.username = username;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (roleId !== undefined) updateData.roleId = Number(roleId);
    if (active !== undefined) updateData.active = Boolean(active);
    if (fullName !== undefined) updateData.fullName = fullName;
    if (division !== undefined) updateData.division = division;
    if (district !== undefined) updateData.district = district;
    if (address !== undefined) updateData.address = address;

    const updatedUser = await updateUser(id, updateData);

    if (!updatedUser) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    res.status(200).json({ status: "success", data: { user: updatedUser } });
  } catch (error) {
    next(error);
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requirePermission(req, "edit_users");

    const id = (req as any).user?.userId;
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid userId" });
      return;
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body,
    );

    await changePassword(id, currentPassword, newPassword);

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getUsersWithRoles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requirePermission(req, "view_users");

    const usersWithRoles = await db
      .select({
        userId: userModel.userId,
        username: userModel.username,
        phone: userModel.phone,
        active: userModel.active,
        roleName: roleModel.roleName,
      })
      .from(userModel)
      .innerJoin(roleModel, eq(userModel.roleId, roleModel.roleId));

    res.status(200).json({
      status: "success",
      data: {
        users: usersWithRoles.map((user) => ({
          id: user.userId,
          username: user.username,
          phone: user.phone,
          active: user.active,
          roleName: user.roleName,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserByIdController = async (
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    requirePermission(req, "view_my_profile");
    const id = (req as any).user?.userId;
    if (id === null) {
      res.status(400).json({ message: "Invalid userId" });
      return;
    }

    const user = await getUserById(id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const getUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requirePermission(req, "view_users");
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const deleteUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, "delete_users");
    const id = parseId(req.params.userId);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid userId" });
      return;
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    res.status(200).json({ status: "success", message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, "edit_user_status");

    const id = parseId(req.params.userId);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid userId" });
      return;
    }

    const { active } = req.body;
    if (typeof active !== "boolean") {
      res.status(400).json({ status: "fail", message: "Active status must be a boolean" });
      return;
    }

    const updated = await toggleUserStatus(id, active);
    if (!updated) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    next(error);
  }
};

export const switchUserRoleController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, "edit_user_role");
    const id = parseId(req.params.userId);
    if (id === null) {
      res.status(400).json({ status: "fail", message: "Invalid userId" });
      return;
    }

    const { roleId } = req.body;
    
    if (!roleId || typeof roleId !== "number") {
      res.status(400).json({ status: "fail", message: "A valid roleId is required" });
      return;
    }

    const updatedUser = await switchUserRole(id, roleId);

    res.status(200).json({ 
      status: "success", 
      message: "User role updated successfully", 
      data: { user: updatedUser } 
    });
  } catch (error) {
    next(error);
  }
};