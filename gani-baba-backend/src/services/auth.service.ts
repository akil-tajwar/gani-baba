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
          active: userData.active ?? true,
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
