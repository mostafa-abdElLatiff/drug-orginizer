"use client";

import { useEffect, useState } from "react";
import { listFriends } from "@/lib/friends";
import { shareListToFriend } from "@/lib/sharing";
import type { Medicine, Profile } from "@/lib/types";

type Props = {
  medicines: Medicine[];
  onClose: () => void;
};

export default function ShareToFriendModal({ medicines, onClose }: Props) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFriends().then((f) => {
      setFriends(f);
      setLoading(false);
    });
  }, []);

  async function handleSend(friendId: string) {
    setSendingTo(friendId);
    setError(null);
    const result = await shareListToFriend(friendId, medicines);
    setSendingTo(null);
    if (result.ok) {
      setSentTo(friendId);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
        <h2 className="text-xl font-bold mb-4">إرسال القائمة إلى صديق</h2>

        {loading && <p className="text-slate-500 text-center">جارٍ التحميل...</p>}

        {!loading && friends.length === 0 && (
          <p className="text-slate-500 text-sm">
            لا يوجد أصدقاء بعد. أضف صديقًا أولًا من صفحة الأصدقاء.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
            >
              <span>{friend.display_name}</span>
              {sentTo === friend.id ? (
                <span className="text-teal-700 text-sm font-semibold">تم الإرسال ✓</span>
              ) : (
                <button
                  className="btn-secondary"
                  onClick={() => handleSend(friend.id)}
                  disabled={sendingTo === friend.id}
                >
                  {sendingTo === friend.id ? "..." : "إرسال"}
                </button>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button className="btn-text mt-4" onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  );
}
