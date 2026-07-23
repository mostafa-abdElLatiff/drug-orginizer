import "server-only";
import {
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromBase64,
} from "@google/genai";
import type { DrugCandidate, ExtractedItem, ReconciledItem } from "./types";
import { computeMonthlySupplyText } from "./supply";

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
إذا استطعت تحديد عدد مرات تناول الدواء يوميًا كرقم واضح من نص التوقيت (مثال: "مرتين يوميا" = 2،
"قرص كل ٨ ساعات" = 3، "٣ مرات في اليوم" = 3)، ضع هذا الرقم في pillsPerDay، وإلا اتركه null دون تخمين.
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
      pillsPerDay: { type: Type.INTEGER, nullable: true },
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
        pillsPerDay:
          typeof item.pillsPerDay === "number" && item.pillsPerDay > 0
            ? Math.round(item.pillsPerDay)
            : null,
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
      matchConfidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    },
    required: ["index", "correctedName", "matchConfidence"],
  },
};

const RECONCILE_INSTRUCTIONS = `فيما يلي أسماء أدوية قرأها نظام تحليل صور من روشتة طبية بخط اليد،
مع قائمة مرشحين محتملين من قاعدة بيانات الأدوية المصرية الرسمية (name_en) لكل اسم، مرتبين حسب درجة التشابه (score).

لكل عنصر:
- إذا كانت قائمة المرشحين لهذا العنصر غير فارغة، اختر دائمًا الاسم الأقرب دلاليًا من هذه القائمة كـ correctedName
  (مع مراعاة الجرعة المذكورة إن وجدت أكثر من مرشح بنفس الاسم بجرعات مختلفة)، حتى لو لم يكن التطابق مؤكدًا تمامًا.
  لا تُرجع الاسم الأصلي إذا كانت هناك مرشحين متاحين.
- إذا كانت قائمة المرشحين فارغة تمامًا، أرجع الاسم الأصلي كما قرأه نظام التحليل كـ correctedName.
- لا تخترع اسمًا جديدًا أبدًا -- استخدم فقط الاسم الأصلي أو أحد أسماء المرشحين المعطاة بالضبط.
- حدد matchConfidence بصدق:
  "high" إذا كنت شبه متأكد تمامًا أن هذا هو نفس الدواء بالضبط،
  "medium" إذا كان الاختيار محتملاً ومعقولاً لكن غير مؤكد بالكامل،
  "low" إذا كنت غير متأكد فعليًا من صحة المطابقة (أو لم توجد مرشحين أصلاً).
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
  const decisionByIndex = new Map<
    number,
    { correctedName: string; matchConfidence: "high" | "medium" | "low" }
  >();

  if (Array.isArray(decisions)) {
    for (const d of decisions) {
      if (d && typeof d.index === "number") {
        decisionByIndex.set(d.index, {
          correctedName: String(d.correctedName ?? "").trim(),
          matchConfidence: d.matchConfidence === "high" || d.matchConfidence === "medium"
            ? d.matchConfidence
            : "low",
        });
      }
    }
  }

  return items.map((item, index) => {
    const decision = decisionByIndex.get(index);
    const hasCandidates = (candidatesByIndex[index]?.length ?? 0) > 0;
    // No candidates at all means nothing was actually matched -- force "low"
    // regardless of what the model said, since there's nothing to compare to.
    const matchConfidence: "high" | "medium" | "low" | null = hasCandidates
      ? decision?.matchConfidence ?? "low"
      : null;

    const chosenCandidate = hasCandidates
      ? candidatesByIndex[index]?.find((c) => c.name_en === decision?.correctedName)
      : undefined;

    return {
      ...item,
      name: decision?.correctedName || item.name,
      matchConfidence,
      photoUrl: chosenCandidate?.image_url ?? null,
      suggestedQuantity: computeMonthlySupplyText(
        item.pillsPerDay,
        chosenCandidate?.pills_per_strip ?? null,
        chosenCandidate?.strips_per_box ?? null
      ),
    };
  });
}
