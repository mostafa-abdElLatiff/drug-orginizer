import "server-only";
import {
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromBase64,
} from "@google/genai";
import type { DrugCandidate, ExtractedItem, ReconciledItem } from "./types";

const MODEL = "gemini-flash-latest";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY env var");
  }
  return new GoogleGenAI({ apiKey });
}

const EXTRACT_PROMPT = `هذه صورة لروشتة طبية (وصفة طبية) قد تكون مكتوبة بخط اليد أو مطبوعة.
استخرج كل دواء مذكور في الصورة كعنصر منفصل في القائمة.
اكتب اسم الدواء كما هو مكتوب بالضبط دون ترجمة أو تصحيح، حتى لو كان مزيجًا من العربية والحروف اللاتينية.
املأ الجرعة (dosage) والتوقيت (timing) فقط إذا كانا واضحين ومقروءين بثقة، وإلا اتركهما null.
إذا كان اسم الدواء أو تفاصيله صعبة القراءة، اجعل confidence تساوي "low"، وإلا اجعلها "high".
أرجع مصفوفة فارغة إذا لم تستطع تمييز أي دواء في الصورة.`;

const EXTRACT_SCHEMA = {
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
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([
      EXTRACT_PROMPT,
      createPartFromBase64(base64Data, mimeType),
    ]),
    config: {
      responseMimeType: "application/json",
      responseSchema: EXTRACT_SCHEMA,
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

const RECONCILE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      correctedName: { type: Type.STRING },
      matchedReference: { type: Type.BOOLEAN },
    },
    required: ["index", "correctedName", "matchedReference"],
  },
};

const RECONCILE_INSTRUCTIONS = `فيما يلي أسماء أدوية قرأها نظام تحليل صور من روشتة طبية بخط اليد،
مع قائمة مرشحين محتملين من قاعدة بيانات الأدوية المصرية الرسمية (name_en) لكل اسم، مرتبين حسب درجة التشابه (score).

لكل عنصر:
- إذا كان أحد المرشحين هو نفس الدواء بوضوح (نفس الاسم لكن مقروء بشكل مختلف قليلاً)، أرجع اسمه بالضبط كما هو
  في name_en كـ correctedName، واجعل matchedReference صحيح (true).
- إذا لم يكن أي من المرشحين مطابقًا فعليًا (كل الدرجات منخفضة، أو الدواء عام مثل فيتامين غير مسجل بهذا الاسم بالضبط)،
  أرجع الاسم الأصلي كما قرأه نظام التحليل كـ correctedName، واجعل matchedReference خطأ (false).
- لا تخترع اسمًا جديدًا أبدًا -- استخدم فقط الاسم الأصلي أو أحد أسماء المرشحين المعطاة بالضبط.
- أرجع عنصرًا واحدًا بالضبط لكل index المعطى، بنفس الترتيب.

البيانات:
`;

export async function reconcileMedicineNames(
  items: ExtractedItem[],
  candidatesByIndex: DrugCandidate[][]
): Promise<ReconciledItem[]> {
  const ai = getClient();

  const payload = items.map((item, index) => ({
    index,
    extractedName: item.name,
    candidates: candidatesByIndex[index] ?? [],
  }));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: RECONCILE_INSTRUCTIONS + JSON.stringify(payload),
    config: {
      responseMimeType: "application/json",
      responseSchema: RECONCILE_SCHEMA,
    },
  });

  const text = response.text;
  const decisions = text ? JSON.parse(text) : [];
  const decisionByIndex = new Map<number, { correctedName: string; matchedReference: boolean }>();

  if (Array.isArray(decisions)) {
    for (const d of decisions) {
      if (d && typeof d.index === "number") {
        decisionByIndex.set(d.index, {
          correctedName: String(d.correctedName ?? "").trim(),
          matchedReference: !!d.matchedReference,
        });
      }
    }
  }

  return items.map((item, index) => {
    const decision = decisionByIndex.get(index);
    const matchedReference = decision?.matchedReference ?? false;

    // Gemini only picks the name -- look up the chosen candidate ourselves
    // to attach whatever curated photo (if any) is on that reference row.
    const chosenCandidate = matchedReference
      ? candidatesByIndex[index]?.find((c) => c.name_en === decision?.correctedName)
      : undefined;

    return {
      ...item,
      name: decision?.correctedName || item.name,
      matchedReference,
      photoUrl: chosenCandidate?.image_url ?? null,
    };
  });
}
