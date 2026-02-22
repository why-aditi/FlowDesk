import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from "@google/generative-ai";

const GEMINI_MODEL = "gemini-3-flash-preview";

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const model: GenerativeModel = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    responseMimeType: "application/json",
  },
});

/**
 * Calls Gemini with a system prompt and user input, returns parsed JSON.
 * Uses model gemini-3-flash-preview and responseMimeType: application/json.
 * Catches API/network errors and JSON parse errors; rethrows so callers can handle.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userInput: string
): Promise<T> {
  let text: string;
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userInput }] }],
      systemInstruction: systemPrompt,
    });
    text = result.response.text();
  } catch (err) {
    throw new Error(
      `Gemini API error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Gemini returned invalid JSON: ${err.message}`);
    }
    throw err;
  }
}
