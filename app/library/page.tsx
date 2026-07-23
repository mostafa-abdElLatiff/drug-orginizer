"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import DrugReferenceForm from "@/components/DrugReferenceForm";
import PhotoLightbox from "@/components/PhotoLightbox";
import { searchDrugReference, linkImageToDrug, createDrugReferenceEntry } from "@/lib/drugReference";
import type { DrugCandidate } from "@/lib/types";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard debounced search
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const data = await searchDrugReference(query);
      setResults(data);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  function flashSaved() {
    setOpenId(null);
    setAddingNew(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-10 gap-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-teal-700 text-lg">
          ‹ رجوع
        </Link>
        <h1 className="text-xl font-bold">مكتبة الأدوية</h1>
      </div>

      <p className="text-sm text-slate-500">
        ابحث عن دواء لإضافة أو تعديل صورته وحجم عبوته، حتى يتم التعرف عليه تلقائيًا في المرة القادمة
      </p>

      <input
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="اكتب اسم الدواء للبحث"
        autoFocus
      />

      {savedNotice && (
        <p className="text-teal-700 bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm">
          ✓ تم الحفظ
        </p>
      )}

      {searching && <p className="text-slate-500 text-sm">جارٍ البحث...</p>}

      <div className="flex flex-col gap-3">
        {results.map((drug) => (
          <div
            key={drug.id}
            className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm"
          >
            <div
              className="w-full flex items-center gap-3 text-right cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(openId === drug.id ? null : drug.id)}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                setOpenId(openId === drug.id ? null : drug.id)
              }
            >
              {drug.image_url ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxUrl(drug.image_url);
                  }}
                  className="shrink-0"
                >
                  <Image
                    src={drug.image_url}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                    unoptimized
                  />
                </button>
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-lg bg-teal-50 flex items-center justify-center text-xl">
                  💊
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{drug.name_en}</p>
                {drug.name_ar && (
                  <p className="text-sm text-slate-500 truncate">{drug.name_ar}</p>
                )}
              </div>
            </div>

            {openId === drug.id && (
              <DrugReferenceForm
                initialImageUrl={drug.image_url}
                initialPillsPerStrip={drug.pills_per_strip}
                initialStripsPerBox={drug.strips_per_box}
                saveLabel="حفظ"
                onSave={({ imageUrl, pillsPerStrip, stripsPerBox }) =>
                  linkImageToDrug(drug.id, imageUrl, pillsPerStrip, stripsPerBox)
                }
                onSaved={flashSaved}
              />
            )}
          </div>
        ))}
      </div>

      {query.trim() && !searching && (
        <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
          <button
            className="w-full text-right text-teal-700 font-medium"
            onClick={() => setAddingNew(!addingNew)}
          >
            لم أجد الدواء المطلوب؟ أضفه كدواء جديد
          </button>
          {addingNew && (
            <DrugReferenceForm
              saveLabel="إضافة"
              onSave={({ imageUrl, pillsPerStrip, stripsPerBox }) =>
                createDrugReferenceEntry(query.trim(), imageUrl, pillsPerStrip, stripsPerBox)
              }
              onSaved={flashSaved}
            />
          )}
        </div>
      )}

      {lightboxUrl && (
        <PhotoLightbox src={lightboxUrl} alt="" onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}
