/** Labels aligned with translation.md (path prefix locales). */
export const LOCALE_LABEL: Record<string, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  "pt-BR": "Português (Brasil)",
  cs: "Čeština",
  da: "Dansk",
  pl: "Polski",
  sv: "Svenska",
  ja: "日本語",
  ko: "한국어",
  "zh-Hans": "简体中文",
  hi: "हिन्दी",
  ru: "Русский",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
};

export function localeLabel(code: string): string {
  return LOCALE_LABEL[code] ?? code;
}
