import {
  getTaskKeywords
} from '../../../utils/keywords'
import { isGoogleSearchPage } from '../../../utils/platformDetector'
import {
  performSearch,
  getSearchResultLinks,
  markAllResultsAsPending,
  clearAllResultStyles,
  applyResultStyle,
  injectSerpResultStyles,
  hasNextPage,
  clickNextPage,
  clickSearchResultLink,
  checkAndHandleCaptcha,
  hasSearchResults,
  listenToPageMarkerChanges
} from '../utils/googleSearchAutomation'
import { 
  AUTOMATION_CONFIG, 
  RESULT_STATUS,
  AUTOMATION_STATUS,
  EVENT_TYPES,
  ACTION_TYPES,
  AUTOMATION_STORAGE_KEYS,
  PAGE_DEPTH,
  PAGE_MARKER_ACTION
} from '../constants/automationConfig'
import { automationStateManager } from '../utils/automationStateManager'
// import pageMarkerListener from '../utils/pageMarkerListener'
import Browser from 'webextension-polyfill'

// 获取谷歌搜索平台关键词配置
// const GOOGLE_SEARCH_CONFIG = getPlatformConfig('googleSearch')

/**
 * Google搜索自动化适配器 - 事件驱动架构
 * 负责处理Google搜索的自动化操作和事件触发
 */
class GoogleSearchAutomationAdapter {
  constructor() {
    this.logPrefix = '[GoogleSearchAutomationAdapter]'
    this.isExecutingAction = false
    this.currentTimeoutId = null
    this.pageMarkerListener = null // 页面标记监听器
  }

  /**
   * 获取存储键配置
   */
  getStorageKeys() {
    return {
      AUTOMATION_STATE: 'G_S_A_state',
      AUTOMATION_CONFIG: 'G_S_A_config',
      EXTRACTED_DATA: 'G_S_A_extracted_data',
      CURRENT_RESULTS: 'G_S_A_current_results',
      PAGE_MARKER: 'G_S_A_page_marker'
    }
  }

  /**
   * 初始化适配器
   */
  async initialize() {
    console.log(`${this.logPrefix} ========== 初始化适配器开始 ==========`)
    
    // 注入SERP结果样式
    injectSerpResultStyles()
    console.log(`${this.logPrefix} ✓ SERP结果样式已注入`)
    
    // // 确保页面监听器已启动
    // if (pageMarkerListener) {
    //   console.log(`${this.logPrefix} ✓ 页面监听器已启动`)
    // }
    const keywords = await this.getKeywordsList()
    // 初始化状态管理器
    console.log(`${this.logPrefix} 开始初始化状态管理器...`)
    await automationStateManager.initialize({ keywords })
    console.log(`${this.logPrefix} ✓ 状态管理器初始化完成`)
    
    // 初始化页面标记监听器
    this.initPageMarkerListener()
    
    // 如果在Google搜索页面且有恢复状态，触发页面就绪事件
    const isGoogleSearch = isGoogleSearchPage()
    console.log(`${this.logPrefix} 检查页面类型: isGoogleSearchPage = ${isGoogleSearch}`)
    
    if (isGoogleSearch) {
      console.log(`${this.logPrefix} 在Google搜索页面，触发页面就绪事件...`)
      await this.handlePageReady()
    } else {
      console.log(`${this.logPrefix} 不在Google搜索页面，跳过页面就绪处理`)
    }
    
    console.log(`${this.logPrefix} ========== 初始化适配器完成 ==========`)
  }

  /**
   * 初始化页面标记监听器
   */
  initPageMarkerListener() {
    console.log(`${this.logPrefix} 初始化页面标记监听器...`)
    
    // 监听页面标记变化，只关注发给SERP的消息
    this.pageMarkerListener = listenToPageMarkerChanges((newMarker, oldMarker) => {
      console.log(`${this.logPrefix} 页面标记变化检测:`, { newMarker, oldMarker })
      
      // 只处理发给SERP页面的标记
      if (newMarker && newMarker.to === PAGE_DEPTH.SERP) {
        this.handlePageMarkerChange(newMarker, oldMarker)
      }
    }, {
      to: PAGE_DEPTH.SERP // 只监听发给SERP的标记
    })
    
    console.log(`${this.logPrefix} ✓ 页面标记监听器已启动`)
  }

