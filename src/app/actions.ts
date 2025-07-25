
"use server";

import { generateActionableInsights, ActionableInsightsInput, ActionableInsightsOutput } from "@/ai/flows/actionable-insights";
import { updateUserPassword, sendOtpSms } from "@/lib/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

export async function getActionableInsights(
  input: ActionableInsightsInput
): Promise<{ success: true; data: ActionableInsightsOutput } | { success: false; error: string }> {
  try {
    const insights = await generateActionableInsights(input);
    return { success: true, data: insights };
  } catch (error) {
    console.error("Error generating actionable insights:", error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred." };
  }
}

export async function changePassword(
  newPassword: string
): Promise<{ success: true; otp: string } | { success: false; error: string }> {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user || !user.phoneNumber) {
        return { success: false, error: "User not authenticated or has no phone number."};
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const smsSent = await sendOtpSms(user.phoneNumber, otp);

    if (!smsSent.success) {
        return { success: false, error: smsSent.error || "Failed to send OTP." };
    }
    
    return { success: true, otp: otp };
  } catch (error: any) {
    console.error("Error initiating password change:", error);
    return { success: false, error: error.message || "An unknown error occurred." };
  }
}
