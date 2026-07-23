"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScanUploader from "@/components/ScanUploader";
import ExtractionReviewList from "@/components/ExtractionReviewList";
import { insertMedicine, createScan, uploadDrugPhoto } from "@/lib/medicines";
import type { ExtractResponse, ReviewRow } from "@/lib/types";

export default function ScanPage() {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
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
    setAnalyzing(true);
    setNotice(null);
    setError(null);
    setPendingBlob(data.blob);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: data.base64, mimeType: data.mimeType }),
      });
      const json: ExtractResponse = await res.json();

      if (json.ok && json.items.length > 0) {
        setRows(
          json.items.map((item) => ({
            localId: crypto.randomUUID(),
            name: item.name,
            dosage: item.dosage,
            timing: item.timing,
            quantity: null,
            confidence: item.confidence,
          }))
        );
      } else {
        setRows([]);
        setNotice(
          json.ok
            ? "لم يتم التعرف على أي دواء في الصورة، يمكنك إضافتها يدويًا بالأسفل"
            : json.error
        );
      }
    } catch {
      setRows([]);
      setNotice("تعذرت قراءة الصورة، يمكنك إضافة الأدوية يدويًا بالأسفل");
    } finally {
      setAnalyzing(false);
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
          photo_url: null,
          source: "scan",
          scan_id: scanId,
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

      {rows === null && <ScanUploader analyzing={analyzing} onAnalyze={handleAnalyze} />}

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