  /**
   * 处理页面标记变化
   */
  async handlePageMarkerChange(newMarker, oldMarker) {
    console.log(`${this.logPrefix} ========== 处理页面标记变化开始 ==========`)
    console.log(`${this.logPrefix} 新标记:`, newMarker)
    console.log(`${this.logPrefix} 旧标记:`, oldMarker)
    
    const state = automationStateManager.getState()
    if (!state || state.status !== AUTOMATION_STATUS.PROCESSING) {
      console.log(`${this.logPrefix} 当前不在处理状态，忽略页面标记变化`)
      return
    }
    
    // 清除当前的超时检测
    if (this.currentTimeoutId) {
      console.log(`${this.logPrefix} 清除超时检测`)
      clearTimeout(this.currentTimeoutId)
      this.currentTimeoutId = null
    }
    
    // const currentUrl = state.currentOperatingUrl
    // if (!currentUrl) {
    //   console.log(`${this.logPrefix} 当前没有正在操作的URL，忽略`)
    //   return
    // }
    
    // 检查是否是当前正在处理的URL的响应
    // if (newMarker.resultUrl !== currentUrl) {
    //   console.log(`${this.logPrefix} 标记URL与当前操作URL不匹配`, {
    //     markerUrl: newMarker.resultUrl,
    //     currentUrl
    //   })
    //   return
    // }
    
    console.log(`${this.logPrefix} 确认是当前URL的响应，开始处理...`)
    
    // 处理不同的动作
    switch (newMarker.action) {
      case PAGE_MARKER_ACTION.NEXT:
        console.log(`${this.logPrefix} LandingPage提取完成，处理下一个链接`)
        await this.handleLandingExtractComplete(newMarker)
        break
        
      default:
        console.log(`${this.logPrefix} 未知的页面标记动作: ${newMarker.action}`)
    }
    
    console.log(`${this.logPrefix} ========== 处理页面标记变化结束 ==========`)
  }

  /**
   * 处理LandingPage提取完成
   */
  async handleLandingExtractComplete(marker) {
    console.log(`${this.logPrefix} 处理LandingPage提取完成`, { marker })
    
    const extractedData = marker.data?.extractedData || null
    const targetUrl = marker.resultUrl
    
    // 获取当前索引，用于稍后更新样式
    const state = automationStateManager.getState()
    const currentIndexBeforeUpdate = state?.currentResultIndex || 0
    
    // 先触发Landing处理完成事件，更新状态（currentResultIndex会+1）
    const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.LANDING_PROCESSED, {
      extractedData,
      targetUrl
    })
    
    // 然后更新刚刚处理完成的结果的样式（使用更新前的索引）
    await this.updateResultStyleByIndex(currentIndexBeforeUpdate, RESULT_STATUS.COMPLETED)
    
