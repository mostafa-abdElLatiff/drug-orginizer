export type Medicine = {
  id: string;
  name: string;
  dosage: string | null;
  timing: string | null;
  quantity: string | null;
  photo_url: string | null;
  source: "scan" | "manual";
  scan_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExtractedItem = {
  name: string;
  dosage: string | null;
  timing: string | null;
  confidence: "high" | "low";
};

export type ExtractResponse =
  | { ok: true; items: ExtractedItem[] }
  | { ok: false; error: string };

export type ReviewRow = {
  localId: string;
  name: string;
  dosage: string | null;
  timing: string | null;
  quantity: string | null;
  confidence: "high" | "low" | null;
  matchedReference: boolean;
};

export type DrugCandidate = {
  name_en: string;
  name_ar: string | null;
  scientific_name: string | null;
  score: number;
};

export type MatchNamesResponse =
  | { ok: true; results: { name: string; candidates: DrugCandidate[] }[] }
  | { ok: false; error: string };

export type ReconciledItem = ExtractedItem & { matchedReference: boolean };

export type ReconcileResponse =
  | { ok: true; items: ReconciledItem[] }
  | { ok: false; error: string };
