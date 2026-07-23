"use client";

import { useState } from "react";
import { buildPharmacyMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { Medicine } from "@/lib/types";

type Props = {
  medicines: Medicine[];
  onClose: () => void;
};

export default function SendToPharmacyModal({ medicines, onClose }: Props) {
  const [notes, setNotes] = useState("");
  const phoneNumber = process.env.NEXT_PUBLIC_PHARMACY_WHATSAPP_NUMBER ?? "";
  const message = buildPharmacyMessage(medicines, notes);
  const hasPhoneNumber = phoneNumber.trim().length > 0;
  const whatsappUrl = hasPhoneNumber ? buildWhatsAppUrl(phoneNumber, message) : "#";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
        <h2 className="text-xl font-bold mb-3">مراجعة الرسالة قبل الإرسال</h2>

        <label className="flex flex-col gap-1.5 mb-3">
          <span className="text-sm font-medium text-slate-600">
            ملاحظات إضافية (اختياري)
          </span>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: من فضلك أرسلوا البديل لو الصنف غير متوفر"
          />
        </label>

        <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 border border-slate-200 p-4 text-base leading-relaxed font-arabic">
          {message}
        </pre>

        {!hasPhoneNumber && (
          <p className="text-red-600 text-sm mt-3">
            لم يتم ضبط رقم واتساب الصيدلية بعد.
          </p>
        )}

        <div className="flex flex-col gap-2 mt-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn-primary text-center ${!hasPhoneNumber ? "pointer-events-none opacity-50" : ""}`}
          >
            فتح واتساب وإرسال
          </a>
          <button className="btn-text" onClick={onClose}>
            رجوع
          </button>
        </div>
      </div>
    </div>
  );
}
