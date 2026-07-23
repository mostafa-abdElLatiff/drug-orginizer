import "server-only";
import {
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromBase64,
} from "@google/genai";
import type { ExtractedItem } from "./types";

const PROMPT = `هذه صورة لروشتة طبية (وصفة طبية) قد تكون مكتوبة بخط اليد أو مطبوعة.
استخرج كل دواء مذكور في الصورة كعنصر منفصل في القائمة.
اكتب اسم الدواء كما هو مكتوب بالضبط دون ترجمة أو تصحيح، حتى لو كان مزيجًا من العربية والحروف اللاتينية.
املأ الجرعة (dosage) والتوقيت (timing) فقط إذا كانا واضحين ومقروءين بثقة، وإلا اتركهما null.
إذا كان اسم الدواء أو تفاصيله صعبة القراءة، اجعل confidence تساوي "low"، وإلا اجعلها "high".
أرجع مصفوفة فارغة إذا لم تستطع تمييز أي دواء في الصورة.`;

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      dosage: { type: Type.STRING, nullable: true },
      timing: { type: Type.STRING, nullable: true },
      confidence: { type: Type.STRING, enum: ["high", "low"] },
    },
    required: ["name", "confidence"],
  },
};

export async function extractMedicinesFromImage(
  base64Data: string,
  mimeType: string
): Promise<ExtractedItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY env var");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      PROMPT,
      createPartFromBase64(base64Data, mimeType),
    ]),
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    return [];
  }

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(
      (item): ExtractedItem => ({
        name: String(item.name ?? "").trim(),
        dosage: item.dosage ? String(item.dosage) : null,
        timing: item.timing ? String(item.timing) : null,
        confidence: item.confidence === "low" ? "low" : "high",
      })
    )
    .filter((item) => item.name.length > 0);
}
