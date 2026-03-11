'use server';
/**
 * @fileOverview A Genkit flow that dynamically generates a battle outcome description
 * based on the chosen ninja's elemental power and the enemy's characteristics.
 *
 * - dynamicBattleOutcome - A function that handles the dynamic battle outcome generation.
 * - DynamicBattleOutcomeInput - The input type for the dynamicBattleOutcome function.
 * - DynamicBattleOutcomeOutput - The return type for the dynamicBattleOutcome function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DynamicBattleOutcomeInputSchema = z.object({
  ninjaName: z.string().describe("The name of the chosen Ninja (e.g., Kai, Zane, Nya)."),
  ninjaPower: z.string().describe("The elemental power of the chosen Ninja (e.g., Eld, Is, Vatten)."),
  enemyName: z.string().describe("The name of the enemy encountered (e.g., Skelettarmén, Spökkrigare, The Overlord)."),
  enemyDescription: z.string().describe("A brief description of the enemy's key characteristics or abilities (e.g., 'snabbfotade krigare från Underworld', 'extra sårbara för vatten')."),
});
export type DynamicBattleOutcomeInput = z.infer<typeof DynamicBattleOutcomeInputSchema>;

const DynamicBattleOutcomeOutputSchema = z.object({
  battleDescription: z.string().describe("A dynamic and immersive description of the battle outcome, detailing how the ninja's elemental power affected the enemy."),
});
export type DynamicBattleOutcomeOutput = z.infer<typeof DynamicBattleOutcomeOutputSchema>;

export async function dynamicBattleOutcome(input: DynamicBattleOutcomeInput): Promise<DynamicBattleOutcomeOutput> {
  return dynamicBattleOutcomeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dynamicBattleOutcomePrompt',
  input: {schema: DynamicBattleOutcomeInputSchema},
  output: {schema: DynamicBattleOutcomeOutputSchema},
  prompt: `You are a legendary storyteller from the world of Ninjago. Your task is to narrate a thrilling and immersive battle scene.\n\nA brave ninja named {{{ninjaName}}}, wielding the power of {{{ninjaPower}}}, faces off against the formidable {{{enemyName}}}.\nThe {{{enemyName}}} are known for their {{{enemyDescription}}}.\n\nDescribe the battle in vivid detail, focusing on how {{{ninjaName}}}'s {{{ninjaPower}}} element strategically interacts with the {{{enemyName}}}'s unique traits and abilities ({{{enemyDescription}}}). Even if the elemental power isn't a direct weakness, describe a clever tactic or an overwhelming display of power that ensures {{{ninjaName}}}'s victory. Make the description engaging and heroic.`,
});

const dynamicBattleOutcomeFlow = ai.defineFlow(
  {
    name: 'dynamicBattleOutcomeFlow',
    inputSchema: DynamicBattleOutcomeInputSchema,
    outputSchema: DynamicBattleOutcomeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
