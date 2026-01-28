/**
 * Verify that the access token works with the streaming API
 * by making a test HTTP request before attempting WebSocket connection
 */
export async function verifyStreamAccess (streamingApi, accessToken) {
  if (!accessToken) {
    console.warn('verifyStreamAccess: No access token provided')
    return { valid: false, error: 'No access token' }
  }

  try {
    // Make a test request to verify credentials
    // Note: Some servers might not support this endpoint, so we catch errors
    const url = `${streamingApi}/api/v1/streaming/health`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (response.ok) {
      console.log('✓ Streaming access verified')
      return { valid: true }
    } else if (response.status === 401) {
      console.error('✗ Access token rejected by streaming server (401)')
      return { valid: false, error: 'Token rejected', status: 401 }
    } else if (response.status === 404) {
      // Health endpoint might not exist, try to proceed anyway
      console.log('Health endpoint not found, proceeding with WebSocket connection')
      return { valid: true, note: 'Health check unavailable' }
    } else {
      console.warn(`Streaming health check returned ${response.status}`)
      return { valid: true, note: `Unexpected status: ${response.status}` }
    }
  } catch (error) {
    // If health check fails, we still try the WebSocket
    console.log('Could not verify streaming access (health check failed), proceeding anyway:', error.message)
    return { valid: true, note: 'Health check failed, attempting connection' }
  }
}
