export function computeMonthlySupplyText(
  pillsPerDay: number | null,
  pillsPerStrip: number | null,
  stripsPerBox: number | null
): string | null {
  if (!pillsPerDay || pillsPerDay <= 0) return null;
  if (!pillsPerStrip || pillsPerStrip <= 0 || !stripsPerBox || stripsPerBox <= 0) return null;

  const pillsPerBox = pillsPerStrip * stripsPerBox;
  const monthlyPills = pillsPerDay * 30; // approximate month

  if (monthlyPills >= pillsPerBox) {
    return `${Math.ceil(monthlyPills / pillsPerBox)} علبة (لشهر واحد تقريبًا)`;
  }
  return `${Math.ceil(monthlyPills / pillsPerStrip)} شريط (لشهر واحد تقريبًا)`;
}
