

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { ConversationTurn } from "./state";

/**
 * Checks the user's latest input to see if they are correcting the agent's behavior.
 * If a correction is detected, it generates an updated system prompt.
 * 
 * @param apiKey - The Gemini API Key
 * @param currentSystemPrompt - The current system prompt being used
 * @param latestUserText - The most recent text spoken by the user
 * @param recentTurns - Context of the conversation (last few turns)
 * @returns Object containing detection status and potential new prompt
 */
export async function checkCorrection(
  apiKey: string,
  currentSystemPrompt: string,
  latestUserText: string,
  recentTurns: ConversationTurn[]
): Promise<{
  detected: boolean;
  summary?: string;
  newSystemPrompt?: string;
}> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Format history for context (last 6 turns usually enough)
    const context = recentTurns
      .slice(-6)
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n');

    const prompt = `
      You are a Supervisor AI monitoring a conversation between a User and an Agent.
      
      Current System Prompt of the Agent:
      """
      ${currentSystemPrompt}
      """

      Recent Conversation Log:
      """
      ${context}
      """

      The User just said: "${latestUserText}"

      TASK:
      1. Analyze if the User is giving feedback about the Agent's:
         - Tone (too excited, too robotic, too slow)
         - Phrasing (stop saying "I understand", stop apologizing)
         - Greetings (don't say "How can I help you")
         - Imperfections (be more natural, remove fake stutters)
      
      2. If it is NOT a correction (just normal conversation about real estate/tasks), return detected: false.

      3. If it IS a correction:
         - Summarize the fix.
         - REWRITE the System Prompt to enforce this rule.
         - Remove conflicting instructions (e.g., if user says "stop stuttering", remove stuttering instructions).
         - Add explicit "ABSOLUTE BANS" for the behavior the user dislikes.

      Output JSON format:
      {
        "detected": boolean,
        "summary": "Short description of the correction",
        "new_system_prompt": "The full rewritten system prompt text"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            summary: { type: Type.STRING },
            new_system_prompt: { type: Type.STRING },
          },
          required: ['detected']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    if (result.detected) {
      console.log(`[Supervisor] Correction Detected: ${result.summary}`);
    } else {
      console.log(`[Supervisor] No correction detected.`);
    }

    return {
      detected: result.detected,
      summary: result.summary,
      newSystemPrompt: result.new_system_prompt
    };

  } catch (error) {
    console.error("Supervisor check failed:", error);
    return { detected: false };
  }
}
