import Browser from 'webextension-polyfill'
import { AUTOMATION_STORAGE_KEYS, AUTOMATION_STATUS, EVENT_TYPES, ACTION_TYPES, AUTOMATION_CONFIG } from '../constants/automationConfig'

/**
 * 自动化状态管理器 - 事件驱动架构
 * 负责管理所有自动化状态，支持页面刷新后的状态恢复
 */
export class AutomationStateManager {
  constructor() {
    this.currentState = null
    this.isInitialized = false
    this.logPrefix = '[AutomationStateManager]'
  }

  /**
   * 初始化状态管理器
   */
  async initialize(options = {}) {
    console.log(`${this.logPrefix} ========== 状态管理器初始化开始 ==========`)
    
    if (this.isInitialized) {
      console.log(`${this.logPrefix} ✓ 已经初始化过，跳过`)
      return
    }
    
    try {
      console.log(`${this.logPrefix} 开始加载状态...`)
      await this.loadState(options)
      this.isInitialized = true
      console.log(`${this.logPrefix} ✓ 状态管理器初始化完成`, {
        hasState: !!this.currentState,
        status: this.currentState?.status,
        keywordsCount: this.currentState?.keywords?.length || 0
      })
    } catch (error) {
      console.error(`${this.logPrefix} ❌ 初始化失败`, error)
    }
    
    console.log(`${this.logPrefix} ========== 状态管理器初始化结束 ==========`)
  }

  /**
   * 从storage加载状态
   */
  async loadState({keywords = []} = {}) {
    console.log(`${this.logPrefix} ========== 加载状态开始 ==========`)
    
    try {
      const result = await Browser.storage.local.get([AUTOMATION_STORAGE_KEYS.AUTOMATION_STATE])
      console.log(`${this.logPrefix} Storage读取结果:`, {
        hasKey: AUTOMATION_STORAGE_KEYS.AUTOMATION_STATE in result,
        storageData: result[AUTOMATION_STORAGE_KEYS.AUTOMATION_STATE] ? 'exists' : 'null'
      })
      
      this.currentState = result[AUTOMATION_STORAGE_KEYS.AUTOMATION_STATE] || null
      
      if (this.currentState) {
        console.log(`${this.logPrefix} ✓ 状态已加载`, {
          status: this.currentState.status,
          currentKeywordIndex: this.currentState.currentKeywordIndex,
          currentPage: this.currentState.currentPage,
          currentResultIndex: this.currentState.currentResultIndex,
          keywordsLength: this.currentState.keywords?.length || 0,
          serpResultsLength: this.currentState.currentSerpResults?.length || 0,
          totalResultsCount: this.currentState.totalResultsCount || 0
        })
      } else {
        if (keywords?.length > 0) {
          this.currentState = this.createInitialState({ keywords })
        }
        console.log(`${this.logPrefix} ❌ 无现有状态`)
      }
    } catch (error) {
      console.error(`${this.logPrefix} ❌ 加载状态失败`, error)
      this.currentState = null
    }
    
    console.log(`${this.logPrefix} ========== 加载状态结束 ==========`)
  }

  /**
   * 保存状态到storage
   */
  async saveState() {
    try {
      if (this.currentState) {
        await Browser.storage.local.set({
          [AUTOMATION_STORAGE_KEYS.AUTOMATION_STATE]: this.currentState
        })
        console.log(`${this.logPrefix} 状态已保存`, {
          status: this.currentState.status,
          currentKeywordIndex: this.currentState.currentKeywordIndex,
          currentPage: this.currentState.currentPage,
          currentResultIndex: this.currentState.currentResultIndex,
          processedLinksCount: this.currentState.processedLinksCount
        })
      }
    } catch (error) {
      console.error(`${this.logPrefix} 保存状态失败`, error)
    }
  }

