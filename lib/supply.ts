// totalPillsPerDay = timesPerDay * pillsPerIntake (e.g. 3 times a day, 2
// pills each time = 6 pills/day) -- compute that multiplication at the call
// site, this function only ever deals with the final daily total.
export function computeMonthlySupplyText(
  totalPillsPerDay: number | null,
  pillsPerStrip: number | null,
  stripsPerBox: number | null
): string | null {
  if (!totalPillsPerDay || totalPillsPerDay <= 0) return null;
  if (!pillsPerStrip || pillsPerStrip <= 0 || !stripsPerBox || stripsPerBox <= 0) return null;

  const pillsPerBox = pillsPerStrip * stripsPerBox;
  const monthlyPills = totalPillsPerDay * 30; // approximate month

  if (monthlyPills >= pillsPerBox) {
    return `${Math.ceil(monthlyPills / pillsPerBox)} علبة (لشهر واحد تقريبًا)`;
  }
  return `${Math.ceil(monthlyPills / pillsPerStrip)} شريط (لشهر واحد تقريبًا)`;
}
