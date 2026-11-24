import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { BadRequestError, UnauthorizedError } from "./utils/errors.utils";
import { generateAccessToken } from "./utils/jwt.utils";
import {
  comparePassword,
  hashPassword,
  validatePassword,
} from "./utils/password.utils";
import { NewUser, userModel, roleModel, userRolesModel } from "../schemas";
import { createOtp } from "./otp.service";

const isUniqueViolation = (error: any): boolean =>
  error?.code === "23505" || error?.cause?.code === "23505";

const safeUserColumns = {
  userId: userModel.userId,
  username: userModel.username,
  email: userModel.email,
  phone: userModel.phone,
  roleId: userModel.roleId,
  active: userModel.active,
  fullName: userModel.fullName,
  division: userModel.division,
  district: userModel.district,
  address: userModel.address,
};

// ---------- Finders ----------

export const findUserByPhone = async (phone: string) => {
  const [user] = await db
    .select()
    .from(userModel)
    .where(eq(userModel.phone, phone));
  return user;
};

export const findUserByUsername = async (username: string) => {
  const [user] = await db
    .select()
    .from(userModel)
    .where(eq(userModel.username, username));
  return user;
};

export const findUserByEmail = async (email: string) => {
  const [user] = await db
    .select()
    .from(userModel)
    .where(eq(userModel.email, email));
  return user;
};

export const getUserDetailsByUserId = async (userId: number) => {
  const user = await db.query.userModel.findFirst({
    where: eq(userModel.userId, userId),
    columns: { password: false },
    with: {
      role: {
        with: {
          rolePermissions: {
            with: { permission: true },
          },
        },
      },
    },
  });
  return user;
};

// ---------- Create ----------
export const createUser = async (userData: NewUser) => {
  // Pre-checks (reads — safe to do outside the transaction)
  const existingPhone = await findUserByPhone(userData.phone);
  if (existingPhone) {
    throw BadRequestError(
      "Phone number already registered, please try another",
    );
  }

  const existingUsername = await findUserByUsername(userData.username);
  if (existingUsername) {
    throw BadRequestError("Username already registered, please try another");
  }

  if (userData.email) {
    const existingEmail = await findUserByEmail(userData.email);
    if (existingEmail) {
      throw BadRequestError("Email already registered, please try another");
    }
  }

  validatePassword(userData.password);
  const hashedPassword = await hashPassword(userData.password);

  const ROLE_ID = 2; // default role for self-registered users

  // Transaction: user + user_roles must both succeed or both roll back
  try {
    const newUser = await db.transaction(async (tx) => {
      const [insertedUser] = await tx
        .insert(userModel)
        .values({
          username: userData.username,
          phone: userData.phone,
          email: userData.email ?? null,
          password: hashedPassword,
          active: false, // <--- INACTIVE until OTP is verified
          roleId: ROLE_ID,
          fullName: userData.fullName,
          division: userData.division,
          district: userData.district,
          address: userData.address,
        })
        .returning(safeUserColumns);

      // Insert into the join table (composite PK: userId + roleId)
      await tx.insert(userRolesModel).values({
        userId: insertedUser.userId,
        roleId: ROLE_ID,
      });

      return insertedUser;
    });

    // Trigger OTP sending AFTER the user is successfully created
    // (Outside the transaction so we don't hold a DB lock during an API call)
    await createOtp(newUser.userId, newUser.phone!, "registration");

    return newUser;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw BadRequestError(
        "Username, phone or email already registered, please try another",
      );
    }
    throw error;
  }
};

export const verifyRegistration = async (userId: number) => {
  await db
    .update(userModel)
    .set({ active: true })
    .where(eq(userModel.userId, userId));
};

// ---------- Read ----------
export const getUsers = async () => {
  return await db
    .select({
      userId: userModel.userId,
      username: userModel.username,
      email: userModel.email,
      phone: userModel.phone,
      active: userModel.active,
      roleId: userModel.roleId,
      fullName: userModel.fullName,
      division: userModel.division,
      district: userModel.district,
      address: userModel.address,
      createdAt: userModel.createdAt,
      updatedAt: userModel.updatedAt,
      roleName: roleModel.roleName,
    })
    .from(userModel)
    .leftJoin(roleModel, eq(userModel.roleId, roleModel.roleId));
};

