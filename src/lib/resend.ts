import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (typeof apiKey !== "string" || apiKey.trim() === "") {
  throw new Error("RESEND_API_KEY is not set");
}

export const resend = new Resend(apiKey);
