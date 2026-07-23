"use client";

import { useState } from "react";
import Image from "next/image";
import { compressImageFile } from "@/lib/image";

type Props = {
  analyzing: boolean;
  onAnalyze: (data: { base64: string; mimeType: string; blob: Blob; previewUrl: string }) => void;
};

export default function ScanUploader({ analyzing, onAnalyze }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{ base64: string; mimeType: string; blob: Blob } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { blob, base64, mimeType } = await compressImageFile(file);
      setPending({ base64, mimeType, blob });
      setPreviewUrl(`data:${mimeType};base64,${base64}`);
    } catch {
      setError("تعذر تحميل الصورة، حاول مرة أخرى");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="btn-secondary text-center cursor-pointer">
        📷 اختر صورة الروشتة
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {previewUrl && (
        <Image
          src={previewUrl}
          alt="معاينة الروشتة"
          width={400}
          height={400}
          className="w-full max-h-80 rounded-2xl object-contain border border-slate-200 bg-white"
          unoptimized
        />
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {pending && (
        <button
          className="btn-primary"
          disabled={analyzing}
          onClick={() =>
            previewUrl && onAnalyze({ ...pending, previewUrl })
          }
        >
          {analyzing ? "جارٍ تحليل الصورة..." : "تحليل الصورة"}
        </button>
      )}
    </div>
  );
}
