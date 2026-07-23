import { getSupabase } from "./supabase";
import type { DrugCandidate } from "./types";

export async function searchDrugReference(query: string): Promise<DrugCandidate[]> {
  if (!query.trim()) return [];

  const { data, error } = await getSupabase().rpc("match_drug_name", {
    query: query.trim(),
    match_count: 10,
  });

  if (error) return [];
  return (data ?? []) as DrugCandidate[];
}

export async function linkImageToDrug(
  id: number,
  imageUrl: string | null,
  pillsPerStrip: number | null,
  stripsPerBox: number | null
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("drug_reference")
    .update({ image_url: imageUrl, pills_per_strip: pillsPerStrip, strips_per_box: stripsPerBox })
    .eq("id", id);

  return !error;
}

// Partial update -- only touches image_url, so linking a photo found via
// manual entry never wipes out pack-size data curated separately (e.g. via
// the /library page).
export async function updateDrugReferenceImage(id: number, imageUrl: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("drug_reference")
    .update({ image_url: imageUrl })
    .eq("id", id);

  return !error;
}

export async function createDrugReferenceEntry(
  nameEn: string,
  imageUrl: string | null,
  pillsPerStrip: number | null,
  stripsPerBox: number | null
): Promise<boolean> {
  const { error } = await getSupabase().from("drug_reference").insert({
    name_en: nameEn.trim(),
    image_url: imageUrl,
    pills_per_strip: pillsPerStrip,
    strips_per_box: stripsPerBox,
  });

  return !error;
}
