"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MedicineCard from "@/components/MedicineCard";
import MedicineEditSheet from "@/components/MedicineEditSheet";
import SendToPharmacyModal from "@/components/SendToPharmacyModal";
import ShareToFriendModal from "@/components/ShareToFriendModal";
import { fetchActiveMedicines } from "@/lib/medicines";
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

  return (
    <div className="flex flex-col min-h-screen pb-28">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">أدويتي</h1>
          {displayName && <p className="text-sm text-slate-500">مرحبًا، {displayName}</p>}
        </div>
        <button className="text-slate-400 text-sm" onClick={signOut}>
          تسجيل الخروج
        </button>
      </header>

      <div className="px-5 mb-5">
        <Link
          href="/friends"
          className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-3"
        >
          <span className="font-medium">الأصدقاء</span>
          {pendingCount > 0 ? (
            <span className="rounded-full bg-teal-700 text-white text-xs font-bold px-2.5 py-1">
              {pendingCount} عنصر مقترح
            </span>
          ) : (
            <span className="text-slate-400">‹</span>
          )}
        </Link>
      </div>

      <div className="px-5 mb-5">
        <Link
          href="/library"
          className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-3"
        >
          <span className="font-medium">مكتبة الأدوية</span>
          <span className="text-slate-400">‹</span>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-3 mb-5">
        <Link href="/scan" className="btn-primary text-center">
          📷 إضافة من صورة روشتة
        </Link>
        <button className="btn-secondary" onClick={() => setEditing("new")}>
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
    </div>
  );
}
