"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MedicineCard from "@/components/MedicineCard";
import MedicineEditSheet from "@/components/MedicineEditSheet";
import SendToPharmacyModal from "@/components/SendToPharmacyModal";
import ShareToFriendModal from "@/components/ShareToFriendModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { fetchActiveMedicines, deactivateAllMedicines } from "@/lib/medicines";
import { listPendingShares } from "@/lib/sharing";
import { signOut } from "@/lib/auth";
import { getMyProfile } from "@/lib/friends";
import type { Medicine } from "@/lib/types";

export default function HomePage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Medicine | null | "new">(null);
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, pending, profile] = await Promise.all([
        fetchActiveMedicines(),
        listPendingShares(),
        getMyProfile(),
      ]);
      setMedicines(data);
      setPendingCount(pending.length);
      setDisplayName(profile?.display_name ?? null);
    } catch {
      setError("تعذر تحميل قائمة الأدوية");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
  }, [load]);

  function handleSaved(medicine: Medicine) {
    setMedicines((prev) => {
      const exists = prev.some((m) => m.id === medicine.id);
      return exists
        ? prev.map((m) => (m.id === medicine.id ? medicine : m))
        : [...prev, medicine];
    });
  }

  function handleDeleted(id: string) {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      await deactivateAllMedicines();
      setMedicines([]);
      setConfirmingClear(false);
    } catch {
      setError("تعذر مسح القائمة، حاول مرة أخرى");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-40">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">أدويتي</h1>
          {displayName && <p className="text-lg font-medium text-slate-600">مرحبًا، {displayName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-14 w-14 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl text-teal-700 active:bg-slate-50"
            onClick={() => load()}
            aria-label="تحديث"
            title="تحديث"
          >
            ⟳
          </button>
          <button
            className="px-3 py-3 text-base text-slate-500 active:text-slate-700"
            onClick={signOut}
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="px-5 mb-5">
        <Link
          href="/friends"
          className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-4"
        >
          <span className="text-lg font-medium">الأصدقاء</span>
          {pendingCount > 0 ? (
            <span className="rounded-full bg-teal-700 text-white text-sm font-bold px-3 py-1.5">
              {pendingCount} عنصر مقترح
            </span>
          ) : (
            <span className="text-slate-400 text-xl">‹</span>
          )}
        </Link>
      </div>

      <div className="px-5 mb-5">
        <Link
          href="/library"
          className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-4"
        >
          <span className="text-lg font-medium">مكتبة الأدوية</span>
          <span className="text-slate-400 text-xl">‹</span>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-3 mb-5">
        <Link href="/scan" className="btn-primary text-center">
          📷 إضافة من صورة روشتة
        </Link>
        <button className="btn-secondary w-full" onClick={() => setEditing("new")}>
          ✏️ إضافة دواء يدويًا
        </button>
      </div>

      <main className="px-5 flex flex-col gap-3">
        {loading && <p className="text-slate-500 text-center mt-8">جارٍ التحميل...</p>}
        {error && <p className="text-red-600 text-center mt-8">{error}</p>}
        {!loading && !error && medicines.length === 0 && (
          <p className="text-slate-500 text-center mt-8">
            لا توجد أدوية بعد. أضف روشتة أو أدخل دواء يدويًا.
          </p>
        )}
        {medicines.map((medicine) => (
          <MedicineCard
            key={medicine.id}
            medicine={medicine}
            onClick={() => setEditing(medicine)}
          />
        ))}
      </main>

      {medicines.length > 0 && (
        <div className="px-5 mt-10">
          <button className="btn-danger" onClick={() => setConfirmingClear(true)}>
            🗑️ مسح كل القائمة
          </button>
        </div>
      )}

      {medicines.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 flex flex-col gap-2">
          <button className="btn-primary" onClick={() => setSending(true)}>
            📤 إرسال إلى الصيدلية
          </button>
          <button className="btn-secondary" onClick={() => setSharing(true)}>
            👤 إرسال إلى صديق
          </button>
        </div>
      )}

      {editing !== null && (
        <MedicineEditSheet
          medicine={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {sending && (
        <SendToPharmacyModal medicines={medicines} onClose={() => setSending(false)} />
      )}

      {sharing && (
        <ShareToFriendModal medicines={medicines} onClose={() => setSharing(false)} />
      )}

      {confirmingClear && (
        <ConfirmDialog
          title="مسح كل القائمة؟"
          message="سيتم حذف كل الأدوية من قائمتك الحالية. لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="نعم، امسح الكل"
          onConfirm={handleClearAll}
          onCancel={() => setConfirmingClear(false)}
          confirming={clearing}
        />
      )}
    </div>
  );
}
