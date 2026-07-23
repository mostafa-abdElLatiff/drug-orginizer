import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { DrugCandidate, MatchNamesResponse } from "@/lib/types";

export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse<MatchNamesResponse>> {
  try {
    const body = await request.json();
    const names = body?.names as string[] | undefined;

    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ ok: false, error: "لا توجد أسماء للتحقق منها" }, { status: 400 });
    }

    const supabase = getSupabase();

    const results = await Promise.all(
      names.map(async (name) => {
        const { data, error } = await supabase.rpc("match_drug_name", {
          query: name,
          match_count: 5,
        });
        return { name, candidates: error ? [] : ((data ?? []) as DrugCandidate[]) };
      })
    );

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("match-names error", error);
    return NextResponse.json(
      { ok: false, error: "تعذر التحقق من قاعدة بيانات الأدوية" },
      { status: 500 }
    );
  }
}
