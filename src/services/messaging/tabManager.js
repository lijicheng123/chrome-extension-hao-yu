import { MessagingService } from './index'
import Browser from 'webextension-polyfill'

/**
 * 标签页管理API常量
 */
export const TAB_MANAGER_API = {
  CLOSE_NON_GOOGLE_SEARCH_TABS: 'CLOSE_NON_GOOGLE_SEARCH_TABS',
  GET_TAB_COUNT: 'GET_TAB_COUNT',
  CHECK_SINGLE_TAB: 'CHECK_SINGLE_TAB'
}

/**
 * 标签页管理服务实例
 */
const tabManagerService = new MessagingService('tab-manager')

/**
 * 标签页管理 Content API
 * 提供给 content script 使用的API
 */
export class TabManagerContentAPI {
  /**
   * 关闭所有非Google搜索结果页的标签页
   * @returns {Promise<Object>} 操作结果
   */
  static async closeNonGoogleSearchTabs() {
    try {
      return await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.CLOSE_NON_GOOGLE_SEARCH_TABS
      )
    } catch (error) {
      console.error('关闭非Google搜索标签页失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取当前标签页数量
   * @returns {Promise<number>} 标签页数量
   */
  static async getTabCount() {
    try {
      const result = await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.GET_TAB_COUNT
      )
      return result.count || 0
    } catch (error) {
      console.error('获取标签页数量失败:', error)
      return 0
    }
  }

  /**
   * 检查是否只有一个标签页
   * @returns {Promise<Object>} 检查结果
   */
  static async checkSingleTab() {
    try {
      return await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.CHECK_SINGLE_TAB
      )
    } catch (error) {
      console.error('检查单标签页失败:', error)
      return { isSingle: false, count: 0 }
    }
  }
}

/**
 * 标签页管理 Background 处理器
 * 在 background script 中运行
 */
export class TabManagerBackgroundHandlers {
  /**
   * 关闭非Google搜索结果页的标签页
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<Object>} 操作结果
   */
  static async handleCloseNonGoogleSearchTabs(data, sender) {
    console.log('开始关闭非Google搜索标签页')
    
    try {
      // 获取所有标签页
      const tabs = await Browser.tabs.query({})
      const currentTabId = sender?.tab?.id
      
      
      let closedCount = 0
      const googleSearchDomains = [
        'google.com',
        'google.co.jp', 
        'google.co.uk',
        'google.de',
        'google.fr',
        'google.cn',
        'google.com.hk'
      ]

      // 找到谷歌搜索标签页，并激活
      const googleSearchTab = tabs.find(tab => {
        const url = new URL(tab.url)
        return googleSearchDomains.some(domain => 
          url.hostname === domain || url.hostname.endsWith('.' + domain)
        ) && url.pathname.includes('/search')
      })
      if (googleSearchTab) {
        await Browser.tabs.update(googleSearchTab.id, { active: true })
      }
      
      for (const tab of tabs) {
        // 跳过当前标签页
        // if (tab.id === currentTabId) continue
        
        try {
          const url = new URL(tab.url)
          const isGoogleSearch = googleSearchDomains.some(domain => 
            url.hostname === domain || url.hostname.endsWith('.' + domain)
          ) && url.pathname.includes('/search')
          
          // 如果不是Google搜索页面，则关闭
          if (!isGoogleSearch) {
            await Browser.tabs.remove(tab.id)
            closedCount++
            console.log(`已关闭标签页: ${tab.url}`)
          }
        } catch (urlError) {
          console.error('解析标签页URL失败:', tab.url, urlError)
          // 如果URL解析失败，也关闭该标签页（可能是特殊页面）
          try {
            await Browser.tabs.remove(tab.id)
            closedCount++
            console.log(`已关闭无效标签页: ${tab.url}`)
          } catch (removeError) {
            console.error('关闭标签页失败:', removeError)
          }
        }
      }
      
      console.log(`标签页清理完成，共关闭 ${closedCount} 个标签页`)
      return {
        success: true,
        closedCount,
        remainingCount: tabs.length - closedCount
      }
    } catch (error) {
      console.error('关闭非Google搜索标签页失败:', error)
      return {
        success: false,
        error: error.message,
        closedCount: 0
      }
    }
  }

  /**
   * 获取标签页数量
   * @returns {Promise<Object>} 标签页数量信息
   */
  static async handleGetTabCount() {
    try {
      const tabs = await Browser.tabs.query({})
      return {
        success: true,
        count: tabs.length
      }
    } catch (error) {
      console.error('获取标签页数量失败:', error)
      return {
        success: false,
        count: 0,
        error: error.message
      }
    }
  }

  /**
   * 检查是否只有一个标签页
   * @returns {Promise<Object>} 检查结果
   */
  static async handleCheckSingleTab() {
    try {
      const tabs = await Browser.tabs.query({})
      const count = tabs.length
      
      return {
        success: true,
        isSingle: count === 1,
        count,
        tabs: tabs.map(tab => ({
          id: tab.id,
          url: tab.url,
          title: tab.title
        }))
      }
    } catch (error) {
      console.error('检查单标签页失败:', error)
      return {
        success: false,
        isSingle: false,
        count: 0,
        error: error.message
      }
    }
  }

  /**
   * 注册所有标签页管理处理器
   */
  static registerHandlers() {
    tabManagerService.registerHandlers({
      [TAB_MANAGER_API.CLOSE_NON_GOOGLE_SEARCH_TABS]: TabManagerBackgroundHandlers.handleCloseNonGoogleSearchTabs,
      [TAB_MANAGER_API.GET_TAB_COUNT]: TabManagerBackgroundHandlers.handleGetTabCount,
      [TAB_MANAGER_API.CHECK_SINGLE_TAB]: TabManagerBackgroundHandlers.handleCheckSingleTab
    })
    
    console.log('标签页管理处理器已注册')
  }
}

export default tabManagerService 