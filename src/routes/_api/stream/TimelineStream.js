import { WebSocketClient } from '../../_thirdparty/websocket/websocket.js'
import { lifecycle } from '../../_utils/lifecycle.ts'
import { getStreamUrl } from './getStreamUrl.ts'
import mitt from 'mitt'
import { eventBus } from '../../_utils/eventBus.ts'
import { safeParse } from '../../_utils/safeParse.js'

export class TimelineStream {
  constructor (streamingApi, accessToken, timeline) {
    Object.assign(this, mitt())
    this._streamingApi = streamingApi
    this._accessToken = accessToken
    this._timeline = timeline
    this._onStateChange = this._onStateChange.bind(this)
    this._onOnline = this._onOnline.bind(this)
    this._onOffline = this._onOffline.bind(this)
    this._onForcedOnlineStateChange = this._onForcedOnlineStateChange.bind(this)
    this._setupWebSocket()
    this._setupEvents()
  }

  close () {
    this._closed = true
    this._closeWebSocket()
    this._teardownEvents()
    for (const event of ['open', 'close', 'reconnect', 'message']) {
      this.off(event)
    }
  }

  _closeWebSocket () {
    if (this._ws) {
      this.emit('close')
      this._ws.onopen = null
      this._ws.onmessage = null
      this._ws.onclose = null
      this._ws.close()
      this._ws = null
    }
  }

  _setupWebSocket () {
    const url = getStreamUrl(this._streamingApi, this._accessToken, this._timeline)
    const ws = new WebSocketClient(url)

    ws.onopen = () => {
      if (!this._opened) {
        console.log(`✓ WebSocket opened successfully for timeline: ${this._timeline}`)
        this.emit('open')
        this._opened = true
      } else {
        // we may close or reopen websockets due to freeze/unfreeze events
        // and we want to fire "reconnect" rather than "open" in that case
        console.log(`✓ WebSocket reconnected successfully for timeline: ${this._timeline}`)
        this.emit('reconnect')
      }
    }
    ws.onerror = (e) => {
      console.error(`✗ WebSocket error for timeline ${this._timeline}:`, e)
      // Note: The actual error details are typically in the close event
    }
    ws.onclose = (e) => {
      const isAuthError = e.code === 1002 || e.code === 1006 || e.code === 1008 || e.code === 1011
      const logFn = isAuthError ? console.error : console.log

      logFn(`WebSocket closed for timeline ${this._timeline} - Code: ${e.code}, Reason: ${e.reason || 'none'}`)

      if (isAuthError) {
        console.error('⚠ Authentication error detected!')
        console.error('Possible causes:')
        console.error('  1. Access token is invalid or expired')
        console.error('  2. Server streaming configuration issue')
        console.error('  3. Token does not have required permissions')
        console.error('Try logging out and logging back in to refresh your token.')
      }

      this.emit('close')
    }
    ws.onmessage = (e) => this.emit('message', safeParse(e.data))
    // The ws "onreconnect" event seems unreliable. When the server goes down and comes back up,
    // it doesn't fire (but "open" does). When we freeze and unfreeze, it fires along with the
    // "open" event. The above is my attempt to normalize it.

    this._ws = ws
  }

  _setupEvents () {
    lifecycle.addEventListener('statechange', this._onStateChange)
    eventBus.on('forcedOnline', this._onForcedOnlineStateChange) // only happens in tests
    window.addEventListener('online', this._onOnline)
    window.addEventListener('offline', this._onOffline)
  }

  _teardownEvents () {
    lifecycle.removeEventListener('statechange', this._onStateChange)
    eventBus.off('forcedOnline', this._onForcedOnlineStateChange) // only happens in tests
    window.removeEventListener('online', this._onOnline)
    window.removeEventListener('offline', this._onOffline)
  }

  _pause () {
    if (this._closed) {
      return
    }
    this._closeWebSocket()
  }

  _unpause () {
    if (this._closed) {
      return
    }
    this._closeWebSocket()
    this._setupWebSocket()
  }

  _onStateChange (event) {
    // when the page enters or exits a frozen state, pause or resume websocket polling
    if (event.newState === 'frozen') { // page is frozen
      console.log('frozen')
      this._pause()
    } else if (event.oldState === 'frozen') { // page is unfrozen
      console.log('unfrozen')
      this._unpause()
    }
    if (event.newState === 'active') { // page is reopened from a background tab
      console.log('active')
      this._tryToReconnect()
    }
  }

  _onOnline () {
    console.log('online')
    this._unpause() // if we're not paused, then this is a no-op
    this._tryToReconnect() // to be safe, try to reset and reconnect
  }

  _onOffline () {
    console.log('offline')
    this._pause() // in testing, it seems to work better to stop polling when we get this event
  }

  _onForcedOnlineStateChange (online) {
    if (online) {
      console.log('online forced')
      this._unpause()
    } else {
      console.log('offline forced')
      this._pause()
    }
  }

  _tryToReconnect () {
    console.log('websocket readyState', this._ws && this._ws.readyState)
    if (this._ws && this._ws.readyState !== WebSocketClient.OPEN) {
      // if a websocket connection is not currently open, then reset the
      // backoff counter to ensure that fresh notifications come in faster
      this._ws.reset()
      this._ws.reconnect()
    }
  }
}
