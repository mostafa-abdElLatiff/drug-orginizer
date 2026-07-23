"use client";

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

export default function PhotoLightbox({ src, alt, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-5 left-5 text-white text-3xl leading-none"
        onClick={onClose}
        aria-label="إغلاق"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
