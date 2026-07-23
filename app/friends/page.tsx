"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getMyProfile, listFriends, addFriendByCode } from "@/lib/friends";
import { listPendingShares, acceptShares, rejectShare } from "@/lib/sharing";
import type { Profile, SharedItem } from "@/lib/types";

export default function FriendsPage() {
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pending, setPending] = useState<SharedItem[]>([]);
  const [code, setCode] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [profile, friendList, shares] = await Promise.all([
      getMyProfile(),
      listFriends(),
      listPendingShares(),
    ]);
    setMyProfile(profile);
    setFriends(friendList);
    setPending(shares);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
  }, [load]);

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!code.trim()) return;

    setAdding(true);
    const result = await addFriendByCode(code);
    setAdding(false);

    if (result.ok) {
      setCode("");
      load();
    } else {
      setAddError(result.error);
    }
  }

  async function handleAccept(id: string) {
    setBusyId(id);
    await acceptShares([id]);
    setBusyId(null);
    load();
  }

  async function handleReject(id: string) {
    setBusyId(id);
    await rejectShare(id);
    setBusyId(null);
    load();
  }

  async function handleAcceptAll() {
    setAcceptingAll(true);
    await acceptShares();
    setAcceptingAll(false);
    load();
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-10 gap-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-teal-700 text-lg">
          ‹ رجوع
        </Link>
        <h1 className="text-xl font-bold">الأصدقاء</h1>
      </div>

      {loading ? (
        <p className="text-slate-500 text-center">جارٍ التحميل...</p>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  عناصر مقترحة ({pending.length})
                </h2>
                <button
                  className="text-teal-700 text-sm font-semibold"
                  onClick={handleAcceptAll}
                  disabled={acceptingAll}
                >
                  {acceptingAll ? "جارٍ القبول..." : "قبول الكل"}
                </button>
              </div>
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm flex flex-col gap-2"
                >
                  <p className="font-semibold">{item.name}</p>
                  {item.timing && <p className="text-sm text-slate-500">{item.timing}</p>}
                  {item.quantity && (
                    <p className="text-sm text-teal-700">الكمية: {item.quantity}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      className="btn-primary flex-1"
                      onClick={() => handleAccept(item.id)}
                      disabled={busyId === item.id}
                    >
                      قبول
                    </button>
                    <button
                      className="btn-secondary flex-1"
                      onClick={() => handleReject(item.id)}
                      disabled={busyId === item.id}
                    >
                      رفض
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">كود الدعوة الخاص بك</h2>
            <p className="rounded-xl bg-white border border-slate-200 p-4 text-center text-2xl font-bold tracking-widest">
              {myProfile?.invite_code ?? "—"}
            </p>
            <p className="text-sm text-slate-500">
              شارك هذا الكود مع أفراد عائلتك حتى يتمكنوا من إضافتك كصديق
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">إضافة صديق</h2>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                className="input flex-1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="أدخل كود الدعوة"
              />
              <button className="btn-secondary" type="submit" disabled={adding}>
                {adding ? "..." : "إضافة"}
              </button>
            </form>
            {addError && <p className="text-red-600 text-sm">{addError}</p>}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">أصدقاؤك ({friends.length})</h2>
            {friends.length === 0 ? (
              <p className="text-slate-500 text-sm">لا يوجد أصدقاء بعد</p>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="rounded-xl bg-white p-3 border border-slate-100"
                >
                  {friend.display_name}
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
