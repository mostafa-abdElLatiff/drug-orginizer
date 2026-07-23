import { getSupabase } from "./supabase";
import type { Medicine, SharedItem } from "./types";

export async function shareListToFriend(
  friendId: string,
  medicines: Medicine[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "يجب تسجيل الدخول" };

  const rows = medicines.map((m) => ({
    from_user_id: session.user.id,
    to_user_id: friendId,
    name: m.name,
    dosage: m.dosage,
    timing: m.timing,
    quantity: m.quantity,
    photo_url: m.photo_url,
  }));

  const { error } = await supabase.from("shared_items").insert(rows);
  if (error) {
    return { ok: false, error: "تعذر إرسال القائمة" };
  }
  return { ok: true };
}

export async function listPendingShares(): Promise<SharedItem[]> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("shared_items")
    .select("*")
    .eq("to_user_id", session.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as SharedItem[];
}

export async function acceptShares(shareIds?: string[]): Promise<boolean> {
  const { error } = await getSupabase().rpc("accept_shares", {
    share_ids: shareIds && shareIds.length > 0 ? shareIds : null,
  });
  return !error;
}

export async function rejectShare(id: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("shared_items")
    .update({ status: "rejected" })
    .eq("id", id);
  return !error;
}
