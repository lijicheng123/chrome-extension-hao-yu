import { apiClient } from '../services/messaging/api'

/**
 * @param {RequestInfo|URL} input
 * @param {RequestInit=} init
 * @returns {Promise<Response>}
 */
export function fetchBg(input, init) {
  return apiClient.fetchBg(input, init)
}
