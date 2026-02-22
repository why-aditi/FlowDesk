import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from "@google/generative-ai";

const GEMINI_MODEL = "gemini-3-flash-preview";

const apiKey = process.env.GEMINI_API_KEY;
if (typeof apiKey !== "string" || apiKey.trim() === "") {
  throw new Error("GEMINI_API_KEY is not set");
}
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
 *
 * @param validator - Optional runtime validator (e.g. Zod schema with .parse(), or
 *   a function (parsed: unknown) => T that throws on invalid). If provided,
 *   the parsed JSON is validated before return; validation errors are rethrown
 *   with a descriptive message. If omitted, the return type is only a static
 *   cast with no runtime guarantee.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userInput: string,
  validator?: (parsed: unknown) => T
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Gemini returned invalid JSON: ${err.message}`);
    }
    throw err;
  }

  if (validator) {
    try {
      return validator(parsed);
    } catch (err) {
      throw new Error(
        `Gemini response validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return parsed as T;
}
