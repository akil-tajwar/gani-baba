import crypto from "crypto";

export const generateOtp = (): string => {
  // Generates a 6-digit string, e.g., "482910"
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashOtp = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const sendSms = async (phone: string, message: string) => {
  // MOCK IMPLEMENTATION FOR FREE DEVELOPMENT
  console.log("=========================================");
  console.log(`🚀 FAKE SMS TO: ${phone}`);
  console.log(`💬 MESSAGE: ${message}`);
  console.log("=========================================");
  
  // Later, replace this with your actual API call (e.g., SSL Wireless, Twilio)
  // await axios.post("https://api.smsprovider.com/send", { ... })
};