  /**
   * 创建初始状态
   */
  createInitialState(baseInfo) {
    const initialState = {
      // 基础信息
      taskId: baseInfo.taskId,
      keywords: baseInfo.keywords,
      totalKeywords: baseInfo.keywords.length,
      createdAt: Date.now(),
      
      // 当前状态
      status: AUTOMATION_STATUS.IDLE,
      currentKeywordIndex: 0,
      currentPage: 1,
      currentResultIndex: 0,
      
      // 计数信息
      processedLinksCount: 0,
      extractedInfoCount: 0,
      totalResultsCount: 0,
      
      // 时间信息
      lastUpdateTime: Date.now(),
      currentOperationStartTime: Date.now(),
      
      // 临时数据
      currentSerpResults: [],
      currentOperatingUrl: null,
      openedTabIds: [],
      
      // 配置信息
      serpLinkTimeout: AUTOMATION_CONFIG.SERP_LINK_TIMEOUT,
      landingPageTimeout: AUTOMATION_CONFIG.LANDING_PAGE_TIMEOUT,
      maxPagesPerKeyword: AUTOMATION_CONFIG.MAX_PAGES_PER_KEYWORD
    }
    
    console.log(`${this.logPrefix} 创建初始状态`, initialState)
    return initialState
  }

  /**
   * 更新状态
   */
  async updateState(updates) {
    if (!this.currentState) {
      console.warn(`${this.logPrefix} 尝试更新不存在的状态`)
      return
    }
    
    const oldStatus = this.currentState.status
    Object.assign(this.currentState, updates, {
      lastUpdateTime: Date.now()
    })
    
    await this.saveState()
    
    console.log(`${this.logPrefix} 状态已更新`, {
      from: oldStatus,
      to: this.currentState.status,
      updates
    })
  }

  /**
   * 处理事件并返回下一个动作
   */
  async handleEvent(eventType, eventData = {}) {
    console.log(`${this.logPrefix} ========== 处理事件开始: ${eventType} ==========`)
    console.log(`${this.logPrefix} 事件数据:`, eventData)
    console.log(`${this.logPrefix} 当前状态:`, {
      hasState: !!this.currentState,
      status: this.currentState?.status,
      isInitialized: this.isInitialized
    })
    
    // 确保状态已初始化
    if (!this.isInitialized) {
      console.log(`${this.logPrefix} 状态未初始化，开始初始化...`)
      await this.initialize()
    }
    
    let nextAction = null
    
    switch (eventType) {
      case EVENT_TYPES.USER_START:
        console.log(`${this.logPrefix} 处理用户开始事件...`)
        nextAction = await this.handleUserStart(eventData)
        break
        
      case EVENT_TYPES.USER_PAUSE:
        console.log(`${this.logPrefix} 处理用户暂停事件...`)
        nextAction = await this.handleUserPause()
        break
        
      case EVENT_TYPES.USER_RESUME:
        console.log(`${this.logPrefix} 处理用户恢复事件...`)
        nextAction = await this.handleUserResume()
        break
        
      case EVENT_TYPES.USER_STOP:
        console.log(`${this.logPrefix} 处理用户停止事件...`)
        nextAction = await this.handleUserStop()
        break
        
      case EVENT_TYPES.SERP_READY:
        console.log(`${this.logPrefix} 处理SERP准备就绪事件...`)
        nextAction = await this.handleSerpReady(eventData)
        break
        
      case EVENT_TYPES.LANDING_PROCESSED:
        console.log(`${this.logPrefix} 处理Landing页面处理完成事件...`)
        nextAction = await this.handleLandingProcessed(eventData)
        break
        
      case EVENT_TYPES.LANDING_TIMEOUT:
        console.log(`${this.logPrefix} 处理Landing页面超时事件...`)
        nextAction = await this.handleLandingTimeout(eventData)
        break
        
      default:
        console.warn(`${this.logPrefix} ❌ 未知事件类型: ${eventType}`)
    }
    
    console.log(`${this.logPrefix} ✓ 事件处理完成，下一个动作: ${nextAction}`)
    console.log(`${this.logPrefix} ========== 处理事件结束: ${eventType} ==========`)
    
    return nextAction
  }

