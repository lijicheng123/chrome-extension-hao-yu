import Browser from 'webextension-polyfill'

import { API_CONFIG } from '../constants/api.js'

// 同步cookie到插件
async function syncCookie(changeInfo) {
  try {
    const { cookie } = changeInfo
    const baseUrl = API_CONFIG.ODOO_BASE_URL
    const urlObj = new URL(baseUrl)
    const domainUrl = `${urlObj.protocol}//${urlObj.hostname}${
      urlObj.port ? ':' + urlObj.port : ''
    }`

    // 确保cookie域与Odoo域匹配（考虑端口）
    // cookie.domain可能带前导点，如 .localhost，需要处理这种情况
    const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain
    // 仅检查域名是否包含目标域名，因为cookie可能是设置在父域上的
    if (!cookieDomain.includes(urlObj.hostname) && !urlObj.hostname.includes(cookieDomain)) {
      return
    }

    // 设置cookie
    await Browser.cookies.set({
      url: domainUrl + (cookie.path || '/'),
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
  // Browser.cookies.onChanged.addListener(syncCookie)
}

// 初始化时同步所有已存在的cookies
async function initializeCookies() {
  try {
    const baseUrl = API_CONFIG.ODOO_BASE_URL
    const urlObj = new URL(baseUrl)
    debugger

    // 使用完整URL（包括域名和端口）
    const cookies = await Browser.cookies.getAll({
      url: `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`,
    })

    for (const cookie of cookies) {
      await syncCookie({ cookie, cause: 'initial', removed: false })
    }
    console.log('Initial cookies sync completed')
  } catch (error) {
    console.error('Error during initial cookies sync:', error)
  }
}

// 通过插件清除cookie
export async function clearCookies() {
  try {
    // 获取基础URL，保留完整的域名和端口
    const baseUrl = API_CONFIG.ODOO_BASE_URL
    const urlObj = new URL(baseUrl)
    const domainUrl = `${urlObj.protocol}//${urlObj.hostname}${
      urlObj.port ? ':' + urlObj.port : ''
    }`

    // 获取所有与该域名（包括端口）相关的 Cookie
    const cookies = await Browser.cookies.getAll({
      url: domainUrl,
    })
    console.log(`cookiescookiescookiescookies:`, cookies)
    // 如果没有找到任何 Cookie，则直接返回
    if (cookies.length === 0) {
      console.log(`域名 ${domainUrl} 下没有找到任何cookie`)
      return true
    }

    // 逐一删除每个 Cookie
    for (const cookie of cookies) {
      await Browser.cookies.remove({
        url: domainUrl + (cookie.path || '/'),
        name: cookie.name, // 必须指定 name 参数
      })
      console.log(`已清除 Cookie: ${cookie.name}`)
    }

    console.log(`已清除域名 ${domainUrl} 下的所有cookie`)
    return true
  } catch (error) {
    console.error('清除cookie失败:', error)
    return false
  }
}

export const registerCookieListener = async () => {
  await initializeCookies()
  setupCookieListener()
}
