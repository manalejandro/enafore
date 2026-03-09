import { importGoogleTranslate } from '../_utils/asyncModules/importGoogleTranslate.js'
import { importLibreTranslate } from '../_utils/asyncModules/importLibreTranslate.js'
import { store } from '../_store/store.js'
import escapeHtml from 'escape-html'
import { renderPostHTML } from '../_utils/renderPostHTML.ts'

async function translateWithEngine (html, to, from) {
  const { translationEngine, libreTranslateUrl, libreTranslateApiKey } = store.get()

  if (translationEngine === 'libretranslate' && libreTranslateUrl) {
    const { buildLibreTranslate } = await importLibreTranslate()
    const engine = buildLibreTranslate(libreTranslateUrl, libreTranslateApiKey || '')
    return {
      content: await engine.translate(html, to, from),
      sourceLanguageNames: engine.sourceLanguageNames
    }
  }

  // Default: Google Translate via SimplyTranslate proxy
  const { sourceLanguageNames, translate } = await importGoogleTranslate()
  return { content: await translate(html, to, from), sourceLanguageNames }
}

const defaultLanguage = process.env.LOCALE.split('-')[0]
export function translateStatus (
  status,
  currentInstance,
  to,
  from
) {
  if (to === undefined || to === null) {
    const { nativeLanguage } = store.get()
    to = nativeLanguage || defaultLanguage
  }
  if (from === undefined || from === null) {
    from = status.language || 'auto'
  }
  const id = currentInstance + '-' + status.id
  const {
    statusTranslations,
    statusTranslationContents,
    autoplayGifs
  } = store.get()
  statusTranslations[id] = statusTranslations[id] || {}
  statusTranslations[id].show = true
  if (
    !(
      statusTranslations[id].loading ||
      (statusTranslationContents[id] &&
        statusTranslations[id].to === to &&
        statusTranslations[id].from === from)
    )
  ) {
    statusTranslations[id].loading = true
    statusTranslations[id].error = false
    statusTranslations[id].to = to
    statusTranslations[id].from = from
    const emojis = new Map()
    if (status.emojis) {
      for (const emoji of status.emojis) {
        emojis.set(emoji.shortcode, emoji)
      }
    }
    translateWithEngine(
      (status.spoiler_text
        ? renderPostHTML({
          content: '<span class="spoiler_text">' +
            escapeHtml(status.spoiler_text) +
            '\n\n</span>',
          tags: status.tags,
          autoplayGifs,
          emojis
        })
        : '') + status.content,
      to,
      from
    )
      .then(({ content, sourceLanguageNames }) => {
        const { statusTranslations, statusTranslationContents } = store.get()
        statusTranslations[id].loading = false
        statusTranslations[id].sourceLanguageNames = sourceLanguageNames
        statusTranslationContents[id] = content
        store.set({ statusTranslations, statusTranslationContents })
      })
      .catch(err => {
        console.error('error translating status', err)
        const { statusTranslations, statusTranslationContents } = store.get()
        statusTranslations[id].loading = false
        statusTranslations[id].error = true
        delete statusTranslationContents[id]
        store.set({ statusTranslations, statusTranslationContents })
      })
  }
  store.set({ statusTranslations })
}
