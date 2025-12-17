// Language code to flag emoji and name mapping
// Uses ISO 3166-1 alpha-2 country codes for flag emojis

export const LANGUAGE_FLAGS = {
  // Major languages
  en: '🇬🇧',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  'zh-hk': '🇭🇰',
  'zh-tw': '🇹🇼',
  'zh-ro': '🇨🇳',
  
  // European languages
  es: '🇪🇸',
  'es-la': '🇲🇽',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  'pt-br': '🇧🇷',
  ru: '🇷🇺',
  pl: '🇵🇱',
  nl: '🇳🇱',
  sv: '🇸🇪',
  da: '🇩🇰',
  fi: '🇫🇮',
  no: '🇳🇴',
  uk: '🇺🇦',
  cs: '🇨🇿',
  hu: '🇭🇺',
  ro: '🇷🇴',
  bg: '🇧🇬',
  el: '🇬🇷',
  sr: '🇷🇸',
  hr: '🇭🇷',
  sk: '🇸🇰',
  sl: '🇸🇮',
  lt: '🇱🇹',
  lv: '🇱🇻',
  et: '🇪🇪',
  
  // Asian languages
  vi: '🇻🇳',
  th: '🇹🇭',
  id: '🇮🇩',
  ms: '🇲🇾',
  fil: '🇵🇭',
  tl: '🇵🇭',
  hi: '🇮🇳',
  bn: '🇧🇩',
  my: '🇲🇲',
  mn: '🇲🇳',
  ne: '🇳🇵',
  si: '🇱🇰',
  km: '🇰🇭',
  lo: '🇱🇦',
  
  // Middle Eastern languages
  ar: '🇸🇦',
  tr: '🇹🇷',
  he: '🇮🇱',
  fa: '🇮🇷',
  
  // Other
  la: '🏛️',
  eo: '🌍',
};

export const LANGUAGE_NAMES = {
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  'zh-hk': 'Chinese (HK)',
  'zh-tw': 'Chinese (TW)',
  'zh-ro': 'Chinese (Romanized)',
  es: 'Spanish',
  'es-la': 'Spanish (LATAM)',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-br': 'Portuguese (BR)',
  ru: 'Russian',
  pl: 'Polish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ar: 'Arabic',
  tr: 'Turkish',
  nl: 'Dutch',
  sv: 'Swedish',
  fil: 'Filipino',
  tl: 'Tagalog',
  ms: 'Malay',
  hi: 'Hindi',
  uk: 'Ukrainian',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  bg: 'Bulgarian',
  he: 'Hebrew',
  fa: 'Persian',
  bn: 'Bengali',
  my: 'Burmese',
  mn: 'Mongolian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  et: 'Estonian',
  el: 'Greek',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  sr: 'Serbian',
  hr: 'Croatian',
  sk: 'Slovak',
  sl: 'Slovenian',
  ne: 'Nepali',
  si: 'Sinhala',
  km: 'Khmer',
  lo: 'Lao',
  la: 'Latin',
  eo: 'Esperanto',
};

/**
 * Get flag emoji for a language code
 * @param {string} langCode - ISO language code (e.g., 'en', 'ja', 'pt-br')
 * @returns {string} Flag emoji or globe emoji as fallback
 */
export function getLanguageFlag(langCode) {
  if (!langCode) return '🌐';
  const code = langCode.toLowerCase();
  return LANGUAGE_FLAGS[code] || '🌐';
}

/**
 * Get language name for a language code
 * @param {string} langCode - ISO language code
 * @returns {string} Language name or uppercase code as fallback
 */
export function getLanguageName(langCode) {
  if (!langCode) return 'Unknown';
  const code = langCode.toLowerCase();
  return LANGUAGE_NAMES[code] || langCode.toUpperCase();
}

/**
 * Get formatted language display string with flag and name
 * @param {string} langCode - ISO language code
 * @returns {string} Formatted string like "🇬🇧 English"
 */
export function getLanguageDisplay(langCode) {
  return `${getLanguageFlag(langCode)} ${getLanguageName(langCode)}`;
}

/**
 * Legacy LANGUAGES object for backward compatibility
 * Maps language code to "flag name" format
 */
export const LANGUAGES = Object.fromEntries(
  Object.keys(LANGUAGE_NAMES).map(code => [
    code,
    getLanguageDisplay(code)
  ])
);

export default {
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  LANGUAGES,
  getLanguageFlag,
  getLanguageName,
  getLanguageDisplay,
};
