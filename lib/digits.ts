// Arabic keyboards commonly produce Arabic-Indic (٠-٩) or Extended
// Arabic-Indic/Persian (۰-۹) digits instead of Western 0-9. Normalize to
// Western digits so a PIN typed in either script resolves to the same value.
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

export function toWesternDigits(input: string): string {
  return input
    .split("")
    .map((char) => {
      const arabicIndex = ARABIC_INDIC.indexOf(char);
      if (arabicIndex !== -1) return String(arabicIndex);
      const extendedIndex = EXTENDED_ARABIC_INDIC.indexOf(char);
      if (extendedIndex !== -1) return String(extendedIndex);
      return char;
    })
    .join("");
}
