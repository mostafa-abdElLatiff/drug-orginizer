"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { compressImageFile } from "@/lib/image";
import { insertMedicine, updateMedicine, deactivateMedicine, uploadDrugPhoto } from "@/lib/medicines";
import {
  searchDrugReference,
  createDrugReferenceEntry,
  updateDrugReferenceImage,
} from "@/lib/drugReference";
import type { DrugCandidate, Medicine } from "@/lib/types";

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
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(medicine?.photo_url ?? null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(medicine?.photo_url ?? null);
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search-and-link against the drug reference database -- only relevant
  // when adding a brand-new medicine, not editing an existing saved one.
  const [candidates, setCandidates] = useState<DrugCandidate[]>([]);
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);

  useEffect(() => {
    if (medicine || selectedDrugId || !name.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard debounced search
      setCandidates([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const results = await searchDrugReference(name);
      setCandidates(results);
    }, 400);
    return () => clearTimeout(timeout);
  }, [name, medicine, selectedDrugId]);

  function handleSelectCandidate(candidate: DrugCandidate) {
    setName(candidate.name_en);
    setSelectedDrugId(candidate.id);
    setCandidates([]);
    if (candidate.image_url && !pendingPhotoBlob && !existingPhotoUrl) {
      setExistingPhotoUrl(candidate.image_url);
      setPhotoPreview(candidate.image_url);
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    setSelectedDrugId(null);
  }

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
      let finalPhotoUrl = existingPhotoUrl;
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
        drug_reference_id: medicine?.drug_reference_id ?? selectedDrugId,
      };

      const saved = medicine
        ? await updateMedicine(medicine.id, input)
        : await insertMedicine(input);

      // Keep the reference database in sync with a deliberate manual entry
      // -- either linking a newly-uploaded photo to the drug the user
      // picked, or registering a drug that wasn't found at all so it's
      // recognized automatically next time.
      if (!medicine) {
        if (selectedDrugId && pendingPhotoBlob && finalPhotoUrl) {
          await updateDrugReferenceImage(selectedDrugId, finalPhotoUrl);
        } else if (!selectedDrugId) {
          await createDrugReferenceEntry(name.trim(), finalPhotoUrl, null, null);
        }
      }

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
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="مثال: بانادول"
              autoFocus
            />
            {candidates.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
                {candidates.slice(0, 5).map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => handleSelectCandidate(candidate)}
                    className="flex items-center gap-2 rounded-lg p-2 text-right hover:bg-white"
                  >
                    {candidate.image_url ? (
                      <Image
                        src={candidate.image_url}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-md object-cover border border-slate-200"
                        unoptimized
                      />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded-md bg-teal-50 flex items-center justify-center text-lg">
                        💊
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{candidate.name_en}</p>
                      {candidate.name_ar && (
                        <p className="text-xs text-slate-500 truncate">{candidate.name_ar}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedDrugId && (
              <p className="text-teal-700 text-xs mt-1">✓ مرتبط بقاعدة بيانات الأدوية</p>
            )}
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
