"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || pin.trim().length === 0) {
      setError("من فضلك اكتب الاسم والرقم السري");
      return;
    }

    setLoading(true);
    const result = await signInWithPin(name, pin);
    setLoading(false);

    if (result.ok) {
      router.replace("/");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">أدويتي</h1>
        <p className="text-slate-500 text-center mb-8">سجّل الدخول لعرض قائمتك</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600">الاسم الأول</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: بابا"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600">الرقم السري</span>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="٦ أرقام على الأقل"
            />
          </label>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button className="btn-primary mt-2" type="submit" disabled={loading}>
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
