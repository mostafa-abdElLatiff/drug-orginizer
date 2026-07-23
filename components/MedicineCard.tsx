"use client";

import { useState } from "react";
import Image from "next/image";
import PhotoLightbox from "./PhotoLightbox";
import { resolvePhotoUrl } from "@/lib/medicines";
import type { Medicine } from "@/lib/types";

type Props = {
  medicine: Medicine;
  onClick: () => void;
};

export default function MedicineCard({ medicine, onClick }: Props) {
  const [showPhoto, setShowPhoto] = useState(false);
  const photoUrl = resolvePhotoUrl(medicine);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 text-right shadow-sm border border-slate-100 active:bg-slate-50 cursor-pointer"
    >
      {photoUrl ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPhoto(true);
          }}
          className="shrink-0"
          aria-label="عرض الصورة بالحجم الكامل"
        >
          <Image
            src={photoUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-xl object-cover border border-slate-200"
            unoptimized
          />
        </button>
      ) : (
        <div className="h-14 w-14 shrink-0 rounded-xl bg-teal-50 flex items-center justify-center text-2xl">
          💊
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-slate-900 truncate">{medicine.name}</p>
        {medicine.quantity && (
          <p className="text-sm text-teal-700 mt-0.5">الكمية: {medicine.quantity}</p>
        )}
        {medicine.timing && (
          <p className="text-sm text-slate-500 truncate">{medicine.timing}</p>
        )}
      </div>

      {showPhoto && photoUrl && (
        <PhotoLightbox src={photoUrl} alt={medicine.name} onClose={() => setShowPhoto(false)} />
      )}
    </div>
  );
}
