"use client";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  confirming,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
        <h2 className="text-xl font-bold text-center">{title}</h2>
        <p className="text-base text-slate-600 text-center leading-relaxed">{message}</p>
        <button className="btn-danger" onClick={onConfirm} disabled={confirming}>
          {confirming ? "جارٍ التنفيذ..." : confirmLabel}
        </button>
        <button className="btn-text" onClick={onCancel} disabled={confirming}>
          إلغاء
        </button>
      </div>
    </div>
  );
}
