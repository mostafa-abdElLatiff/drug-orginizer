import { getSupabase, DRUG_PHOTOS_BUCKET } from "./supabase";
import type { Medicine } from "./types";

export async function fetchActiveMedicines(): Promise<Medicine[]> {
  const { data, error } = await getSupabase()
    .from("medicines")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Medicine[];
}

export type MedicineInput = {
  name: string;
  dosage: string | null;
  timing: string | null;
  quantity: string | null;
  photo_url: string | null;
  source: "scan" | "manual" | "shared";
  scan_id: string | null;
  pills_per_day?: number | null;
};

export async function insertMedicine(input: MedicineInput): Promise<Medicine> {
  const { data, error } = await getSupabase()
    .from("medicines")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as Medicine;
}

export async function updateMedicine(
  id: string,
  patch: Partial<MedicineInput>
): Promise<Medicine> {
  const { data, error } = await getSupabase()
    .from("medicines")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Medicine;
}

export async function deactivateMedicine(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("medicines")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

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
