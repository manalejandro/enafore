import { TimelineStream } from '../../_api/stream/TimelineStream.js'
import { processMessage } from './processMessage.js'
import { fillStreamingGap } from './fillStreamingGap.js'
import { store } from '../../_store/store.js'
import { verifyStreamAccess } from '../../_api/stream/verifyStreamAccess.js'

export function createStream (api, instanceName, accessToken, timelineName, firstStatusId, firstNotificationId) {
  console.log(`streaming ${instanceName} ${timelineName}: createStream`, 'firstStatusId', firstStatusId,
    'firstNotificationId', firstNotificationId)

  // Verify token before attempting connection (async, but don't block)
  verifyStreamAccess(api, accessToken).then(result => {
    if (!result.valid) {
      console.error(`⚠ Token verification failed: ${result.error}`)
      console.error('The WebSocket connection may fail. Consider logging out and back in.')
    }
  })

  const fillGap = (timelineName, timelineItemId) => {
    if (timelineItemId) {
      console.log(`streaming ${instanceName} ${timelineName}: fillGap since`, timelineItemId)
      /* no await */ fillStreamingGap(instanceName, accessToken, timelineName, timelineItemId)
    }
  }

  const onMessage = message => {
    processMessage(instanceName, timelineName, message)
  }

  const onOpen = () => {
    console.log(`streaming ${instanceName} ${timelineName}: opened`)
    fillGap(timelineName, firstStatusId)
    if (timelineName === 'home') {
      // special case - home timeline stream also handles notifications
      fillGap('notifications', firstNotificationId)
    }
  }

  const onClose = () => {
    console.log(`streaming ${instanceName} ${timelineName}: closed`)
  }

  const onReconnect = () => {
    console.log(`streaming ${instanceName} ${timelineName}: reconnected`)
    // When reconnecting, we recompute the firstStatusId and firstNotificationId because these may have
    // changed since we first started streaming.
    const newFirstStatusId = store.getFirstTimelineItemId(instanceName, timelineName)
    fillGap(timelineName, newFirstStatusId)
    if (timelineName === 'home') {
      // special case - home timeline stream also handles notifications
      const newFirstNotificationId = store.getFirstTimelineItemId(instanceName, 'notifications')
      fillGap('notifications', newFirstNotificationId)
    }
  }

  const stream = new TimelineStream(api, accessToken, timelineName)
  stream.on('message', onMessage)
  stream.on('open', onOpen)
  stream.on('close', onClose)
  stream.on('reconnect', onReconnect)
  return stream
}