  /**
   * 处理用户开始事件
   */
  async handleUserStart(eventData) {
    const { task, keywords } = eventData
    // 创建或重置状态
    this.currentState = this.createInitialState({ taskId: task?.id, keywords })
    this.currentState.status = AUTOMATION_STATUS.PROCESSING
    await this.saveState()
    
    console.log(`${this.logPrefix} 用户开始自动化`, { taskId: task?.id, keywordsCount: keywords.length })
    // 决策下一个动作
    return this.decideNextAction()
  }

  /**
   * 处理用户暂停事件
   */
  async handleUserPause() {
    if (!this.currentState) return ACTION_TYPES.CLEANUP
    
    await this.updateState({ status: AUTOMATION_STATUS.PAUSED })
    console.log(`${this.logPrefix} 用户暂停自动化`)
    
    return ACTION_TYPES.PAUSE_AUTOMATION
  }

  /**
   * 处理用户恢复事件
   */
  async handleUserResume() {
    if (!this.currentState || this.currentState.status !== AUTOMATION_STATUS.PAUSED) {
      return ACTION_TYPES.CLEANUP
    }
    
    await this.updateState({ status: AUTOMATION_STATUS.PROCESSING })
    console.log(`${this.logPrefix} 用户恢复自动化`)
    
    return this.decideNextAction()
  }

  /**
   * 处理用户停止事件
   */
  async handleUserStop() {
    if (this.currentState) {
      // 重置状态为初始状态，保留关键词列表但重置所有执行状态
      const resetState = {
        status: AUTOMATION_STATUS.IDLE,
        currentKeywordIndex: 0,
        currentPage: 1,
        currentResultIndex: 0,
        currentSerpResults: [],
        totalResultsCount: 0,
        processedLinksCount: 0,
        extractedInfoCount: 0,
        currentOperatingUrl: null,
        endTime: Date.now()
      }
      
      await this.updateState(resetState)
      console.log(`${this.logPrefix} 用户停止自动化，状态已重置为初始状态`)
    }
    
    return ACTION_TYPES.STOP_AUTOMATION
  }

  /**
   * 处理SERP准备就绪事件
   */
  async handleSerpReady(eventData) {
    console.log(`${this.logPrefix} ========== 处理SERP准备就绪事件开始 ==========`)
    
    if (!this.currentState) {
      console.log(`${this.logPrefix} ❌ 无当前状态 -> CLEANUP`)
      return ACTION_TYPES.CLEANUP
    }
    
    if (this.currentState.status !== AUTOMATION_STATUS.PROCESSING) {
      console.log(`${this.logPrefix} ❌ 状态不是PROCESSING (${this.currentState.status}) -> CLEANUP`)
      return ACTION_TYPES.CLEANUP
    }
    
    const { serpResults = [] } = eventData
    console.log(`${this.logPrefix} 接收到 ${serpResults.length} 个SERP结果`)
    
    console.log(`${this.logPrefix} 更新状态...`)
    await this.updateState({ 
      currentSerpResults: serpResults,
      totalResultsCount: serpResults.length,
      currentResultIndex: 0
    })
    
    console.log(`${this.logPrefix} ✓ SERP状态更新完成`)
    console.log(`${this.logPrefix} 开始决策下一个动作...`)
    
    const nextAction = this.decideNextAction()
    console.log(`${this.logPrefix} ========== 处理SERP准备就绪事件结束 ==========`)
    
    return nextAction
  }

  /**
   * 处理Landing页面处理完成事件
   */
  async handleLandingProcessed(eventData) {
    if (!this.currentState || this.currentState.status !== AUTOMATION_STATUS.PROCESSING) {
      return ACTION_TYPES.CLEANUP
    }
    
    const { extractedData, targetUrl } = eventData
    
    // 更新统计信息
    const updates = {
      processedLinksCount: this.currentState.processedLinksCount + 1,
      currentResultIndex: this.currentState.currentResultIndex + 1,
      currentOperatingUrl: null
    }
    
    if (extractedData?.length) {
      updates.extractedInfoCount = this.currentState.extractedInfoCount + extractedData?.length
    }
    
    await this.updateState(updates)
    
    console.log(`${this.logPrefix} Landing页面处理完成`, { 
      targetUrl, 
      extractedData: !!extractedData,
      processedCount: updates.processedLinksCount
    })
    
    return this.decideNextAction()
  }

