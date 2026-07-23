import { NextRequest, NextResponse } from "next/server";
import { extractMedicinesFromImage } from "@/lib/gemini";
import type { ExtractResponse } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse<ExtractResponse>> {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { ok: false, error: "الصورة مفقودة" },
        { status: 400 }
      );
    }

    const items = await extractMedicinesFromImage(imageBase64, mimeType);

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("extract error", error);
    return NextResponse.json(
      { ok: false, error: "تعذرت قراءة الصورة، يمكنك إضافة الأدوية يدويًا" },
      { status: 500 }
    );
  }
}
