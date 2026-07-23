"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScanUploader from "@/components/ScanUploader";
import ExtractionReviewList from "@/components/ExtractionReviewList";
import { insertMedicine, createScan, uploadDrugPhoto } from "@/lib/medicines";
import type {
  DrugCandidate,
  ExtractedItem,
  ExtractResponse,
  MatchConfidence,
  MatchNamesResponse,
  ReconcileResponse,
  ReviewRow,
} from "@/lib/types";

type Stage = "extracting" | "matching" | "reconciling" | null;

const STAGE_LABEL: Record<Exclude<Stage, null>, string> = {
  extracting: "جارٍ تحليل الصورة...",
  matching: "جارٍ التحقق من قاعدة بيانات الأدوية...",
  reconciling: "جارٍ المراجعة النهائية...",
};

function toRows(
  items: (ExtractedItem & {
    matchConfidence?: MatchConfidence;
    photoUrl?: string | null;
    suggestedQuantity?: string | null;
  })[]
): ReviewRow[] {
  return items.map((item) => ({
    localId: crypto.randomUUID(),
    name: item.name,
    dosage: item.dosage,
    timing: item.timing,
    quantity: item.suggestedQuantity ?? null,
    confidence: item.confidence,
    matchConfidence: item.matchConfidence ?? null,
    photoUrl: item.photoUrl ?? null,
    pillsPerDay: item.pillsPerDay,
    quantitySuggested: !!item.suggestedQuantity,
  }));
}

export default function ScanPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(null);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(data: {
    base64: string;
    mimeType: string;
    blob: Blob;
    previewUrl: string;
  }) {
    setStage("extracting");
    setNotice(null);
    setError(null);
    setPendingBlob(data.blob);

    let items: ExtractedItem[] = [];
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: data.base64, mimeType: data.mimeType }),
      });
      const json: ExtractResponse = await res.json();

      if (json.ok && json.items.length > 0) {
        items = json.items;
      } else {
        setRows([]);
        setNotice(
          json.ok
            ? "لم يتم التعرف على أي دواء في الصورة، يمكنك إضافتها يدويًا بالأسفل"
            : json.error
        );
        setStage(null);
        return;
      }
    } catch {
      setRows([]);
      setNotice("تعذرت قراءة الصورة، يمكنك إضافة الأدوية يدويًا بالأسفل");
      setStage(null);
      return;
    }

    // From here on, every step is a best-effort improvement -- any failure
    // just falls back to showing the raw extraction, never a dead end.
    let candidatesByIndex: DrugCandidate[][] = items.map(() => []);
    try {
      setStage("matching");
      const res = await fetch("/api/match-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: items.map((i) => i.name) }),
      });
      const json: MatchNamesResponse = await res.json();
      if (json.ok) {
        candidatesByIndex = json.results.map((r) => r.candidates);
      }
    } catch {
      // Ignore -- proceed with empty candidates, reconcile step will no-op.
    }

    try {
      setStage("reconciling");
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, candidatesByIndex }),
      });
      const json: ReconcileResponse = await res.json();
      if (json.ok) {
        setRows(toRows(json.items));
      } else {
        setRows(toRows(items));
      }
    } catch {
      setRows(toRows(items));
    } finally {
      setStage(null);
    }
  }

  async function handleSaveAll() {
    if (!rows) return;
    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      setError("أضف دواء واحدًا على الأقل قبل الحفظ");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let imageUrl: string | null = null;
      if (pendingBlob) {
        imageUrl = await uploadDrugPhoto(pendingBlob, "prescriptions");
      }
      const scanId = await createScan(imageUrl, validRows);

      for (const row of validRows) {
        await insertMedicine({
          name: row.name.trim(),
          dosage: row.dosage?.trim() || null,
          timing: row.timing?.trim() || null,
          quantity: row.quantity?.trim() || null,
          photo_url: row.photoUrl,
          source: "scan",
          scan_id: scanId,
          pills_per_day: row.pillsPerDay,
        });
      }

      router.push("/");
    } catch {
      setError("حدث خطأ أثناء الحفظ، حاول مرة أخرى");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-teal-700 text-lg">
          ‹ رجوع
        </Link>
        <h1 className="text-xl font-bold">إضافة من صورة روشتة</h1>
      </div>

      {rows === null && (
        <ScanUploader analyzing={stage !== null} onAnalyze={handleAnalyze} />
      )}

      {stage !== null && (
        <p className="text-slate-500 text-center mt-4">{STAGE_LABEL[stage]}</p>
      )}

      {rows !== null && (
        <div className="flex flex-col gap-4">
          {notice && (
            <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              {notice}
            </p>
          )}
          <ExtractionReviewList rows={rows} onChange={setRows} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary" onClick={handleSaveAll} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ في القائمة"}
          </button>
        </div>
      )}
    </div>
  );
}
