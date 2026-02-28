import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
