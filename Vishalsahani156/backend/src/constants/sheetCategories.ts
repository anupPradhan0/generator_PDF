export const SHEET_CATEGORIES = [
  "Invoice",
  "Event Pass",
  "Resume",
  "Certificate",
  "Report",
  "Custom Sheet"
] as const;

export type SheetCategory = (typeof SHEET_CATEGORIES)[number];

export const NOT_FOUND_RECORD_MESSAGE = "Not found: this record does not exist";

export function isAllowedSheetCategory(value: string): value is SheetCategory {
  return (SHEET_CATEGORIES as readonly string[]).includes(value);
}

/** Case-insensitive match for known categories; otherwise undefined. */
export function matchAllowedSheetCategory(value: string): SheetCategory | undefined {
  const trimmed = value.trim();
  if (isAllowedSheetCategory(trimmed)) return trimmed;
  return SHEET_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
}
