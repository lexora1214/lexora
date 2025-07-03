"use server";

import { generateActionableInsights, ActionableInsightsInput, ActionableInsightsOutput } from "@/ai/flows/actionable-insights";

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
