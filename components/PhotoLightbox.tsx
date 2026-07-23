"use client";

import { createPortal } from "react-dom";

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

export default function PhotoLightbox({ src, alt, onClose }: Props) {
  // Rendered via a portal into document.body -- otherwise this sits as a DOM
  // child of whatever card/list-item opened it, and clicking the backdrop to
  // dismiss it bubbles straight back into that parent's own onClick.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        className="absolute top-5 left-5 text-white text-3xl leading-none"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
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
    </div>,
    document.body
  );
}
