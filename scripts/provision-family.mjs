// One-time (or occasional) local script to create family member accounts.
// NOT part of the deployed app -- run manually, never deployed, never committed
// with real secrets in it.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxxx \
//   node scripts/provision-family.mjs
//
// Edit the FAMILY_MEMBERS list below first. Re-run any time to add one more
// person -- existing members (matched by display name) are skipped.

import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "crypto";

const FAMILY_MEMBERS = [
  { displayName: "محمد", pin: "1956" },
  { displayName: "بسمة", pin: "1966" },
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, easier to read aloud
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function provisionOne({ displayName, pin }) {
  if (!/^\d{4,}$/.test(pin)) {
    console.error(`Skipping "${displayName}": PIN must be at least 4 digits.`);
    return;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, invite_code")
    .eq("display_name", displayName)
    .maybeSingle();

  if (existing) {
    console.log(`"${displayName}" already exists -- invite code: ${existing.invite_code}`);
    return;
  }

  const email = `${randomUUID()}@drugorginizer.local`;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error(`Failed to create auth user for "${displayName}":`, createError?.message);
    return;
  }

  const inviteCode = generateInviteCode();

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    display_name: displayName,
    invite_code: inviteCode,
  });

  if (profileError) {
    console.error(`Failed to create profile for "${displayName}":`, profileError.message);
    return;
  }

  console.log(`"${displayName}" created -- invite code: ${inviteCode}`);
}

for (const member of FAMILY_MEMBERS) {
  await provisionOne(member);
}
