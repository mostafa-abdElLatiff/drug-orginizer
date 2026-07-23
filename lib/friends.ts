import { getSupabase } from "./supabase";
import type { Profile } from "./types";

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function listFriends(): Promise<Profile[]> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  // friend_id references auth.users, not profiles, directly -- so this is a
  // sibling relationship PostgREST can't auto-embed in one request. Two
  // simple queries instead.
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("friend_id")
    .eq("user_id", session.user.id);

  if (friendshipsError || !friendships || friendships.length === 0) return [];

  const friendIds = friendships.map((f) => f.friend_id);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", friendIds);

  if (profilesError || !profiles) return [];
  return profiles as Profile[];
}

export async function addFriendByCode(
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await getSupabase().rpc("add_friend", {
    invite_code_input: code.trim(),
  });

  if (error) {
    return { ok: false, error: "الكود غير صحيح، تأكد منه وحاول مرة أخرى" };
  }
  return { ok: true };
}
