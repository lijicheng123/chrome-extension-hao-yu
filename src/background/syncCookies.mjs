import Browser from 'webextension-polyfill'

import { API_CONFIG } from '../constants/api.js'

// 同步cookie到插件
async function syncCookie(changeInfo) {
  try {
    const { cookie } = changeInfo
    if (!cookie.domain.includes('localhost:8069')) {
      return
    }

    // 设置cookie
    await Browser.cookies.set({
      url: API_CONFIG.ODOO_BASE_URL,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate,
      domain: cookie.domain,
    })

    console.log(`Cookie ${cookie.name} synced successfully`)
  } catch (error) {
    console.error('Error syncing cookie:', error)
  }
}

// 监听cookie变化
function setupCookieListener() {
  Browser.cookies.onChanged.addListener(syncCookie)
}

// 初始化时同步所有已存在的cookies
async function initializeCookies() {
  try {
    const cookies = await Browser.cookies.getAll({
      url: API_CONFIG.ODOO_BASE_URL,
    })

    for (const cookie of cookies) {
      await syncCookie({ cookie, cause: 'initial', removed: false })
    }
    console.log('Initial cookies sync completed')
  } catch (error) {
    console.error('Error during initial cookies sync:', error)
  }
}

export const registerCookieListener = async () => {
  await initializeCookies()
  setupCookieListener()
}
