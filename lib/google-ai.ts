import { GoogleGenAI } from "@google/genai";

export const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

let cachedClient: GoogleGenAI | null = null;

export function getGoogleAiClient() {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) throw new Error("GOOGLE_API_KEY_MISSING");

  cachedClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 45_000,
      retryOptions: { attempts: 1 },
    },
  });

  return cachedClient;
}
