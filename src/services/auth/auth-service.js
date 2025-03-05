import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { requestManager } from '../api/request'
import { API_CONFIG } from '../api/config'
import Browser from 'webextension-polyfill'

class AuthService {
  constructor() {
    this.deviceId = null
    this.initFingerprint()
  }

  async initFingerprint() {
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    this.deviceId = result.visitorId
  }

  async getToken() {
    return requestManager.token
  }

  async sendVerificationCode(email) {
    if (!this.deviceId) {
      await this.initFingerprint()
    }

    return requestManager.request(API_CONFIG.ENDPOINTS.AUTH.SEND_CODE, {
      method: 'POST',
      body: {
        login: email,
        device_id: this.deviceId,
      },
    })
  }

  async verifyAndLogin(email, code) {
    if (!this.deviceId) {
      await this.initFingerprint()
    }

    const response = await requestManager.request(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: {
        login: email,
        verification_code: parseInt(code),
        device_id: this.deviceId,
      },
    })

    if (response.success) {
      await requestManager.setToken(response.data.token)
    }

    return response
  }

  async logout() {
    await requestManager.clearToken()
  }

  // 检查登录状态
  async checkLoginStatus() {
    const token = await this.getToken()
    if (!token) {
      return false
    }

    try {
      // 可以添加一个验证token有效性的API调用
      await requestManager.request('/api/verify-token')
      return true
    } catch (error) {
      if (error.message === '需要登录') {
        Browser.runtime.sendMessage({ type: 'NEED_LOGIN' })
        return false
      }
      throw error
    }
  }

  // 重定向到登录页
  redirectToLogin(currentUrl) {
    const loginUrl = Browser.runtime.getURL('login.html')
    window.location.href = `${loginUrl}?redirect=${encodeURIComponent(currentUrl)}`
  }
}

export const authService = new AuthService()
