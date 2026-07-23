"use client";

import { useState } from "react";
import Image from "next/image";
import PhotoLightbox from "./PhotoLightbox";
import type { ReviewRow } from "@/lib/types";

type Props = {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
};

function borderColorFor(row: ReviewRow): string {
  if (row.matchConfidence === "low") return "border-red-400";
  if (row.matchConfidence === "medium") return "border-amber-400";
  if (row.matchConfidence === "high") return "border-teal-400";
  if (row.confidence === "low") return "border-amber-400";
  return "border-slate-100";
}

export default function ExtractionReviewList({ rows, onChange }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  function updateRow(localId: string, patch: Partial<ReviewRow>) {
    onChange(
      rows.map((r) => {
        if (r.localId !== localId) return r;
        // Editing the name by hand invalidates any earlier registry match.
        const clearsMatch = "name" in patch && patch.name !== r.name;
        // Editing the quantity by hand means it's no longer "the suggestion".
        const clearsSuggestion = "quantity" in patch && patch.quantity !== r.quantity;
        return {
          ...r,
          ...patch,
          matchConfidence: clearsMatch ? null : r.matchConfidence,
          drugReferenceId: clearsMatch ? null : r.drugReferenceId,
          quantitySuggested: clearsSuggestion ? false : r.quantitySuggested,
        };
      })
    );
  }

  function removeRow(localId: string) {
    onChange(rows.filter((r) => r.localId !== localId));
  }

  function addRow() {
    onChange([
      ...rows,
      {
        localId: crypto.randomUUID(),
        name: "",
        dosage: null,
        timing: null,
        quantity: null,
        confidence: null,
        matchConfidence: null,
        photoUrl: null,
        pillsPerDay: null,
        quantitySuggested: false,
        drugReferenceId: null,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div
          key={row.localId}
          className={`rounded-2xl bg-white p-4 border shadow-sm flex flex-col gap-2 ${borderColorFor(row)}`}
        >
          {row.confidence === "low" && (
            <p className="text-amber-600 text-sm">⚠️ تأكد من هذا الدواء، الصورة لم تكن واضحة</p>
          )}
          {row.matchConfidence === "high" && (
            <p className="text-teal-700 text-sm">✓ مطابقة شبه مؤكدة مع قاعدة بيانات الأدوية</p>
          )}
          {row.matchConfidence === "medium" && (
            <p className="text-amber-600 text-sm">
              ⚠️ مطابقة محتملة لكن غير مؤكدة -- راجع الاسم قبل الحفظ
            </p>
          )}
          {row.matchConfidence === "low" && (
            <p className="text-red-600 text-sm">
              ❗ غير متأكدين من صحة هذه المطابقة -- تأكد من الاسم جيدًا
            </p>
          )}

          {row.photoUrl && (
            <div className="flex items-center gap-3">
              <button onClick={() => setLightboxUrl(row.photoUrl)} className="shrink-0">
                <Image
                  src={row.photoUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                  unoptimized
                />
              </button>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">صورة تلقائية من قاعدة البيانات</span>
                <button
                  className="text-red-600 text-xs self-start"
                  onClick={() => updateRow(row.localId, { photoUrl: null })}
                >
                  إزالة الصورة
                </button>
              </div>
            </div>
          )}

          <input
            className="input"
            placeholder="اسم الدواء"
            value={row.name}
            onChange={(e) => updateRow(row.localId, { name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="التركيز (مثال: 80 مجم)"
              value={row.dosage ?? ""}
              onChange={(e) => updateRow(row.localId, { dosage: e.target.value })}
            />
            <input
              className="input"
              placeholder="التوقيت"
              value={row.timing ?? ""}
              onChange={(e) => updateRow(row.localId, { timing: e.target.value })}
            />
          </div>
          {row.quantitySuggested && (
            <p className="text-teal-700 text-sm">
              🔢 مقترح بناءً على الجرعة اليومية -- تأكد منه قبل الحفظ
            </p>
          )}
          <input
            className="input"
            placeholder="الكمية (مثال: علبة واحدة)"
            value={row.quantity ?? ""}
            onChange={(e) => updateRow(row.localId, { quantity: e.target.value })}
          />
          <button
            className="text-red-600 text-sm self-start"
            onClick={() => removeRow(row.localId)}
          >
            حذف هذا الدواء
          </button>
        </div>
      ))}

      <button className="btn-secondary" onClick={addRow}>
        + إضافة دواء آخر
      </button>

      {lightboxUrl && (
        <PhotoLightbox src={lightboxUrl} alt="" onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}
