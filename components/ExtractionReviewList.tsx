"use client";

import type { ReviewRow } from "@/lib/types";

type Props = {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
};

export default function ExtractionReviewList({ rows, onChange }: Props) {
  function updateRow(localId: string, patch: Partial<ReviewRow>) {
    onChange(rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
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
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div
          key={row.localId}
          className={`rounded-2xl bg-white p-4 border shadow-sm flex flex-col gap-2 ${
            row.confidence === "low" ? "border-amber-400" : "border-slate-100"
          }`}
        >
          {row.confidence === "low" && (
            <p className="text-amber-600 text-sm">⚠️ تأكد من هذا الدواء، الصورة لم تكن واضحة</p>
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
              placeholder="الجرعة"
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
    </div>
  );
}
