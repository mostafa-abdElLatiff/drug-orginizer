import { NextRequest, NextResponse } from "next/server";
import { reconcileMedicineNames } from "@/lib/gemini";
import type { DrugCandidate, ExtractedItem, ReconcileResponse } from "@/lib/types";

export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse<ReconcileResponse>> {
  try {
    const body = await request.json();
    const items = body?.items as ExtractedItem[] | undefined;
    const candidatesByIndex = body?.candidatesByIndex as DrugCandidate[][] | undefined;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: "لا توجد عناصر للمراجعة" }, { status: 400 });
    }

    const reconciled = await reconcileMedicineNames(items, candidatesByIndex ?? []);

    return NextResponse.json({ ok: true, items: reconciled });
  } catch (error) {
    console.error("reconcile error", error);
    return NextResponse.json(
      { ok: false, error: "تعذرت مراجعة أسماء الأدوية" },
      { status: 500 }
    );
  }
}
