import { db } from "../config/database";
import { otpVerificationModel } from "../schemas";
import { eq, and, desc, gt, isNull } from "drizzle-orm";
import { BadRequestError } from "./utils/errors.utils";
import { generateOtp, hashOtp, sendSms } from "./utils/otp.utils";

type Purpose = "registration" | "monthly" | "order";

// Resend backoff: 15m, 1h, 3h, 12h, 24h
const BACKOFF_MINUTES = [15, 60, 180, 720, 1440];

/**
 * Identity matcher: guests are matched by phone + null userId;
 * logged-in users by userId.
 */
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

// ================================================================
// CREATE
// ================================================================
export const createOtp = async (
  userId: number | null,
  phone: string,
  purpose: Purpose,
  resendCount: number = 0,
) => {
  const rawOtp = generateOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Invalidate any unused OTPs for this identity + purpose
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

// ================================================================
// RESEND (backoff-aware)
// ================================================================
export const resendOtp = async (
  userId: number | null,
  phone: string,
  purpose: Purpose,
) => {
  const [latestOtp] = await db
    .select()
    .from(otpVerificationModel)
    .where(identityWhere(purpose, userId, phone))
    .orderBy(desc(otpVerificationModel.createdAt))
    .limit(1);

  const currentCount = latestOtp ? latestOtp.resendCount : 0;

  if (currentCount >= BACKOFF_MINUTES.length) {
    throw BadRequestError(
      "Maximum resend limit reached. Please try again tomorrow.",
    );
  }

  const requiredWaitMinutes = BACKOFF_MINUTES[currentCount];

  if (latestOtp?.createdAt) {
    const timePassedMinutes =
      (Date.now() - latestOtp.createdAt.getTime()) / 1000 / 60;

    if (timePassedMinutes < requiredWaitMinutes) {
      const remainingMinutes = Math.ceil(
        requiredWaitMinutes - timePassedMinutes,
      );
      throw BadRequestError(
        `Please wait ${remainingMinutes} minutes before requesting a new OTP.`,
      );
    }
  }

  await createOtp(userId, phone, purpose, currentCount + 1);
  return true;
};

// ================================================================
// VERIFY — by userId (registration / monthly)
// ================================================================
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

  await db
    .update(otpVerificationModel)
    .set({ isUsed: true })
    .where(eq(otpVerificationModel.otpId, record.otpId));

  return true;
};

// ================================================================
// VERIFY — by phone (guest "order" purpose, also used at checkout)
// ================================================================
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

  await db
    .update(otpVerificationModel)
    .set({ isUsed: true })
    .where(eq(otpVerificationModel.otpId, record.otpId));

  return true;
};

// ================================================================
// 30-DAY WINDOW CHECK (checkout)
// ================================================================
/**
 * Returns true if the user verified via "registration" OR "monthly"
 * (or "order") within the last 30 days. Any successful verification
 * counts, so registration + first 30 days are covered.
 */
export const hasRecentMonthlyVerification = async (userId: number) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recent] = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        eq(otpVerificationModel.userId, userId),
        eq(otpVerificationModel.isUsed, true),
        gt(otpVerificationModel.createdAt, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(otpVerificationModel.createdAt))
    .limit(1);

  return !!recent;
};
