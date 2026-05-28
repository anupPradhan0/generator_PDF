import { z } from "zod";
import {
  NOT_FOUND_RECORD_MESSAGE,
  SHEET_CATEGORIES,
  matchAllowedSheetCategory
} from "../constants/sheetCategories";
import { AppError } from "./AppError";

export const sheetCategorySchema = z.enum(SHEET_CATEGORIES);

export function categoryNotFoundError(): AppError {
  return new AppError(NOT_FOUND_RECORD_MESSAGE, 404);
}

export function assertAllowedCategoryFilter(category: string): void {
  if (!matchAllowedSheetCategory(category)) {
    throw categoryNotFoundError();
  }
}

export function assertRecordHasAllowedCategory(value?: string | null): void {
  if (!matchAllowedSheetCategory(value ?? "")) {
    throw categoryNotFoundError();
  }
}

export function allowedCategoriesFilter() {
  return { sheetCategory: { $in: [...SHEET_CATEGORIES] } };
}
