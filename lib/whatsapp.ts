import type { Medicine } from "./types";

export function buildPharmacyMessage(medicines: Medicine[], notes?: string): string {
  const lines = [
    "قائمة الأدوية المطلوبة:",
    "",
    ...medicines.map((m, i) => {
      const parts = [`${i + 1}. ${m.name}`];
      if (m.dosage) parts.push(`(${m.dosage})`);
      if (m.quantity) parts.push(`- الكمية: ${m.quantity}`);
      return parts.join(" ");
    }),
  ];

  if (notes && notes.trim()) {
    lines.push("", "ملاحظات:", notes.trim());
  }

  return lines.join("\n");
}

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const digitsOnly = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
