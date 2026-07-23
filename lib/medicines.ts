import { getSupabase, DRUG_PHOTOS_BUCKET } from "./supabase";
import type { Medicine } from "./types";

// medicines.drug_reference_id is a real FK, so this embed is resolved by
// PostgREST directly -- used everywhere a Medicine is read/returned so the
// linked photo (see resolvePhotoUrl) is always available to the UI.
const MEDICINE_SELECT = "*, drug_reference(image_url)";

export async function fetchActiveMedicines(): Promise<Medicine[]> {
  const { data, error } = await getSupabase()
    .from("medicines")
    .select(MEDICINE_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as unknown as Medicine[];
}

// Personal photo always wins; falls back to the linked reference product's
// photo (which can improve over time via /library) only when the medicine
// itself never had its own photo attached.
export function resolvePhotoUrl(medicine: Medicine): string | null {
  return medicine.photo_url ?? medicine.drug_reference?.image_url ?? null;
}

export type MedicineInput = {
  name: string;
  timing: string | null;
  quantity: string | null;
  photo_url: string | null;
  source: "scan" | "manual" | "shared";
  scan_id: string | null;
  times_per_day?: number | null;
  pills_per_intake?: number | null;
  drug_reference_id?: number | null;
};

export async function insertMedicine(input: MedicineInput): Promise<Medicine> {
  const { data, error } = await getSupabase()
    .from("medicines")
    .insert(input)
    .select(MEDICINE_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as Medicine;
}

export async function updateMedicine(
  id: string,
  patch: Partial<MedicineInput>
): Promise<Medicine> {
  const { data, error } = await getSupabase()
    .from("medicines")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(MEDICINE_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as Medicine;
}

export async function deactivateMedicine(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("medicines")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// Soft-deletes every active medicine at once ("clear the list"). RLS scopes
// this to the signed-in user's own rows regardless of the blanket .eq
// filter, so this can never touch anyone else's list.
export async function deactivateAllMedicines(): Promise<void> {
  const { error } = await getSupabase()
    .from("medicines")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("is_active", true);

  if (error) throw error;
}

export async function createScan(
  imageUrl: string | null,
  rawResponse: unknown
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("scans")
    .insert({ image_url: imageUrl, raw_response: rawResponse })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function uploadDrugPhoto(
  blob: Blob,
  prefix: "prescriptions" | "pills" | "reference"
): Promise<string> {
  const supabase = getSupabase();
  const path = `${prefix}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(DRUG_PHOTOS_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });

  if (error) throw error;

  const { data } = supabase.storage.from(DRUG_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
