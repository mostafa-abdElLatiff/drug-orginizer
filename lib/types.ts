export type Medicine = {
  id: string;
  name: string;
  timing: string | null;
  quantity: string | null;
  photo_url: string | null;
  source: "scan" | "manual" | "shared";
  scan_id: string | null;
  is_active: boolean;
  owner_id: string;
  times_per_day: number | null;
  pills_per_intake: number | null;
  drug_reference_id: number | null;
  // Only present when fetched with the drug_reference(...) embed (see
  // fetchActiveMedicines) -- absent/undefined everywhere else.
  drug_reference?: { image_url: string | null } | null;
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
  timing: string | null;
  quantity: string | null;
  photo_url: string | null;
  drug_reference_id: number | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type ExtractedItem = {
  name: string;
  timing: string | null;
  confidence: "high" | "low";
  timesPerDay: number | null;
  pillsPerIntake: number | null;
};

export type ExtractResponse =
  | { ok: true; items: ExtractedItem[] }
  | { ok: false; error: string };

export type MatchConfidence = "high" | "medium" | "low" | null;

export type ReviewRow = {
  localId: string;
  name: string;
  timing: string | null;
  quantity: string | null;
  confidence: "high" | "low" | null;
  matchConfidence: MatchConfidence;
  photoUrl: string | null;
  timesPerDay: number | null;
  pillsPerIntake: number | null;
  quantitySuggested: boolean;
  drugReferenceId: number | null;
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
  drugReferenceId: number | null;
};

export type ReconcileResponse =
  | { ok: true; items: ReconciledItem[] }
  | { ok: false; error: string };