export const getUserById = async (userId: number) => {
  const [user] = await db
    .select({
      userId: userModel.userId,
      username: userModel.username,
      email: userModel.email,
      phone: userModel.phone,
      active: userModel.active,
      roleId: userModel.roleId,
      fullName: userModel.fullName,
      division: userModel.division,
      district: userModel.district,
      address: userModel.address,
      createdAt: userModel.createdAt,
      updatedAt: userModel.updatedAt,
      roleName: roleModel.roleName,
    })
    .from(userModel)
    .leftJoin(roleModel, eq(userModel.roleId, roleModel.roleId))
    .where(eq(userModel.userId, userId))
    .limit(1);

  return user ?? null;
};

// ---------- Update ----------

export const updateUser = async (
  userId: number,
  updateData: {
    username?: string;
    phone?: string;
    email?: string | null;
    roleId?: number;
    active?: boolean;
    fullName?: string;
    division?: string;
    district?: string;
    address?: string;
  },
) => {
  try {
    const [updatedUser] = await db
      .update(userModel)
      .set(updateData)
      .where(eq(userModel.userId, userId))
      .returning(safeUserColumns);

    return updatedUser;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw BadRequestError(
        "Username, phone or email already registered, please try another",
      );
    }
    throw error;
  }
};

// ---------- Login ----------

export const loginUser = async (phone: string, password: string) => {
  const user = await findUserByPhone(phone);

  if (!user) {
    throw UnauthorizedError(
      "Wrong phone/password. Please contact with Administrator",
    );
  }

  validatePassword(password);
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw UnauthorizedError(
      "Wrong phone/password. Please contact with Administrator",
    );
  }

  // ==========================================
  // ACTIVE STATUS CHECK
  // ==========================================
  if (!user.active) {
    // Throwing an error here prevents token generation.
    // The frontend can catch this specific message and prompt for OTP.
    throw UnauthorizedError(
      "Account is not verified. Please verify your phone number with the OTP sent during registration.",
    );
  }
  // ==========================================

  const userDetails = await getUserDetailsByUserId(user.userId);
  const permissions =
    userDetails?.role?.rolePermissions.map((ur) => ur.permission.name) || [];

  const token = generateAccessToken({
    userId: user.userId,
    username: user.username,
    role: user.roleId ?? null,
    permissions,
    hasPermission: (perm: string) => permissions.includes(perm),
  });

  return { token, user: userDetails };
};

// ---------- Change password ----------

export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
) => {
  const [user] = await db
    .select()
    .from(userModel)
    .where(eq(userModel.userId, userId));

  if (!user) throw UnauthorizedError("User not found");

  const isValidPassword = await comparePassword(currentPassword, user.password);
  if (!isValidPassword)
    throw UnauthorizedError("Current password is incorrect");

  validatePassword(newPassword);
  const hashedPassword = await hashPassword(newPassword);

  await db
    .update(userModel)
    .set({ password: hashedPassword })
    .where(eq(userModel.userId, userId));
};

export const deleteUser = async (userId: number) => {
  const [deletedUser] = await db
    .delete(userModel)
    .where(eq(userModel.userId, userId))
    .returning({ id: userModel.userId });
    
  return deletedUser;
};

export const toggleUserStatus = async (userId: number, active: boolean) => {
  const [updatedUser] = await db
    .update(userModel)
    .set({ active })
    .where(eq(userModel.userId, userId))
    .returning({ id: userModel.userId, active: userModel.active });
    
  return updatedUser;
};

export const switchUserRole = async (userId: number, newRoleId: number) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Check if the new role exists
      const roleExists = await tx
        .select()
        .from(roleModel)
        .where(eq(roleModel.roleId, newRoleId))
        .limit(1);

      if (roleExists.length === 0) {
        throw BadRequestError("Role not found");
      }

      // 2. Update the main users table
      const [updatedUser] = await tx
        .update(userModel)
        .set({ roleId: newRoleId })
        .where(eq(userModel.userId, userId))
        .returning(safeUserColumns);

      if (!updatedUser) {
        throw BadRequestError("User not found");
      }

      // 3. Update the user_roles join table
      // First, clear their existing roles
      await tx
        .delete(userRolesModel)
        .where(eq(userRolesModel.userId, userId));

      // Then, insert the new role
      await tx.insert(userRolesModel).values({
        userId: userId,
        roleId: newRoleId,
      });

      return updatedUser;
    });

    return result;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw BadRequestError("Role update conflicted with another constraint");
    }
    throw error;
  }
};