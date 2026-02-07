import { DictionaryKey, Locale, t } from "../i18n";

const CATEGORY_LABEL_KEYS: Record<string, DictionaryKey> = {
  all: "allCategories",
  general: "categoryGeneral",
  logic: "categoryLogic",
  science: "categoryScience",
  geography: "categoryGeography",
  history: "categoryHistory",
  sports: "categorySports",
  pop: "categoryPop",
  nature: "categoryNature",
  daily: "categoryDaily"
};

export function localizedCategoryLabel(locale: Locale, categoryId: string, fallback: string) {
  const key = CATEGORY_LABEL_KEYS[categoryId];
  return key ? t(locale, key) : fallback;
}
