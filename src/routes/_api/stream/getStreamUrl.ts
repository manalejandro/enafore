import { paramsString } from '../../_utils/ajax.js'

function getStreamName(timeline: string): string {
  switch (timeline) {
    case 'local':
      return 'public:local'
    case 'federated':
      return 'public'
    case 'home':
      return 'user'
    case 'notifications':
      return 'user:notification'
    case 'direct':
      return 'direct'
  }
  if (timeline.startsWith('tag/')) {
    return 'hashtag'
  }
  if (timeline.startsWith('list/')) {
    return 'list'
  }
  throw new Error('unknown stream ' + timeline)
}

export function getStreamUrl(
  streamingApi: string,
  accessToken: string,
  timeline: string,
): string {
  const url = `${streamingApi}/api/v1/streaming`
  const streamName = getStreamName(timeline)

  const params: {
    stream: string
    tag?: string
    list?: string
    access_token?: string
  } = {
    stream: streamName,
  }

  if (timeline.startsWith('tag/')) {
    params.tag = timeline.split('/').slice(-1)[0]
  } else if (timeline.startsWith('list/')) {
    params.list = timeline.split('/').slice(-1)[0]
  }

  if (accessToken) {
    params.access_token = accessToken
    console.log(`Building WebSocket URL for stream '${streamName}':`)
    console.log(`  - API: ${streamingApi}`)
    console.log(
      `  - Token: ${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 4)} (${accessToken.length} chars)`,
    )
  } else {
    console.warn(
      'getStreamUrl: No access token provided - connection will likely fail',
    )
  }

  const finalUrl = url + '?' + paramsString(params)
  console.log(
    `  - Full URL: ${finalUrl.replace(/access_token=[^&]+/, 'access_token=***')}`,
  )

  return finalUrl
}
