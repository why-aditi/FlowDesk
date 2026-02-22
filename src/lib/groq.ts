import Groq from "groq-sdk";

const GROQ_MODEL = "openai/gpt-oss-120b";

const apiKey = process.env.GROQ_API_KEY;
if (typeof apiKey !== "string" || apiKey.trim() === "") {
  throw new Error("GROQ_API_KEY is not set");
}
const client = new Groq({ apiKey });

/**
 * Calls Groq with a system prompt and user input, returns parsed JSON.
 * Uses model openai/gpt-oss-120b with JSON response format.
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
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      temperature: 1,
      max_completion_tokens: 8192,
      top_p: 1,
      reasoning_effort: "medium",
      response_format: { type: "json_object" },
    });

    text = completion.choices[0]?.message?.content || "";
    
    if (!text) {
      throw new Error("Groq returned empty response");
    }
  } catch (err) {
    throw new Error(
      `Groq API error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Groq returned invalid JSON: ${err.message}`);
    }
    throw err;
  }

  if (validator) {
    try {
      return validator(parsed);
    } catch (err) {
      throw new Error(
        `Groq response validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return parsed as T;
}
