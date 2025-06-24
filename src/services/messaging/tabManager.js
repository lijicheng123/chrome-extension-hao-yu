import { MessagingService } from './index'
import Browser from 'webextension-polyfill'

/**
 * 标签页管理API常量
 */
export const TAB_MANAGER_API = {
  CLOSE_NON_GOOGLE_SEARCH_TABS: 'CLOSE_NON_GOOGLE_SEARCH_TABS',
  GET_TAB_COUNT: 'GET_TAB_COUNT',
  CHECK_SINGLE_TAB: 'CHECK_SINGLE_TAB',
  OPEN_TAB_BY_BACKGROUND: 'OPEN_TAB_BY_BACKGROUND',
  GET_CURRENT_PAGE_TAB_INFO: 'GET_CURRENT_PAGE_TAB_INFO',
  SEND_TO_SERP_MESSAGE: 'SEND_TO_SERP_MESSAGE',
  SEND_RAW_MESSAGE_TO_TAB: 'SEND_RAW_MESSAGE_TO_TAB',
  LISTEN_LANDING_PAGE_MESSAGE: 'LISTEN_LANDING_PAGE_MESSAGE'
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
   * @param {Object} options 选项
   * @param {Object} options.serpMessage 关闭后要发送给SERP的消息
   * @returns {Promise<Object>} 操作结果
   */
  static async closeNonGoogleSearchTabs(options = {}) {
    try {
      return await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.CLOSE_NON_GOOGLE_SEARCH_TABS,
        options
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

  /**
   * 通过background打开标签页
   * @param {Object} options 选项
   * @param {string} options.url 目标URL
   * @param {number} options.pageDepth 页面深度
   * @param {number} options.timestamp 时间戳
   * @param {Object} options.extraData 额外数据
   * @returns {Promise<Object>} 打开结果 {success, tabId}
   */
  static async openTabByBackground(options) {
    try {
      return await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.OPEN_TAB_BY_BACKGROUND,
        options
      )
    } catch (error) {
      console.error('通过background打开标签页失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取当前页面的TabID和页面深度信息
   * @returns {Promise<Object>} 页面信息 {tabId, pageDepth, timestamp, extraData}
   */
  static async getCurrentPageTabInfo() {
    try {
      return await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.GET_CURRENT_PAGE_TAB_INFO
      )
    } catch (error) {
      console.error('获取当前页面Tab信息失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 发送消息到SERP页面
   * @param {Object} messageData 消息数据
   * @param {string} messageData.action 动作类型
   * @param {Object} messageData.data 消息数据
   * @returns {Promise<Object>} 发送结果
   */
  static async sendToSERPMessage(messageData) {
    try {
      return await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.SEND_TO_SERP_MESSAGE,
        messageData
      )
    } catch (error) {
      console.error('发送SERP消息失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 向指定标签页发送原始消息（不经过tab-manager命名空间）
   * @param {number} tabId 目标标签页ID
   * @param {Object} message 原始消息对象
   * @returns {Promise<Object>} 发送结果
   */
  static async sendRawMessageToTab(tabId, message) {
    try {
      return await tabManagerService.sendMessageWithResponse(
        TAB_MANAGER_API.SEND_RAW_MESSAGE_TO_TAB,
        { tabId, message }
      )
    } catch (error) {
      console.error('发送原始消息失败:', error)
      return { success: false, error: error.message }
    }
  }


}

/**
 * 标签页管理 Background 处理器
 * 在 background script 中运行
 */
export class TabManagerBackgroundHandlers {
  // 存储标签页信息的内存缓存
  static tabInfoCache = new Map() // tabId -> {pageDepth, timestamp, extraData}
  
  // 存储SERP页面的TabID
  static serpTabId = null

  /**
   * 关闭非Google搜索结果页的标签页
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<Object>} 操作结果
   */
  static async handleCloseNonGoogleSearchTabs(options = {}, sender) {
    console.log('开始关闭非Google搜索标签页', options)
    
    try {
      // 获取所有标签页
      const tabs = await Browser.tabs.query({})
      
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
      } else {
        // 因为没有谷歌搜索页面就不关闭标签页了
        return {
          success: true,
          closedCount: 0,
          remainingCount: tabs.length
        }
      }
      
      for (const tab of tabs) {
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
      
      // 清空内存缓存
      TabManagerBackgroundHandlers.tabInfoCache.clear()
      TabManagerBackgroundHandlers.serpTabId = null
      console.log('已清空标签页信息缓存和SERP TabID')
      
      // 如果有SERP消息，先设置SERP TabID再发送消息
      if (options.serpMessage && googleSearchTab) {
        console.log('检测到SERP消息，恢复SERP TabID并发送消息')
        TabManagerBackgroundHandlers.serpTabId = googleSearchTab.id
        
        try {
          const result = await TabManagerBackgroundHandlers.handleSendToSERPMessage(options.serpMessage, sender)
          console.log('SERP消息发送结果:', result)
        } catch (error) {
          console.error('发送SERP消息失败:', error)
        }
      }
      
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
   * 通过background打开标签页
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<Object>} 打开结果
   */
  static async handleOpenTabByBackground(data, sender) {
    console.log('通过background打开标签页:', data)
    
    try {
      const { url, pageDepth, timestamp, extraData } = data
      
      if (!url) {
        throw new Error('URL不能为空')
      }
      
      // 创建新标签页
      const newTab = await Browser.tabs.create({
        url,
        active: true  // 默认不激活
      })
      
      console.log('新标签页已创建:', newTab.id)
      
      // 存储标签页信息到内存缓存
      TabManagerBackgroundHandlers.tabInfoCache.set(newTab.id, {
        pageDepth: pageDepth || 1,
        timestamp: timestamp || Date.now(),
        extraData: extraData || {}
      })
      
      return {
        success: true,
        tabId: newTab.id
      }
    } catch (error) {
      console.error('创建标签页失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取当前页面的TabID和页面深度信息
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<Object>} 页面信息
   */
  static async handleGetCurrentPageTabInfo(data, sender) {
    console.log('获取当前页面Tab信息:', { senderId: sender?.tab?.id })
    
    try {
      const tabId = sender?.tab?.id
      
      if (!tabId) {
        throw new Error('无法获取当前标签页ID')
      }
      
      // 从内存缓存中获取信息
      const tabInfo = TabManagerBackgroundHandlers.tabInfoCache.get(tabId)
      
      if (tabInfo) {
        return {
          success: true,
          tabId,
          pageDepth: tabInfo.pageDepth,
          timestamp: tabInfo.timestamp,
          extraData: tabInfo.extraData
        }
      } else {
        return {
          success: false,
          message: '未找到标签页信息'
        }
      }
    } catch (error) {
      console.error('获取页面Tab信息失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 发送消息到SERP页面
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<Object>} 发送结果
   */
  static async handleSendToSERPMessage(data, sender) {
    console.log('========== Background处理发送到SERP消息开始 ==========')
    console.log('接收的data:', data)
    console.log('sender:', sender)
    
    try {
      const { action, data: messageData } = data
      console.log('解析的action:', action)
      console.log('解析的messageData:', messageData)
      // 检查是否有缓存的SERP TabID
      if (!TabManagerBackgroundHandlers.serpTabId) {
        console.warn('没有找到SERP TabID，无法发送消息')
        return {
          success: false,
          error: 'SERP TabID not found'
        }
      }
      
      console.log('使用的SERP TabID:', TabManagerBackgroundHandlers.serpTabId)
      
      // 构造LANDING_PAGE_MESSAGE格式的消息
      const message = {
        type: 'LANDING_PAGE_MESSAGE',
        action,
        data: messageData,
        timestamp: Date.now()
      }
      
      console.log('构造的最终消息:', message)
      console.log('准备发送到TabID:', TabManagerBackgroundHandlers.serpTabId)
      
      // 通过统一的原始消息发送方法
      const result = await TabManagerBackgroundHandlers.handleSendRawMessageToTab({
        tabId: TabManagerBackgroundHandlers.serpTabId,
        message
      }, sender)
      
      console.log('发送结果:', result)
      console.log('========== Background处理发送到SERP消息结束 ==========')
      return result
      
    } catch (error) {
      console.error('发送SERP消息失败:', error)
      console.log('========== Background处理发送到SERP消息结束(异常) ==========')
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 向指定标签页发送原始消息
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<Object>} 发送结果
   */
  static async handleSendRawMessageToTab(data, sender) {
    console.log('处理发送原始消息到标签页:', data)
    
    try {
      const { tabId, message } = data
      
      if (!tabId) {
        throw new Error('TabID不能为空')
      }
      
      if (!message) {
        throw new Error('消息内容不能为空')
      }
      
      // 向指定标签页发送原始消息
      try {
        await Browser.tabs.sendMessage(tabId, message)
        
        console.log(`原始消息已发送到标签页 ${tabId}`)
        return {
          success: true,
          tabId
        }
      } catch (error) {
        console.error(`向标签页 ${tabId} 发送原始消息失败:`, error)
        return {
          success: false,
          error: error.message
        }
      }
    } catch (error) {
      console.error('发送原始消息失败:', error)
      return {
        success: false,
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
      [TAB_MANAGER_API.CHECK_SINGLE_TAB]: TabManagerBackgroundHandlers.handleCheckSingleTab,
      [TAB_MANAGER_API.OPEN_TAB_BY_BACKGROUND]: TabManagerBackgroundHandlers.handleOpenTabByBackground,
      [TAB_MANAGER_API.GET_CURRENT_PAGE_TAB_INFO]: TabManagerBackgroundHandlers.handleGetCurrentPageTabInfo,
      [TAB_MANAGER_API.SEND_TO_SERP_MESSAGE]: TabManagerBackgroundHandlers.handleSendToSERPMessage,
      [TAB_MANAGER_API.SEND_RAW_MESSAGE_TO_TAB]: TabManagerBackgroundHandlers.handleSendRawMessageToTab
    })
    
    console.log('标签页管理处理器已注册')
  }
}

export default tabManagerService 