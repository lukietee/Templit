import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
export const SORA_MODEL = "sora-2";
