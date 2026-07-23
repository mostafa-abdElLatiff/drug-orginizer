"use client";

import Image from "next/image";
import type { Medicine } from "@/lib/types";

type Props = {
  medicine: Medicine;
  onClick: () => void;
};

export default function MedicineCard({ medicine, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 text-right shadow-sm border border-slate-100 active:bg-slate-50"
    >
      {medicine.photo_url ? (
        <Image
          src={medicine.photo_url}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-xl object-cover border border-slate-200"
          unoptimized
        />
      ) : (
        <div className="h-14 w-14 shrink-0 rounded-xl bg-teal-50 flex items-center justify-center text-2xl">
          💊
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-slate-900 truncate">{medicine.name}</p>
        {(medicine.dosage || medicine.timing) && (
          <p className="text-sm text-slate-500 truncate">
            {[medicine.dosage, medicine.timing].filter(Boolean).join(" · ")}
          </p>
        )}
        {medicine.quantity && (
          <p className="text-sm text-teal-700 mt-0.5">الكمية: {medicine.quantity}</p>
        )}
      </div>
    </button>
  );
}
