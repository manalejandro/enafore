import { getAccount } from '../_api/user.js'
import { getRelationship } from '../_api/relationships.js'
import { database } from '../_database/database.js'
import { store } from '../_store/store.js'

// Tracks the last time updateLocalRelationship was called (follow/unfollow/block/etc).
// Used to avoid stale background fetches overwriting a freshly-set relationship.
let lastManualRelationshipUpdate = 0

async function _updateAccount (accountId, instanceName, accessToken) {
  const localPromise = database.getAccount(instanceName, accountId)
  const remotePromise = getAccount(instanceName, accessToken, accountId).then(account => {
    /* no await */ database.setAccount(instanceName, account)
    return account
  })

  try {
    store.set({ currentAccountProfile: (await localPromise) })
  } catch (e) {
    console.error(e)
  }
  try {
    store.set({ currentAccountProfile: (await remotePromise) })
  } catch (e) {
    console.error(e)
  }
}

async function _updateRelationship (accountId, instanceName, accessToken) {
  const fetchStartedAt = Date.now()
  const localPromise = database.getRelationship(instanceName, accountId)
  const remotePromise = getRelationship(instanceName, accessToken, accountId).then(relationship => {
    if (relationship) {
      /* no await */ database.setRelationship(instanceName, relationship)
      return relationship
    }
  })
  try {
    const localResult = await localPromise
    if (lastManualRelationshipUpdate < fetchStartedAt) {
      store.set({ currentAccountRelationship: localResult })
    }
  } catch (e) {
    console.error(e)
  }
  try {
    const remoteResult = await remotePromise
    if (lastManualRelationshipUpdate < fetchStartedAt) {
      store.set({ currentAccountRelationship: remoteResult })
    }
  } catch (e) {
    console.error(e)
  }
}

export async function updateLocalRelationship (instanceName, accountId, relationship) {
  lastManualRelationshipUpdate = Date.now()
  await database.setRelationship(instanceName, relationship)
  try {
    store.set({ currentAccountRelationship: relationship })
  } catch (e) {
    console.error(e)
  }
}

export async function clearProfileAndRelationship () {
  store.set({
    currentAccountProfile: null,
    currentAccountRelationship: null
  })
}

export async function updateProfileAndRelationship (accountId) {
  const { currentInstance, accessToken } = store.get()

  await clearProfileAndRelationship()
  await Promise.all([
    _updateAccount(accountId, currentInstance, accessToken),
    _updateRelationship(accountId, currentInstance, accessToken)
  ])
}

export async function updateRelationship (accountId) {
  const { currentInstance, accessToken } = store.get()

  await clearProfileAndRelationship()
  await _updateRelationship(accountId, currentInstance, accessToken)
}
