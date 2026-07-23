"use client";

import { useState } from "react";
import Image from "next/image";
import { compressImageFile } from "@/lib/image";
import { insertMedicine, updateMedicine, deactivateMedicine, uploadDrugPhoto } from "@/lib/medicines";
import type { Medicine } from "@/lib/types";

type Props = {
  medicine: Medicine | null;
  onClose: () => void;
  onSaved: (medicine: Medicine) => void;
  onDeleted: (id: string) => void;
};

export default function MedicineEditSheet({ medicine, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(medicine?.name ?? "");
  const [dosage, setDosage] = useState(medicine?.dosage ?? "");
  const [timing, setTiming] = useState(medicine?.timing ?? "");
  const [quantity, setQuantity] = useState(medicine?.quantity ?? "");
  const [photoUrl] = useState(medicine?.photo_url ?? null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(medicine?.photo_url ?? null);
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { blob, base64, mimeType } = await compressImageFile(file);
      setPendingPhotoBlob(blob);
      setPhotoPreview(`data:${mimeType};base64,${base64}`);
    } catch {
      setError("تعذر تحميل الصورة");
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("من فضلك اكتب اسم الدواء");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl;
      if (pendingPhotoBlob) {
        finalPhotoUrl = await uploadDrugPhoto(pendingPhotoBlob, "pills");
      }

      const input = {
        name: name.trim(),
        dosage: dosage.trim() || null,
        timing: timing.trim() || null,
        quantity: quantity.trim() || null,
        photo_url: finalPhotoUrl,
        source: medicine?.source ?? "manual",
        scan_id: medicine?.scan_id ?? null,
      };

      const saved = medicine
        ? await updateMedicine(medicine.id, input)
        : await insertMedicine(input);

      onSaved(saved);
      onClose();
    } catch {
      setError("حدث خطأ أثناء الحفظ، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!medicine) return;
    setSaving(true);
    try {
      await deactivateMedicine(medicine.id);
      onDeleted(medicine.id);
      onClose();
    } catch {
      setError("تعذر حذف الدواء");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
        <h2 className="text-xl font-bold mb-4">
          {medicine ? "تعديل الدواء" : "إضافة دواء"}
        </h2>

        <div className="flex flex-col gap-4">
          <Field label="اسم الدواء">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: بانادول"
              autoFocus
            />
          </Field>

          <Field label="الجرعة (اختياري)">
            <input
              className="input"
              value={dosage ?? ""}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="مثال: 500 مجم"
            />
          </Field>

          <Field label="التوقيت (اختياري)">
            <input
              className="input"
              value={timing ?? ""}
              onChange={(e) => setTiming(e.target.value)}
              placeholder="مثال: مرتين يوميًا بعد الأكل"
            />
          </Field>

          <Field label="الكمية">
            <input
              className="input"
              value={quantity ?? ""}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="مثال: علبة واحدة"
            />
          </Field>

          <Field label="صورة الدواء (اختياري)">
            <div className="flex items-center gap-3">
              {photoPreview && (
                <Image
                  src={photoPreview}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-xl object-cover border border-slate-200"
                  unoptimized
                />
              )}
              <label className="btn-secondary cursor-pointer">
                اختر صورة
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          </Field>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex flex-col gap-2 mt-2">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            {medicine && (
              <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                حذف الدواء
              </button>
            )}
            <button className="btn-text" onClick={onClose} disabled={saving}>
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
