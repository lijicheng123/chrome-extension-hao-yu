import Browser from 'webextension-polyfill'
import { ApiBackgroundHandlers } from '../services/messaging/api'

// Storage key for user session info
const USER_SESSION_KEY = 'odoo_user_session'

/**
 * Fetches the current user session information from Odoo
 * @returns {Promise<Object>} User session data
 */
export async function fetchOdooUserSessionInfo() {
  try {
    console.log('Fetching Odoo user session info directly from background...')

    // 使用合并后的ApiBackgroundHandlers中的方法
    const sessionData = await ApiBackgroundHandlers.getOdooSessionInfo()

    if (!sessionData) {
      console.warn('No session data returned from Odoo')
      return null
    }

    // Store the session data
    await storeUserSessionInfo(sessionData)

    return sessionData
  } catch (error) {
    console.error('Error fetching Odoo user session info:', error)
    return null
  }
}

/**
 * Stores user session information in local storage
 * @param {Object} sessionData The session data to store
 */
async function storeUserSessionInfo(sessionData) {
  if (!sessionData) return

  try {
    await Browser.storage.local.set({ [USER_SESSION_KEY]: sessionData })
    console.log('Odoo user session info stored in local storage')
  } catch (error) {
    console.error('Error storing Odoo user session info:', error)
  }
}

/**
 * Gets the stored user session information
 * @returns {Promise<Object|null>} The stored session data or null if not available
 */
export async function getStoredUserSessionInfo() {
  try {
    const result = await Browser.storage.local.get(USER_SESSION_KEY)
    return result[USER_SESSION_KEY] || null
  } catch (error) {
    console.error('Error retrieving stored user session info:', error)
    return null
  }
}

/**
 * Clears stored user session information
 * @returns {Promise<void>}
 */
export async function clearUserSessionInfo() {
  try {
    await Browser.storage.local.remove(USER_SESSION_KEY)
    console.log('Odoo user session info cleared from storage')
  } catch (error) {
    console.error('Error clearing Odoo user session info:', error)
  }
}

/**
 *
 * Checks if the user is logged in by verifying stored session information
 * @returns {Promise<boolean>}
 */
export async function isUserLoggedIn() {
  const sessionInfo = await getStoredUserSessionInfo()
  return !!sessionInfo && !!sessionInfo.uid
}
