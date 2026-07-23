"use client";

import { useState } from "react";
import Image from "next/image";
import { compressImageFile } from "@/lib/image";
import { uploadDrugPhoto } from "@/lib/medicines";

type Props = {
  initialImageUrl?: string | null;
  initialPillsPerStrip?: number | null;
  initialStripsPerBox?: number | null;
  saveLabel: string;
  onSave: (values: {
    imageUrl: string | null;
    pillsPerStrip: number | null;
    stripsPerBox: number | null;
  }) => Promise<boolean>;
  onSaved: () => void;
};

export default function DrugReferenceForm({
  initialImageUrl,
  initialPillsPerStrip,
  initialStripsPerBox,
  saveLabel,
  onSave,
  onSaved,
}: Props) {
  const [imageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImageUrl ?? null);
  const [pillsPerStrip, setPillsPerStrip] = useState(
    initialPillsPerStrip ? String(initialPillsPerStrip) : ""
  );
  const [stripsPerBox, setStripsPerBox] = useState(
    initialStripsPerBox ? String(initialStripsPerBox) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { blob, base64, mimeType } = await compressImageFile(file);
      setPendingBlob(blob);
      setPreview(`data:${mimeType};base64,${base64}`);
    } catch {
      setError("تعذر تحميل الصورة");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let finalImageUrl = imageUrl;
      if (pendingBlob) {
        finalImageUrl = await uploadDrugPhoto(pendingBlob, "reference");
      }

      const ok = await onSave({
        imageUrl: finalImageUrl,
        pillsPerStrip: pillsPerStrip.trim() ? parseInt(pillsPerStrip, 10) : null,
        stripsPerBox: stripsPerBox.trim() ? parseInt(stripsPerBox, 10) : null,
      });

      if (ok) {
        onSaved();
      } else {
        setError("تعذر الحفظ، حاول مرة أخرى");
      }
    } catch {
      setError("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200 mt-2">
      <div className="flex items-center gap-3">
        {preview && (
          <Image
            src={preview}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg object-cover border border-slate-200"
            unoptimized
          />
        )}
        <label className="btn-secondary cursor-pointer text-sm">
          {imageUrl || preview ? "تغيير الصورة" : "اختر صورة"}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">عدد الأقراص في الشريط</span>
          <input
            className="input"
            inputMode="numeric"
            value={pillsPerStrip}
            onChange={(e) => setPillsPerStrip(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="مثال: 10"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">عدد الشرائط في العلبة</span>
          <input
            className="input"
            inputMode="numeric"
            value={stripsPerBox}
            onChange={(e) => setStripsPerBox(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="مثال: 3"
          />
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? "جارٍ الحفظ..." : saveLabel}
      </button>
    </div>
  );
}
