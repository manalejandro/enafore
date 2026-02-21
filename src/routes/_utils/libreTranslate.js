/**
 * LibreTranslate integration.
 * Users can self-host a LibreTranslate instance (https://libretranslate.com)
 * or use a public server. An optional API key can be provided.
 */

import getGoogleTranslateHTML from './googleTranslateHTML.js'

/**
 * Minimal set of language codes that LibreTranslate supports.
 * These are the codes returned by GET /languages on a default LibreTranslate install.
 */
export const libreTranslateLanguageNames = {
  ar: 'Arabic',
  az: 'Azerbaijani',
  ca: 'Catalan',
  zh: 'Chinese',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  en: 'English',
  eo: 'Esperanto',
  fi: 'Finnish',
  fr: 'French',
  de: 'German',
  el: 'Greek',
  he: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  id: 'Indonesian',
  ga: 'Irish',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  lv: 'Latvian',
  lt: 'Lithuanian',
  ms: 'Malay',
  nb: 'Norwegian',
  fa: 'Persian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  sl: 'Slovenian',
  es: 'Spanish',
  sv: 'Swedish',
  tl: 'Filipino',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  vi: 'Vietnamese'
}

export const libreTranslateSourceLanguageNames = {
  ...libreTranslateLanguageNames,
  auto: 'Detect language'
}

/**
 * Build a translate function backed by the given LibreTranslate server URL and
 * an optional API key.
 */
export function buildLibreTranslate (serverUrl, apiKey) {
  const rawTranslate = async function translate (text, to, from) {
    const normalizedFrom = from === 'auto' ? 'auto' : from
    const body = { q: text, source: normalizedFrom, target: to, format: 'html' }
    if (apiKey) {
      body.api_key = apiKey
    }

    const response = await fetch(`${serverUrl.replace(/\/$/, '')}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      throw new Error(`LibreTranslate error ${response.status}: ${errText}`)
    }

    const data = await response.json()
    if (!data.translatedText) {
      throw new Error('LibreTranslate returned an empty response')
    }

    return {
      text: data.translatedText,
      detected: data.detectedLanguage && data.detectedLanguage.language !== from
        ? data.detectedLanguage.language
        : null,
      to,
      from
    }
  }

  const htmlTranslate = getGoogleTranslateHTML(rawTranslate)

  return {
    translate: (html, to, from = 'auto') => htmlTranslate(html, to, from),
    sourceLanguageNames: libreTranslateSourceLanguageNames
  }
}