  /**
   * 处理Landing页面超时事件
   */
  async handleLandingTimeout(eventData) {
    if (!this.currentState || this.currentState.status !== AUTOMATION_STATUS.PROCESSING) {
      return ACTION_TYPES.CLEANUP
    }
    
    const { targetUrl } = eventData
    
    // 更新统计信息（超时也算处理完成）
    await this.updateState({
      processedLinksCount: this.currentState.processedLinksCount + 1,
      currentResultIndex: this.currentState.currentResultIndex + 1,
      currentOperatingUrl: null
    })
    
    console.log(`${this.logPrefix} Landing页面超时`, { targetUrl })
    
    return this.decideNextAction()
  }

  /**
   * 决策引擎 - 根据当前状态决定下一个动作
   */
  decideNextAction() {
    console.log(`${this.logPrefix} ========== 决策引擎开始 ==========`)
    
    if (!this.currentState) {
      console.log(`${this.logPrefix} ❌ 决策: 无状态 -> CLEANUP`)
      return ACTION_TYPES.CLEANUP
    }

    const state = this.currentState
    console.log(`${this.logPrefix} 决策引擎分析当前状态:`, {
      status: state.status,
      currentKeywordIndex: state.currentKeywordIndex,
      totalKeywords: state.totalKeywords,
      currentResultIndex: state.currentResultIndex,
      totalResults: state.totalResultsCount,
      currentPage: state.currentPage,
      maxPages: state.maxPagesPerKeyword,
      hasSerpResults: !!(state.currentSerpResults && state.currentSerpResults.length > 0),
      serpResultsLength: state.currentSerpResults?.length || 0
    })

    // 1. 检查是否暂停
    if (state.status === AUTOMATION_STATUS.PAUSED) {
      console.log(`${this.logPrefix} ✓ 决策: 暂停状态 -> WAIT_CAPTCHA`)
      return ACTION_TYPES.WAIT_CAPTCHA
    }

    // 2. 检查是否完成
    if (state.status === AUTOMATION_STATUS.COMPLETED) {
      console.log(`${this.logPrefix} ✓ 决策: 已完成 -> SHOW_RESULTS`)
      return ACTION_TYPES.SHOW_RESULTS
    }

    // 3. 检查是否需要搜索新关键词（只有在没有SERP结果时才搜索）
    if (!state.currentSerpResults || state.currentSerpResults.length === 0) {
      console.log(`${this.logPrefix} ✓ 决策: 无SERP结果，需要搜索关键词 -> SEARCH_KEYWORD`)
      return ACTION_TYPES.SEARCH_KEYWORD
    }

    // 4. 检查是否有更多结果要处理
    if (state.currentResultIndex < state.totalResultsCount) {
      console.log(`${this.logPrefix} ✓ 决策: 有更多结果要处理 (${state.currentResultIndex}/${state.totalResultsCount}) -> OPEN_NEXT_LINK`)
      return ACTION_TYPES.OPEN_NEXT_LINK
    }

    // 5. 检查是否需要翻页
    if (state.currentPage < state.maxPagesPerKeyword) {
      console.log(`${this.logPrefix} ✓ 决策: 需要翻页 (${state.currentPage}/${state.maxPagesPerKeyword}) -> GO_NEXT_PAGE`)
      return ACTION_TYPES.GO_NEXT_PAGE
    }

    // 6. 检查是否需要切换关键词
    if (state.currentKeywordIndex < state.totalKeywords - 1) {
      console.log(`${this.logPrefix} ✓ 决策: 需要切换关键词 (${state.currentKeywordIndex + 1}/${state.totalKeywords}) -> SWITCH_KEYWORD`)
      return ACTION_TYPES.SWITCH_KEYWORD
    }

    // 7. 所有任务完成
    console.log(`${this.logPrefix} ✓ 决策: 所有任务完成 -> SHOW_RESULTS`)
    console.log(`${this.logPrefix} ========== 决策引擎结束 ==========`)
    return ACTION_TYPES.SHOW_RESULTS
  }

