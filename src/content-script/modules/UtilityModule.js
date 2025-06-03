import { componentManager } from '../core/ComponentManager.js'
import { getUserConfig, setUserConfig, setAccessToken } from '../../config/index.mjs'
import { getChatGptAccessToken, registerPortListener } from '../../services/wrappers.mjs'
import { generateAnswersWithChatgptWebApi } from '../../services/apis/chatgpt-web.mjs'
import WebJumpBackNotification from '../../components/WebJumpBackNotification'
import { isUsingChatgptWebModel, chatgptWebModelKeys } from '../../config/index.mjs'

/**
 * 工具模块 - 单一职责：处理独立的工具功能
 * 高内聚：所有工具性功能都在这里
 * 低耦合：通过配置和事件与其他模块通信
 */
export class UtilityModule {
  constructor() {
    this.config = null
    this.portListener = null
    this.jumpBackContainer = null
    this.jumpBackComponentId = null
  }

  /**
   * 初始化工具模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    // 处理访问令牌覆盖 - 保持原有逻辑
    await this.overwriteAccessToken()
    
    // 准备前台请求处理 - 保持原有逻辑
    await this.prepareForForegroundRequests(config)
    
    // 准备跳转返回通知 - 保持原有逻辑
    await this.prepareForJumpBackNotification()
    
    console.log('UtilityModule initialized')
    
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    console.log('UtilityModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 覆盖访问令牌 - 完全保持原有业务逻辑
   */
  async overwriteAccessToken() {
    if (location.hostname !== 'chatgpt.com') {
      if (location.hostname === 'kimi.moonshot.cn') {
        setUserConfig({
          accessToken: await getClaudeSessionKey(),
        })
      }
      return
    }

    try {
      const userConfig = await getUserConfig()
      if (isUsingChatgptWebModel(userConfig.modelName)) {
        const accessToken = await getChatGptAccessToken()
        if (accessToken) {
          await setAccessToken(accessToken)
          console.log('ChatGPT accessToken set')
        }
      }
    } catch (e) {
      console.error('Failed to set ChatGPT accessToken', e)
    }
  }

  /**
   * 获取Claude会话密钥 - 保持原有逻辑
   * @returns {Promise<string>} 会话密钥
   */
  async getClaudeSessionKey() {
    // 这里应该实现具体的Claude会话密钥获取逻辑
    // 暂时返回空字符串
    return ''
  }

  /**
   * 准备前台请求处理 - 完全保持原有业务逻辑
   * @param {Object} config - 用户配置
   */
  async prepareForForegroundRequests(config) {
    // 这个方法只有在chatgpt.com页面才会执行，后面要考虑是否干掉
    if (location.hostname !== 'chatgpt.com') return

    const userConfig = config || (await getUserConfig())
    
    if (!chatgptWebModelKeys.includes(userConfig.modelName)) return

    let session
    this.portListener = (msg) => {
      if (msg.type === 'CHATGPT_TAB_CURRENT') {
        generateAnswersWithChatgptWebApi(session, msg.question, msg.conversationId, msg.messageId)
      }
    }

    registerPortListener(this.portListener)
  }

  /**
   * 准备跳转返回通知 - 完全保持原有业务逻辑
   */
  async prepareForJumpBackNotification() {
    // 检查URL参数中是否有跳转返回的标识
    const urlParams = new URLSearchParams(window.location.search)
    const fromChatGPTBox = urlParams.get('from_chatgptbox')
    
    if (fromChatGPTBox) {
      // 显示跳转返回通知
      this.showJumpBackNotification()
      
      // 清理URL参数
      const newUrl = new URL(window.location)
      newUrl.searchParams.delete('from_chatgptbox')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }

  /**
   * 显示跳转返回通知
   */
  showJumpBackNotification() {
    // 创建通知容器
    this.jumpBackContainer = document.createElement('div')
    this.jumpBackContainer.id = 'jump-back-notification-container'
    this.jumpBackContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999999;
      pointer-events: none;
    `
    
    document.body.appendChild(this.jumpBackContainer)
    
    this.jumpBackComponentId = 'jump-back-notification'
    
    const handleClose = () => {
      this.hideJumpBackNotification()
    }
    
    const component = (
      <WebJumpBackNotification onClose={handleClose} />
    )
    
    componentManager.renderComponent(
      this.jumpBackComponentId, 
      component, 
      this.jumpBackContainer
    )
    
    // 自动隐藏通知
    setTimeout(() => {
      this.hideJumpBackNotification()
    }, 5000)
  }

  /**
   * 隐藏跳转返回通知
   */
  hideJumpBackNotification() {
    if (this.jumpBackContainer) {
      this.jumpBackContainer.remove()
      this.jumpBackContainer = null
    }
    
    if (this.jumpBackComponentId) {
      componentManager.unmountComponent(this.jumpBackComponentId)
      this.jumpBackComponentId = null
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理端口监听器
    if (this.portListener) {
      // TODO: 实现端口监听器的移除逻辑
      this.portListener = null
    }
    
    // 清理跳转通知
    this.hideJumpBackNotification()
  }
}

/**
 * 获取Claude会话密钥的辅助函数
 * @returns {Promise<string>} 会话密钥
 */
async function getClaudeSessionKey() {
  // 这里应该实现具体的Claude会话密钥获取逻辑
  return ''
} 