'use server';

/**
 * @fileOverview Generates actionable insights for admins and managers based on commission payouts, team performance, and hierarchical position.
 *
 * - generateActionableInsights - A function that generates actionable insights.
 * - ActionableInsightsInput - The input type for the generateActionableInsights function.
 * - ActionableInsightsOutput - The return type for the generateActionableInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ActionableInsightsInputSchema = z.object({
  hierarchicalPosition: z
    .string()
    .describe("The user's hierarchical position (e.g., Salesman, Team Operation Manager, Admin)."),
  commissionsDue: z.number().describe('Total amount of commissions due to team members.'),
  recentTeamSalesActivities: z
    .string()
    .describe('Summary of recent sales activities within the team.'),
});
export type ActionableInsightsInput = z.infer<typeof ActionableInsightsInputSchema>;

const ActionableInsightsOutputSchema = z.object({
  insights: z.array(
    z.string().describe('An actionable insight or suggestion for the user.')
  ),
});
export type ActionableInsightsOutput = z.infer<typeof ActionableInsightsOutputSchema>;

export async function generateActionableInsights(
  input: ActionableInsightsInput
): Promise<ActionableInsightsOutput> {
  return actionableInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'actionableInsightsPrompt',
  input: {schema: ActionableInsightsInputSchema},
  output: {schema: ActionableInsightsOutputSchema},
  prompt: `You are an AI assistant providing actionable insights to users based on their hierarchical position, commissions due, and recent team sales activities.

  Hierarchical Position: {{{hierarchicalPosition}}}
  Commissions Due: LKR {{{commissionsDue}}} LKR
  Recent Team Sales Activities: {{{recentTeamSalesActivities}}}

  Based on this information, suggest actions the user should take to improve team performance, address overdue commission payouts, or capitalize on recent successes.

  Format your response as a list of actionable insights.
  `,
});

const actionableInsightsFlow = ai.defineFlow(
  {
    name: 'actionableInsightsFlow',
    inputSchema: ActionableInsightsInputSchema,
    outputSchema: ActionableInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