    if (nextAction) {
      await this.executeAction(nextAction)
    }
  }

  /**
   * 根据指定索引更新结果样式
   */
  async updateResultStyleByIndex(index, status) {
    console.log(`${this.logPrefix} 更新索引 ${index} 的结果样式为: ${status}`)
    
    const state = automationStateManager.getState()
    const serpResults = state?.currentSerpResults || []
    
    if (index >= 0 && index < serpResults.length) {
      const result = serpResults[index]
      if (result && result.element) {
        applyResultStyle(result.element, status)
        console.log(`${this.logPrefix} ✓ 已更新结果 ${index} 的样式为: ${status}`)
      } else {
        console.log(`${this.logPrefix} ❌ 结果 ${index} 没有有效的element`)
      }
    } else {
      console.log(`${this.logPrefix} ❌ 索引 ${index} 超出范围 (总数: ${serpResults.length})`)
    }
  }

  /**
   * 处理页面就绪事件
   */
  async handlePageReady() {
    console.log(`${this.logPrefix} ========== 页面就绪事件开始 ==========`)
    
    const state = automationStateManager.getState()
    console.log(`${this.logPrefix} 获取当前状态:`, {
      hasState: !!state,
      status: state?.status,
      currentKeywordIndex: state?.currentKeywordIndex,
      currentPage: state?.currentPage,
      currentResultIndex: state?.currentResultIndex,
      serpResultsCount: state?.currentSerpResults?.length || 0,
      totalResultsCount: state?.totalResultsCount || 0
    })
    
    if (!state || !state.status || state.status === AUTOMATION_STATUS.IDLE) {
      console.log(`${this.logPrefix} ❌ 无自动化状态或处于空闲状态，结束处理`)
      return
    }

    console.log(`${this.logPrefix} ✓ 检测到有效的自动化状态，继续处理...`)

    // 检查验证码
    console.log(`${this.logPrefix} 检查验证码...`)
    const hasCaptcha = await checkAndHandleCaptcha()
    if (hasCaptcha) {
      console.log(`${this.logPrefix} ❌ 检测到验证码，暂停自动化`)
      const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.USER_PAUSE)
      await this.executeAction(nextAction)
      return
    }
    console.log(`${this.logPrefix} ✓ 无验证码，继续处理...`)

    // 获取SERP结果
    console.log(`${this.logPrefix} 检查页面是否有搜索结果...`)
    const hasResults = hasSearchResults()
    console.log(`${this.logPrefix} hasSearchResults() = ${hasResults}`)
    
    if (hasResults) {
      console.log(`${this.logPrefix} ✓ 页面有搜索结果，开始提取...`)
      const serpResults = this.extractSerpResults()
      console.log(`${this.logPrefix} 提取到 ${serpResults.length} 个SERP结果`)
      
      console.log(`${this.logPrefix} 触发SERP_READY事件...`)
      const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.SERP_READY, {
        serpResults
      })
      console.log(`${this.logPrefix} SERP_READY事件处理完成，下一个动作: ${nextAction}`)
      
      if (nextAction) {
        console.log(`${this.logPrefix} 执行动作: ${nextAction}`)
        await this.executeAction(nextAction)
      } else {
        console.log(`${this.logPrefix} ❌ 无下一个动作，停止处理`)
      }
    } else {
      console.log(`${this.logPrefix} ❌ 页面无搜索结果`)
    }

    markAllResultsAsPending()
    
    console.log(`${this.logPrefix} ========== 页面就绪事件结束 ==========`)
  }

  /**
   * 开始自动化
   */
  async startAutomation(task) {
    console.log(`${this.logPrefix} 开始自动化`, { task })
    // 获取关键词列表
    const keywords = await this.getKeywordsList(task)
    if (!keywords || keywords.length === 0) {
      console.error(`${this.logPrefix} 没有找到可用的关键词`)
      return
    }

    console.log(`${this.logPrefix} 获取到关键词`, { count: keywords.length, keywords })
    // 触发用户开始事件
    const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.USER_START, {
      task,
      keywords
    })
    await this.executeAction(nextAction)
  }

  /**
   * 暂停自动化
   */
  async pauseAutomation() {
    console.log(`${this.logPrefix} 暂停自动化`)
    
    // 清除超时
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId)
      this.currentTimeoutId = null
    }

    const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.USER_PAUSE)
    await this.executeAction(nextAction)
  }

  /**
   * 恢复自动化
   */
  async resumeAutomation() {
    console.log(`${this.logPrefix} 恢复自动化`)
    const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.USER_RESUME)
    await this.executeAction(nextAction)
  }

  /**
   * 停止自动化
   */
  async stopAutomation() {
    console.log(`${this.logPrefix} 停止自动化`)
    // 清除超时
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId)
      this.currentTimeoutId = null
    }

    const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.USER_STOP)
    await this.executeAction(nextAction)
  }

  /**
   * 执行动作
   */
  async executeAction(actionType) {
    console.log(`${this.logPrefix} ========== 执行动作开始: ${actionType} ==========`)
    
    if (!actionType) {
      console.log(`${this.logPrefix} ❌ 动作类型为空，忽略执行`)
      return
    }
    
    if (this.isExecutingAction) {
      console.log(`${this.logPrefix} ❌ 正在执行其他动作，忽略本次执行`)
      return
    }

    this.isExecutingAction = true
    console.log(`${this.logPrefix} ✓ 开始执行动作: ${actionType}`)

    try {
      switch (actionType) {
        case ACTION_TYPES.SEARCH_KEYWORD:
          console.log(`${this.logPrefix} 执行搜索关键词动作...`)
          await this.executeSearchKeyword()
          break

        case ACTION_TYPES.PROCESS_SERP:
          console.log(`${this.logPrefix} 执行处理SERP动作...`)
          // TODO: 似乎这里不会再有调用了，考虑删除这个事件
          await this.executeProcessSerp()
          break

        case ACTION_TYPES.OPEN_NEXT_LINK:
          console.log(`${this.logPrefix} 执行打开下一个链接动作...`)
          await this.executeOpenNextLink()
          break

        case ACTION_TYPES.GO_NEXT_PAGE:
          console.log(`${this.logPrefix} 执行翻页动作...`)
          await this.executeGoNextPage()
          break

        case ACTION_TYPES.SWITCH_KEYWORD:
          console.log(`${this.logPrefix} 执行切换关键词动作...`)
          await this.executeSwitchKeyword()
          break

        case ACTION_TYPES.PAUSE_AUTOMATION:
          console.log(`${this.logPrefix} 执行暂停动作...`)
          await this.executePauseAutomation()
          break

        case ACTION_TYPES.RESUME_AUTOMATION:
          console.log(`${this.logPrefix} 执行恢复动作...`)
          await this.executeResumeAutomation()
          break

        case ACTION_TYPES.STOP_AUTOMATION:
          console.log(`${this.logPrefix} 执行停止动作...`)
          await this.executeStopAutomation()
          break

        case ACTION_TYPES.WAIT_CAPTCHA:
          console.log(`${this.logPrefix} 执行等待验证码动作...`)
          await this.executeWaitCaptcha()
          break

        case ACTION_TYPES.SHOW_RESULTS:
          console.log(`${this.logPrefix} 执行显示结果动作...`)
          await this.executeShowResults()
          break

        case ACTION_TYPES.CLEANUP:
          console.log(`${this.logPrefix} 执行清理动作...`)
          await this.executeCleanup()
          break

        default:
          console.warn(`${this.logPrefix} ❌ 未知动作类型: ${actionType}`)
      }
      console.log(`${this.logPrefix} ✓ 动作执行完成: ${actionType}`)
    } catch (error) {
      console.error(`${this.logPrefix} ❌ 执行动作失败`, { actionType, error })
    } finally {
      this.isExecutingAction = false
      console.log(`${this.logPrefix} ========== 执行动作结束: ${actionType} ==========`)
    }
  }

  /**
   * 执行搜索关键词动作
   */
  async executeSearchKeyword() {
    const state = automationStateManager.getState()
    const keyword = automationStateManager.getCurrentKeyword()
    
    console.log(`${this.logPrefix} 执行搜索关键词`, { 
      keyword, 
      keywordIndex: state.currentKeywordIndex,
      page: state.currentPage 
    })
    try {
      // 这里执行关键词输入与执行
      await performSearch(keyword)
      // 上面执行后就刷新，不会往下走了
    } catch (error) {
      console.error(`${this.logPrefix} 搜索关键词失败`, { keyword, error })
    }
  }

  /**
   * 执行处理SERP动作
   */
  async executeProcessSerp() {
    console.log(`${this.logPrefix} 执行处理SERP`)
    // 标记所有结果为待处理
    markAllResultsAsPending()
    
    // 触发处理第一个链接
    const nextAction = automationStateManager.decideNextAction()
    await this.executeAction(nextAction)
  }

  /**
   * 执行打开下一个链接动作
   */
  async executeOpenNextLink() {
    const state = automationStateManager.getState()
    const currentIndex = state.currentResultIndex
    const serpResults = state.currentSerpResults || []
    
    console.log(`${this.logPrefix} 执行打开下一个链接`, { 
      currentIndex, 
      totalResults: serpResults.length 
    })
    if (currentIndex >= serpResults.length) {
      console.log(`${this.logPrefix} 当前页面所有链接已处理完成`)
      const nextAction = automationStateManager.decideNextAction()
      await this.executeAction(nextAction)
      return
    }

    const result = serpResults[currentIndex]
    const targetUrl = result.url
    
    try {
      // 清除所有结果的处理中样式，确保只有一个结果显示处理中状态
      await this.clearAllClickingStyles()
      
      // 设置当前操作URL
      await automationStateManager.setCurrentOperatingUrl(targetUrl)
      
      // 应用处理中样式到当前结果
      applyResultStyle(result.element, RESULT_STATUS.CLICKING)
      
      // 点击链接打开新标签页
      const keyword = automationStateManager.getCurrentKeyword()
      const taskId = state.taskId
      await clickSearchResultLink(result, keyword, taskId)
      
      console.log(`${this.logPrefix} 已点击链接`, { targetUrl, index: currentIndex })
      
      // 设置超时检测
      this.currentTimeoutId = setTimeout(async () => {
        console.log(`${this.logPrefix} 链接处理超时`, { targetUrl })
        
        // 获取当前索引，用于稍后更新样式
        const currentState = automationStateManager.getState()
        const timeoutIndexBeforeUpdate = currentState?.currentResultIndex || 0
        
        // 先触发超时事件，更新状态（currentResultIndex会+1）
        const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.LANDING_TIMEOUT, {
          targetUrl
        })
        
        // 然后更新超时的结果的样式（使用更新前的索引）
        await this.updateResultStyleByIndex(timeoutIndexBeforeUpdate, RESULT_STATUS.FAILED)
        
        await this.executeAction(nextAction)
      }, state.serpLinkTimeout)
      
    } catch (error) {
      console.error(`${this.logPrefix} 打开链接失败`, { targetUrl, error })
      
      // 获取当前索引，用于稍后更新样式
      const errorState = automationStateManager.getState()
      const errorIndexBeforeUpdate = errorState?.currentResultIndex || 0
      
      // 先标记为处理完成并更新状态
      const nextAction = await automationStateManager.handleEvent(EVENT_TYPES.LANDING_PROCESSED, {
        extractedData: null,
        targetUrl
      })
      
      // 然后应用失败样式（使用更新前的索引）
      await this.updateResultStyleByIndex(errorIndexBeforeUpdate, RESULT_STATUS.FAILED)
      
      await this.executeAction(nextAction)
    }
  }

  /**
   * 清除所有结果的处理中样式
   */
  async clearAllClickingStyles() {
    console.log(`${this.logPrefix} 清除所有结果的处理中样式`)
    
    const state = automationStateManager.getState()
    const serpResults = state?.currentSerpResults || []
    
         serpResults.forEach((result, index) => {
       if (result.element && result.element.style) {
         // 检查是否有处理中或点击中样式，如果有则清除
         const hasProcessingStyle = result.element.classList.contains('haoyu-serp-result-clicking') ||
                                    result.element.classList.contains('haoyu-serp-result-processing')
         
         if (hasProcessingStyle) {
           console.log(`${this.logPrefix} 清除结果 ${index} 的处理中样式`)
           // 恢复为待处理样式
           applyResultStyle(result.element, RESULT_STATUS.PENDING)
         }
       }
     })
  }

  /**
   * 更新当前结果的样式
   */
  async updateCurrentResultStyle(status) {
    console.log(`${this.logPrefix} 更新当前结果样式`, { status })
    
    const state = automationStateManager.getState()
    const serpResults = state?.currentSerpResults || []
    const currentIndex = state?.currentResultIndex || 0
    
    if (currentIndex < serpResults.length) {
      const result = serpResults[currentIndex]
      if (result && result.element) {
        applyResultStyle(result.element, status)
        console.log(`${this.logPrefix} ✓ 已更新结果 ${currentIndex} 的样式为: ${status}`, result.element)
      }
    }
  }

  /**
   * 执行翻页动作
   */
  async executeGoNextPage() {
    console.log(`${this.logPrefix} 执行翻页`)
    
    try {
      if (hasNextPage()) {
        await automationStateManager.moveToNextPage()
        await clickNextPage()
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, AUTOMATION_CONFIG.SEARCH_DELAY))
        
        console.log(`${this.logPrefix} 翻页成功`)
        
        // 页面会刷新，等待页面就绪事件
      } else {
        console.log(`${this.logPrefix} 没有下一页，处理页面结束`)
        // 使用专门的页面结束处理方法，确保正确的逻辑
        const nextAction = await automationStateManager.handlePageEnd()
        if (nextAction) {
                  console.log(`${this.logPrefix} 页面结束后的下一个动作: ${nextAction}`)
        // 直接在当前执行上下文中处理，避免isExecutingAction阻塞
        if (nextAction === ACTION_TYPES.SWITCH_KEYWORD) {
          console.log(`${this.logPrefix} 直接执行切换关键词`)
          await this.executeSwitchKeywordDirect()
        } else {
          await this.executeAction(nextAction)
        }
        }
      }
    } catch (error) {
      console.error(`${this.logPrefix} 翻页失败`, error)
      // 翻页失败也按页面结束处理
      const nextAction = await automationStateManager.handlePageEnd()
      if (nextAction) {
        console.log(`${this.logPrefix} 翻页失败后的下一个动作: ${nextAction}`)
        if (nextAction === ACTION_TYPES.SWITCH_KEYWORD) {
          console.log(`${this.logPrefix} 直接执行切换关键词`)
          await this.executeSwitchKeywordDirect()
        } else {
          await this.executeAction(nextAction)
        }
      }
    }
  }

  /**
   * 执行切换关键词动作
   */
  async executeSwitchKeyword() {
    console.log(`${this.logPrefix} 执行切换关键词`)
    
    const nextAction = await automationStateManager.moveToNextKeyword()
    console.log(`${this.logPrefix} 切换关键词后的下一个动作: ${nextAction}`)
    
    // 直接执行，避免isExecutingAction阻塞
    if (nextAction === ACTION_TYPES.SEARCH_KEYWORD) {
      console.log(`${this.logPrefix} 直接执行搜索关键词`)
      await this.executeSearchKeywordDirect()
    } else if (nextAction === ACTION_TYPES.SHOW_RESULTS) {
      console.log(`${this.logPrefix} 所有关键词已完成，显示结果`)
      await this.executeShowResults()
    }
  }

  /**
   * 直接执行切换关键词动作（避免isExecutingAction阻塞）
   */
  async executeSwitchKeywordDirect() {
    console.log(`${this.logPrefix} 直接执行切换关键词`)
    
    const nextAction = await automationStateManager.moveToNextKeyword()
    console.log(`${this.logPrefix} 切换关键词后的下一个动作: ${nextAction}`)
    
    if (nextAction === ACTION_TYPES.SEARCH_KEYWORD) {
      console.log(`${this.logPrefix} 直接执行搜索关键词`)
      await this.executeSearchKeywordDirect()
    } else if (nextAction === ACTION_TYPES.SHOW_RESULTS) {
      console.log(`${this.logPrefix} 所有关键词已完成，显示结果`)
      await this.executeShowResults()
    } else {
      console.log(`${this.logPrefix} 切换关键词后执行其他动作: ${nextAction}`)
      await this.executeAction(nextAction)
    }
  }

  /**
   * 直接执行搜索关键词动作（避免isExecutingAction阻塞）
   */
  async executeSearchKeywordDirect() {
    const state = automationStateManager.getState()
    const keyword = automationStateManager.getCurrentKeyword()
    
    console.log(`${this.logPrefix} 直接执行搜索关键词`, { 
      keyword, 
      keywordIndex: state.currentKeywordIndex,
      page: state.currentPage 
    })

    try {
      // 这里执行关键词输入与执行
      await performSearch(keyword)
      // 上面执行后就刷新，不会往下走了
    } catch (error) {
      console.error(`${this.logPrefix} 搜索关键词失败`, { keyword, error })
    }
  }

  /**
   * 执行暂停动作
   */
  async executePauseAutomation() {
    console.log(`${this.logPrefix} 执行暂停`)
    // 暂停状态下不执行其他动作
  }

  /**
   * 执行恢复动作
   */
  async executeResumeAutomation() {
    console.log(`${this.logPrefix} 执行恢复`)
    const nextAction = automationStateManager.decideNextAction()
    await this.executeAction(nextAction)
  }

  /**
   * 执行停止动作
   */
  async executeStopAutomation() {
    console.log(`${this.logPrefix} 执行停止`)
    
    // 清除所有结果样式
    clearAllResultStyles()
    
    console.log(`${this.logPrefix} 自动化已停止，状态已重置为初始状态`)
  }

  /**
   * 执行等待验证码动作
   */
  async executeWaitCaptcha() {
    console.log(`${this.logPrefix} 等待验证码处理`)
    
    // 定期检查验证码是否解决
    setTimeout(async () => {
      if (!(await checkAndHandleCaptcha())) {
        console.log(`${this.logPrefix} 验证码已解决，恢复自动化`)
        await this.resumeAutomation()
      } else {
        await this.executeWaitCaptcha() // 递归等待
      }
    }, AUTOMATION_CONFIG.CAPTCHA_CHECK_INTERVAL)
  }

  /**
   * 执行显示结果动作
   */
  async executeShowResults() {
    console.log(`${this.logPrefix} 显示结果`)
    
    const state = automationStateManager.getState()
    if (state) {
      console.log(`${this.logPrefix} 自动化完成统计`, {
        totalKeywords: state.totalKeywords,
        processedLinks: state.processedLinksCount,
        extractedInfo: state.extractedInfoCount,
        duration: Date.now() - state.createdAt
      })
    }
    
    // 清除状态
    await automationStateManager.clearState()
  }

  /**
   * 执行清理动作
   */
  async executeCleanup() {
    console.log(`${this.logPrefix} 执行清理`)
    
    // 清除所有结果样式
    clearAllResultStyles()
    
    // 清除超时
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId)
      this.currentTimeoutId = null
    }
    
    // 清除页面标记监听器
    if (this.pageMarkerListener) {
      this.pageMarkerListener()
      this.pageMarkerListener = null
    }
  }

  /**
   * 销毁适配器
   */
  destroy() {
    console.log(`${this.logPrefix} 销毁适配器`)
    
    // 清除超时
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId)
      this.currentTimeoutId = null
    }
    
    // 清除页面标记监听器
    if (this.pageMarkerListener) {
      this.pageMarkerListener()
      this.pageMarkerListener = null
    }
    
    // 清除所有结果样式
    clearAllResultStyles()
    
    console.log(`${this.logPrefix} ✓ 适配器已销毁`)
  }

  /**
   * 提取SERP结果
   */
  extractSerpResults() {
    console.log(`${this.logPrefix} ========== 开始提取SERP结果 ==========`)
    
    const { links, containers } = getSearchResultLinks()
    
    console.log(`${this.logPrefix} 搜索结果容器数量: ${containers.length}`)
    console.log(`${this.logPrefix} 搜索结果链接数量: ${links ? links.length : 0}`)
    
    if (containers.length === 0) {
      console.log(`${this.logPrefix} ❌ 未找到搜索结果容器`)
      return []
    }
    
    const results = containers?.map((container, index) => {
      const link = links[index]
      const result = {
        element: container,
        url: link?.href || '',
        title: link?.textContent || '',
        index
      }
      
      console.log(`${this.logPrefix} 结果 ${index}:`, {
        hasElement: !!container,
        elementTagName: container?.tagName,
        elementNodeType: container?.nodeType,
        hasStyle: !!container?.style,
        url: result.url,
        title: result.title.substring(0, 50) + (result.title.length > 50 ? '...' : ''),
        hasUrl: !!result.url
      })
      
      console.log(`${this.logPrefix} ✓ 元素 ${index} 的结果为：`, result)
      
      return result
    }).filter(result => result.url)
    
    console.log(`${this.logPrefix} ✓ 过滤后的有效结果数量: ${results.length}`)
    console.log(`${this.logPrefix} ✓ 总元素结果为：`, results)
      
    console.log(`${this.logPrefix} ========== SERP结果提取完成 ==========`)
    return results
  }

  /**
   * 获取关键词列表
   * 传进来可解析，不传则从storage中获取
   */
  async getKeywordsList(task) {
    try {
      const selectedTask = task ? task : (await Browser.storage.local.get([AUTOMATION_STORAGE_KEYS.SELECTED_TASK]))?.selectedTask || {}
      const keywords = await getTaskKeywords(selectedTask)
      return keywords || []
    } catch (error) {
      console.error(`${this.logPrefix} 获取关键词失败`, error)
      return []
    }
  }

  /**
   * 检查是否正在自动化
   */
  isAutomating() {
    return automationStateManager.isAutomating()
  }

  /**
   * 检查是否暂停
   */
  isPaused() {
    return automationStateManager.isPaused()
  }

  /**
   * 获取当前状态
   */
  getState() {
    return automationStateManager.getState()
  }
}

// 创建全局实例
const googleSearchAutomationAdapter = new GoogleSearchAutomationAdapter()

export default googleSearchAutomationAdapter 