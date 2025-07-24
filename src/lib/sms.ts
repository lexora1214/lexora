
'use server';

import { format } from 'date-fns';

interface TokenSmsDetails {
    customerName: string;
    customerContact: string;
    tokenSerial: string;
    downPayment?: number | null;
    salesmanName: string;
    saleDate: string;
}

/**
 * Formats a Sri Lankan mobile number to the 94XXXXXXXXX format required by notify.lk.
 * @param mobileNumber The mobile number, e.g., "0712345678".
 * @returns The formatted number, e.g., "94712345678".
 */
function formatMobileNumber(mobileNumber: string): string | null {
    if (mobileNumber.startsWith("0") && mobileNumber.length === 10) {
        return `94${mobileNumber.substring(1)}`;
    }
    if (mobileNumber.startsWith("94") && mobileNumber.length === 11) {
        return mobileNumber;
    }
    // Return null if the format is invalid
    return null;
}

export async function sendTokenSms(details: TokenSmsDetails): Promise<void> {
    const userId = process.env.NOTIFY_USER_ID;
    const apiKey = process.env.NOTIFY_API_KEY;
    const senderId = process.env.NOTIFY_SENDER_ID;

    if (!userId || !apiKey || !senderId) {
        console.error("SMS credentials are not configured in .env file. Skipping SMS.");
        return;
    }

    const formattedNumber = formatMobileNumber(details.customerContact);
    if (!formattedNumber) {
        console.error(`Invalid phone number format: ${details.customerContact}. Cannot send SMS.`);
        return;
    }

    const saleDateTime = format(new Date(details.saleDate), "yyyy-MM-dd HH:mm");
    const downPaymentText = details.downPayment ? `Your down payment of LKR ${details.downPayment.toLocaleString()} has been received.` : "Your registration is confirmed.";

    const message = `Dear ${details.customerName}, Welcome to LEXORA! Your token no is ${details.tokenSerial}. ${downPaymentText} Date: ${saleDateTime}. Salesman: ${details.salesmanName}.`;

    const url = new URL("https://app.notify.lk/api/v1/send");
    url.searchParams.append("user_id", userId);
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("sender_id", senderId);
    url.searchParams.append("to", formattedNumber);
    url.searchParams.append("message", message);

    try {
        const response = await fetch(url.toString(), { method: 'GET' });
        const result = await response.json();
        
        if (result.status !== 'success') {
            console.error("Failed to send SMS via notify.lk:", result);
        } else {
            console.log("Successfully sent registration SMS to:", formattedNumber);
        }
    } catch (error) {
        console.error("Error sending SMS:", error);
    }
}

export async function sendOtpSms(mobileNumber: string, otp: string): Promise<void> {
    const userId = process.env.NOTIFY_USER_ID;
    const apiKey = process.env.NOTIFY_API_KEY;
    const senderId = process.env.NOTIFY_SENDER_ID;

    if (!userId || !apiKey || !senderId) {
        throw new Error("SMS credentials are not configured in .env file.");
    }

    const formattedNumber = formatMobileNumber(mobileNumber);
    if (!formattedNumber) {
        throw new Error(`Invalid phone number format: ${mobileNumber}.`);
    }

    const message = `Your LEXORA verification code is: ${otp}`;
    const url = new URL("https://app.notify.lk/api/v1/send");
    url.searchParams.append("user_id", userId);
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("sender_id", senderId);
    url.searchParams.append("to", formattedNumber);
    url.searchParams.append("message", message);
    
    try {
        const response = await fetch(url.toString(), { method: 'GET' });
        const result = await response.json();
        
        if (result.status !== 'success') {
            console.error("Failed to send OTP SMS via notify.lk:", result);
            throw new Error(`SMS provider error: ${result.data || 'Unknown error'}`);
        } else {
            console.log("Successfully sent OTP SMS to:", formattedNumber);
        }
    } catch (error) {
        console.error("Error sending OTP SMS:", error);
        throw new Error("An external error occurred while sending the OTP.");
    }
}
