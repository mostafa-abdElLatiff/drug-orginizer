import { getSupabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export async function resolveLoginEmail(name: string): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("resolve_login_email", {
    name_input: name,
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function signInWithPin(
  name: string,
  pin: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = await resolveLoginEmail(name);
  if (!email) {
    return { ok: false, error: "الاسم غير موجود" };
  }

  const { error } = await getSupabase().auth.signInWithPassword({
    email,
    password: pin,
  });

  if (error) {
    return { ok: false, error: "الرقم السري غير صحيح" };
  }

  return { ok: true };
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
