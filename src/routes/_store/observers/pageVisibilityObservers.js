export function pageVisibilityObservers (store) {
  if (!ENAFORE_IS_BROWSER) {
    return
  }

  document.addEventListener('visibilitychange', () => {
    const hidden = document.hidden
    store.set({ pageVisibilityHidden: hidden })

    if (!hidden) {
      // When the tab becomes visible again, fetch any posts that arrived while
      // the tab was backgrounded / the WebSocket was throttled.
      const { currentInstance, accessToken, currentTimeline, online } = store.get()
      if (online && currentInstance && currentTimeline &&
          !currentTimeline.startsWith('status/') &&
          !currentTimeline.startsWith('favorites') &&
          !currentTimeline.startsWith('bookmarks')) {
        const firstId = store.getFirstTimelineItemId(currentInstance, currentTimeline)
        if (firstId) {
          // Lazy import to avoid circular dependency: observers → actions → store → observers
          import('../../_actions/stream/fillStreamingGap.js').then(({ fillStreamingGap }) => {
            fillStreamingGap(currentInstance, accessToken, currentTimeline, firstId)
              .catch(e => console.warn('visibility gap-fill failed', e))
          })
        }
      }
    }
  })
}
