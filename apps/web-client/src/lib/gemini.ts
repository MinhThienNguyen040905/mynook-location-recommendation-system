import { GoogleGenAI } from '@google/genai';

// NOTE: NEXT_PUBLIC_ prefix exposes this key to the browser.
// For production, move this call to a Next.js Route Handler (src/app/api/ai/route.ts)
// so the API key stays server-side only.
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function getNookRecommendation(mood: string, activity: string) {
  const prompt = `I am looking for a "nook" (a cozy study spot or cafe).
  My current mood is: ${mood}.
  I plan to do: ${activity}.

  Please suggest 3 types of environments that would suit me.
  For each, provide:
  1. A catchy name for this type of nook.
  2. Why it fits my mood and activity.
  3. What specific features I should look for (e.g. "dim lighting", "window seat").

  Format the response as a JSON array of objects with keys: "name", "reason", "features".`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    return JSON.parse(response.text ?? '[]');
  } catch (error) {
    console.error('Gemini Error:', error);
    return null;
  }
}
