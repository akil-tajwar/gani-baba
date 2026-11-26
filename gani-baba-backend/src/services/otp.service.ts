import { db } from "../config/database";
import { otpVerificationModel } from "../schemas";
import { eq, and, desc, gt, isNull, isNotNull } from "drizzle-orm";
import { BadRequestError } from "./utils/errors.utils";
import { generateOtp, hashOtp, sendSms } from "./utils/otp.utils";

type Purpose = "registration" | "monthly" | "order";

// ✅ Replaced BACKOFF_MINUTES with a hard limit
const MAX_RESENDS = 5;

const identityWhere = (
  purpose: Purpose,
  userId: number | null,
  phone: string,
) =>
  userId !== null
    ? and(
        eq(otpVerificationModel.userId, userId),
        eq(otpVerificationModel.purpose, purpose),
      )
    : and(
        isNull(otpVerificationModel.userId),
        eq(otpVerificationModel.phone, phone),
        eq(otpVerificationModel.purpose, purpose),
      );

export const createOtp = async (
  userId: number | null,
  phone: string,
  purpose: Purpose,
  resendCount: number = 0,
) => {
  const rawOtp = generateOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Invalidate old unused OTPs
  await db
    .update(otpVerificationModel)
    .set({ isUsed: true })
    .where(
      and(
        identityWhere(purpose, userId, phone),
        eq(otpVerificationModel.isUsed, false),
      ),
    );

  await db.insert(otpVerificationModel).values({
    userId: userId ?? null,
    phone,
    otpHash,
    purpose,
    expiresAt,
    resendCount,
  });

  await sendSms(
    phone,
    `Your Gani Baba verification code is: ${rawOtp}. Valid for 5 minutes.`,
  );
  return true;
};

export const resendOtp = async (
  userId: number | null,
  phone: string,
  purpose: Purpose,
) => {
  // 1. Look at all OTPs requested in the last 60 minutes
  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentOtps = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        identityWhere(purpose, userId, phone),
        gt(otpVerificationModel.createdAt, sixtyMinutesAgo), // ✅ Check time window
      ),
    );

  // 2. If they've requested 5 or more in the last 60 mins, block them.
  if (recentOtps.length >= 5) {
    throw BadRequestError(
      "You have requested too many OTPs. Please wait 60 minutes and try again.",
    );
  }

  // 3. Otherwise, send the OTP immediately
  const currentCount = recentOtps.length > 0 ? recentOtps.length : 0;

  await createOtp(userId, phone, purpose, currentCount);
  return true;
};

export const verifyOtp = async (
  userId: number,
  rawOtp: string,
  purpose: "registration" | "monthly",
) => {
  const otpHash = hashOtp(rawOtp);

  const [record] = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        eq(otpVerificationModel.userId, userId),
        eq(otpVerificationModel.purpose, purpose),
        eq(otpVerificationModel.isUsed, false),
        eq(otpVerificationModel.otpHash, otpHash),
        gt(otpVerificationModel.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpVerificationModel.createdAt))
    .limit(1);

  if (!record) throw BadRequestError("Invalid or expired OTP");

  // ✅ Set both isUsed AND verifiedAt
  await db
    .update(otpVerificationModel)
    .set({ isUsed: true, verifiedAt: new Date() })
    .where(eq(otpVerificationModel.otpId, record.otpId));

  return true;
};

export const verifyPhoneOtp = async (
  phone: string,
  rawOtp: string,
  purpose: Purpose = "order",
) => {
  const otpHash = hashOtp(rawOtp);

  const [record] = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        eq(otpVerificationModel.phone, phone),
        eq(otpVerificationModel.purpose, purpose),
        eq(otpVerificationModel.isUsed, false),
        eq(otpVerificationModel.otpHash, otpHash),
        gt(otpVerificationModel.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpVerificationModel.createdAt))
    .limit(1);

  if (!record) throw BadRequestError("Invalid or expired OTP");

  // ✅ Set both isUsed AND verifiedAt
  await db
    .update(otpVerificationModel)
    .set({ isUsed: true, verifiedAt: new Date() })
    .where(eq(otpVerificationModel.otpId, record.otpId));

  return true;
};

export const hasRecentMonthlyVerification = async (userId: number) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recent] = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        eq(otpVerificationModel.userId, userId),
        isNotNull(otpVerificationModel.verifiedAt), // ✅ Must be actually verified
        gt(otpVerificationModel.verifiedAt, thirtyDaysAgo), // ✅ Check verifiedAt
      ),
    )
    .limit(1);

  return !!recent;
};
