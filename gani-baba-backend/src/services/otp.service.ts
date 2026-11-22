import { db } from "../config/database";
import { otpVerificationModel } from "../schemas";
import { eq, and, desc, gt } from "drizzle-orm";
import { BadRequestError } from "./utils/errors.utils";
import { generateOtp, hashOtp, sendSms } from "./utils/otp.utils";

// 1. Generate and Save OTP
// The wait times in minutes: 15m, 1hr, 3hr, 12hr, 24hr
const BACKOFF_MINUTES = [15, 60, 180, 720, 1440];

export const createOtp = async (
  userId: number,
  phone: string,
  purpose: "registration" | "monthly",
  resendCount: number = 0
) => {
  const rawOtp = generateOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins to enter code

  // Invalidate old unused OTPs
  await db
    .update(otpVerificationModel)
    .set({ isUsed: true })
    .where(
      and(
        eq(otpVerificationModel.userId, userId),
        eq(otpVerificationModel.purpose, purpose),
        eq(otpVerificationModel.isUsed, false)
      )
    );

  await db.insert(otpVerificationModel).values({
    userId,
    phone,
    otpHash,
    purpose,
    expiresAt,
    resendCount,
  });

  const msg = `Your Gani Baba verification code is: ${rawOtp}. Valid for 5 minutes.`;
  await sendSms(phone, msg);
  
  return true;
};

export const resendOtp = async (
  userId: number,
  phone: string,
  purpose: "registration" | "monthly"
) => {
  // Get the latest OTP for this purpose
  const [latestOtp] = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        eq(otpVerificationModel.userId, userId),
        eq(otpVerificationModel.purpose, purpose)
      )
    )
    .orderBy(desc(otpVerificationModel.createdAt))
    .limit(1);

  const currentCount = latestOtp ? latestOtp.resendCount : 0;
  
  // If they hit the max limit (5 times), block them completely
  if (currentCount >= BACKOFF_MINUTES.length) {
    throw BadRequestError("Maximum resend limit reached. Please try again tomorrow.");
  }

  const requiredWaitMinutes = BACKOFF_MINUTES[currentCount];
  
  if (latestOtp?.createdAt) {
    const timePassedMs = Date.now() - latestOtp.createdAt.getTime();
    const timePassedMinutes = timePassedMs / 1000 / 60;

    if (timePassedMinutes < requiredWaitMinutes) {
      const remainingMinutes = Math.ceil(requiredWaitMinutes - timePassedMinutes);
      throw BadRequestError(`Please wait ${remainingMinutes} minutes before requesting a new OTP.`);
    }
  }

  // Send new OTP with incremented count
  await createOtp(userId, phone, purpose, currentCount + 1);
  return true;
};

// 2. Verify OTP
export const verifyOtp = async (
  userId: number,
  rawOtp: string,
  purpose: "registration" | "monthly"
) => {
  const otpHash = hashOtp(rawOtp);
  const dbPurpose = purpose;

  // Find the latest valid OTP
  const [record] = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        eq(otpVerificationModel.userId, userId),
        eq(otpVerificationModel.purpose, dbPurpose),
        eq(otpVerificationModel.isUsed, false),
        eq(otpVerificationModel.otpHash, otpHash),
        gt(otpVerificationModel.expiresAt, new Date()) // Not expired
      )
    )
    .orderBy(desc(otpVerificationModel.createdAt))
    .limit(1);

  if (!record) {
    throw BadRequestError("Invalid or expired OTP");
  }

  // Mark as used
  await db
    .update(otpVerificationModel)
    .set({ isUsed: true })
    .where(eq(otpVerificationModel.otpId, record.otpId));

  return true;
};

// 3. Check 30-day window (For Checkout)
export const hasRecentMonthlyVerification = async (userId: number) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentVerification] = await db
    .select()
    .from(otpVerificationModel)
    .where(
      and(
        eq(otpVerificationModel.userId, userId),
        eq(otpVerificationModel.purpose, "monthly"),
        eq(otpVerificationModel.isUsed, true),
        gt(otpVerificationModel.createdAt, thirtyDaysAgo) // Created within last 30 days
      )
    )
    .limit(1);

  return !!recentVerification;
};