  /**
   * 处理翻页失败的情况
   * 当hasNextPage()返回false但decideNextAction()仍返回GO_NEXT_PAGE时调用
   */
  async handlePageEnd() {
    if (!this.currentState) return null
    
    console.log(`${this.logPrefix} 处理页面结束，强制切换关键词或完成任务`)
    
    // 强制切换到下一个关键词或完成任务
    if (this.currentState.currentKeywordIndex < this.currentState.totalKeywords - 1) {
      console.log(`${this.logPrefix} ✓ 强制切换关键词`)
      return ACTION_TYPES.SWITCH_KEYWORD
    } else {
      console.log(`${this.logPrefix} ✓ 所有关键词已完成`)
      return ACTION_TYPES.SHOW_RESULTS
    }
  }

  /**
   * 获取当前关键词
   */
  getCurrentKeyword() {
    if (!this.currentState || !this.currentState.keywords) return null
    return this.currentState.keywords[this.currentState.currentKeywordIndex] || null
  }

  /**
   * 移动到下一个关键词
   */
  async moveToNextKeyword() {
    if (!this.currentState) return null
    
    const newIndex = this.currentState.currentKeywordIndex + 1
    
    await this.updateState({
      currentKeywordIndex: newIndex,
      currentPage: 1,
      currentResultIndex: 0,
      currentSerpResults: [],
      totalResultsCount: 0
    })
    
    const newKeyword = this.getCurrentKeyword()
    console.log(`${this.logPrefix} 移动到下一个关键词,并返回搜索关键词`, { 
      newIndex: newIndex,
      keyword: newKeyword
    })
    
    // 确保有新关键词可以搜索
    if (newKeyword) {
      return ACTION_TYPES.SEARCH_KEYWORD
    } else {
      console.log(`${this.logPrefix} 没有更多关键词，任务完成`)
      return ACTION_TYPES.SHOW_RESULTS
    }
  }

  /**
   * 移动到下一页
   */
  async moveToNextPage() {
    if (!this.currentState) return
    
    await this.updateState({
      currentPage: this.currentState.currentPage + 1,
      currentResultIndex: 0,
      currentSerpResults: [],
      totalResultsCount: 0
    })
    
    console.log(`${this.logPrefix} 移动到下一页`, { 
      newPage: this.currentState.currentPage 
    })
  }

  /**
   * 设置当前操作的URL
   */
  async setCurrentOperatingUrl(url) {
    if (!this.currentState) return
    
    await this.updateState({ 
      currentOperatingUrl: url,
      currentOperationStartTime: Date.now()
    })
    
    console.log(`${this.logPrefix} 设置当前操作URL`, { url })
  }

  /**
   * 检查是否正在自动化
   */
  isAutomating() {
    if (!this.currentState) return false
    return this.currentState.status === AUTOMATION_STATUS.PROCESSING
  }

  /**
   * 检查是否暂停
   */
  isPaused() {
    return this.currentState?.status === AUTOMATION_STATUS.PAUSED
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this.currentState
  }

  /**
   * 清除状态
   */
  async clearState() {
    try {
      await Browser.storage.local.remove([AUTOMATION_STORAGE_KEYS.AUTOMATION_STATE])
      this.currentState = null
      console.log(`${this.logPrefix} 状态已清除`)
    } catch (error) {
      console.error(`${this.logPrefix} 清除状态失败`, error)
    }
  }
}

// 创建全局实例
export const automationStateManager = new AutomationStateManager() 