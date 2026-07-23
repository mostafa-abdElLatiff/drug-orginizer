export type Medicine = {
  id: string;
  name: string;
  dosage: string | null;
  timing: string | null;
  quantity: string | null;
  photo_url: string | null;
  source: "scan" | "manual" | "shared";
  scan_id: string | null;
  is_active: boolean;
  owner_id: string;
  pills_per_day: number | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  invite_code: string;
  created_at: string;
};

export type Friendship = {
  user_id: string;
  friend_id: string;
  created_at: string;
};

export type SharedItem = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  name: string;
  dosage: string | null;
  timing: string | null;
  quantity: string | null;
  photo_url: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type ExtractedItem = {
  name: string;
  dosage: string | null;
  timing: string | null;
  confidence: "high" | "low";
  pillsPerDay: number | null;
};

export type ExtractResponse =
  | { ok: true; items: ExtractedItem[] }
  | { ok: false; error: string };

export type MatchConfidence = "high" | "medium" | "low" | null;

export type ReviewRow = {
  localId: string;
  name: string;
  dosage: string | null;
  timing: string | null;
  quantity: string | null;
  confidence: "high" | "low" | null;
  matchConfidence: MatchConfidence;
  photoUrl: string | null;
  pillsPerDay: number | null;
  quantitySuggested: boolean;
};

export type DrugCandidate = {
  id: number;
  name_en: string;
  name_ar: string | null;
  scientific_name: string | null;
  image_url: string | null;
  pills_per_strip: number | null;
  strips_per_box: number | null;
  score: number;
};

export type MatchNamesResponse =
  | { ok: true; results: { name: string; candidates: DrugCandidate[] }[] }
  | { ok: false; error: string };

export type ReconciledItem = ExtractedItem & {
  matchConfidence: MatchConfidence;
  photoUrl: string | null;
  suggestedQuantity: string | null;
};

export type ReconcileResponse =
  | { ok: true; items: ReconciledItem[] }
  | { ok: false; error: string };
