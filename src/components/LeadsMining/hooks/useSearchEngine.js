import { useCallback, useRef, useEffect } from 'react'
import { message } from 'antd'
import Browser from 'webextension-polyfill'
import {
  scrollToBottom,
  clickNextPage,
  isLastPage,
  performGoogleSearch,
  getSearchResultLinks,
  isGoogleSearchPage,
  markLinkStatus,
} from '../utils/searchEngine'
import { scrollToEmail, highlightEmail } from '../utils/emailExtractor'
import {
  leadsMiningWindowMessenger,
  LEADS_MINING_WINDOW_ACTIONS,
} from '../../../services/messaging/contentWindow'

/**
 * 创建延时函数
 * @param {number} ms - 延时毫秒数
 * @returns {Promise} 延时Promise
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 获取随机延时时间
 * @param {number} min - 最小秒数
 * @param {number} max - 最大秒数
 * @returns {number} 随机毫秒数
 */
const getRandomDelay = (min, max) => {
  return (Math.random() * (max - min) + min) * 1000
}

// 页面深度标记，用于限制打开页面的层级
const PAGE_DEPTH_KEY = 'leadsMining_pageDepth'
// 最大允许的页面深度
const MAX_PAGE_DEPTH = 1
// 搜索结果页标记，用于标识当前标签页是否为搜索结果页
const SEARCH_PAGE_KEY = 'leadsMining_isSearchPage'

/**
 * 搜索引擎Hook
 * 负责搜索执行和页面处理
 */
export const useSearchEngine = (taskManager, backgroundState, emailProcessor) => {
  const { searchCombinations, selectedTask } = taskManager
  // 最大页数固定为10
  const maxPages = 10

  // 用于跟踪当前处理的链接索引
  const currentLinkIndexRef = useRef(0)
  // 用于存储当前页面的搜索结果链接及其状态
  const searchResultsRef = useRef([])
  // 用于标记是否正在处理链接
  const isProcessingLinkRef = useRef(false)
  // 用于存储当前打开的详情页窗口引用
  const detailWindowRef = useRef(null)
  // 用于存储定时器ID
  const timerRef = useRef(null)
  // 用于存储当前任务状态
  const prevTaskStatusRef = useRef('idle')
  // 当前页面深度
  const pageDepthRef = useRef(0)
  // 标记当前页面是否为搜索结果页
  const isSearchPageRef = useRef(false)

  const {
    currentCombinationIndex,
    currentPage,
    taskStatus,
    updateState,
    saveStateToBackground,
    completeTask,
    isUrlProcessed,
    registerProcessedUrl,
    registerEmail,
  } = backgroundState

  const { extractAndProcessEmails } = emailProcessor

  // 获取任务中的延时参数，如果没有则使用默认值
  const getDelayParams = () => {
    const defaultClickDelay = 2 // 默认点击前等待时间（秒）
    const defaultBrowseDelay = 2.5 // 默认浏览时间（秒）

    const clickDelay = selectedTask?.clickDelay || defaultClickDelay
    const browseDelay = selectedTask?.browseDelay || defaultBrowseDelay

    return {
      clickDelay,
      browseDelay,
    }
  }

  // 检查当前页面是否为谷歌搜索结果页
  const checkIsGoogleSearchPage = useCallback(() => {
    const currentIsGoogleSearchPage = isGoogleSearchPage()
    isSearchPageRef.current = currentIsGoogleSearchPage && pageDepthRef.current === 0
    return isSearchPageRef.current
  }, [])

  // 检查是否已存在搜索结果页
  const checkExistingSearchPage = useCallback(async () => {
    try {
      // 获取当前标签页ID
      const currentTab = await Browser.tabs.getCurrent()
      const currentTabId = currentTab?.id

      // 获取所有标签页
      const allTabs = await Browser.tabs.query({})

      // 检查是否有其他标签页已经标记为搜索结果页
      for (const tab of allTabs) {
        if (tab.id !== currentTabId) {
          try {
            // 尝试向其他标签页发送消息，检查是否为搜索结果页
            const response = await Browser.tabs
              .sendMessage(tab.id, {
                action: 'LEADS_MINING_CHECK_IS_SEARCH_PAGE',
              })
              .catch(() => ({ isSearchPage: false }))

            if (response && response.isSearchPage) {
              console.log('已存在搜索结果页，标签页ID:', tab.id)
              return true
            }
          } catch (error) {
            // 忽略消息发送错误
          }
        }
      }

      return false
    } catch (error) {
      console.error('检查已存在搜索结果页时出错:', error)
      return false
    }
  }, [])

  // 标记当前标签页为搜索结果页
  const markAsSearchPage = useCallback(() => {
    if (checkIsGoogleSearchPage()) {
      // 在 sessionStorage 中标记当前页面为搜索结果页
      sessionStorage.setItem(SEARCH_PAGE_KEY, 'true')
      isSearchPageRef.current = true
      console.log('当前页面已标记为搜索结果页')
    }
  }, [checkIsGoogleSearchPage])

  // 取消标记当前标签页为搜索结果页
  const unmarkAsSearchPage = useCallback(() => {
    sessionStorage.removeItem(SEARCH_PAGE_KEY)
    isSearchPageRef.current = false
    console.log('当前页面已取消标记为搜索结果页')
  }, [])

  // 初始化页面深度和搜索页标记
  useEffect(() => {
    // 检查URL参数中是否有深度标记
    const urlParams = new URLSearchParams(window.location.search)
    const depthParam = urlParams.get(PAGE_DEPTH_KEY)

    if (depthParam !== null) {
      // 如果有深度参数，设置当前深度
      pageDepthRef.current = parseInt(depthParam, 10)
    } else {
      // 如果没有深度参数，默认为0（搜索结果页）
      pageDepthRef.current = 0
    }

    console.log(`当前页面深度: ${pageDepthRef.current}`)

    // 检查当前页面是否为搜索结果页
    const isCurrentSearchPage = checkIsGoogleSearchPage()

    // 检查 sessionStorage 中是否已标记为搜索结果页
    const storedIsSearchPage = sessionStorage.getItem(SEARCH_PAGE_KEY) === 'true'
    isSearchPageRef.current =
      isCurrentSearchPage || (storedIsSearchPage && pageDepthRef.current === 0)

    // 如果是搜索结果页，检查是否已存在其他搜索结果页
    if (isSearchPageRef.current) {
      checkExistingSearchPage().then((exists) => {
        if (exists) {
          // 如果已存在其他搜索结果页，取消当前页面的搜索结果页标记
          unmarkAsSearchPage()
          message.warning('已存在一个搜索结果页，此页面无法启动任务')
        } else {
          // 如果不存在其他搜索结果页，标记当前页面为搜索结果页
          markAsSearchPage()
        }
      })
    }

    // 如果是详情页，自动执行滚动和提取邮箱
    if (pageDepthRef.current > 0 && pageDepthRef.current <= MAX_PAGE_DEPTH) {
      // 延迟执行，确保页面已加载
      setTimeout(() => {
        console.log('详情页自动滚动并提取邮箱')
        handleDetailPageProcessing()
      }, 1000)
    }

    // 监听消息，用于检查当前页面是否为搜索结果页
    const messageListener = (message) => {
      if (message.action === 'LEADS_MINING_CHECK_IS_SEARCH_PAGE') {
        return Promise.resolve({ isSearchPage: isSearchPageRef.current })
      }
      return true
    }

    Browser.runtime.onMessage.addListener(messageListener)

    return () => {
      Browser.runtime.onMessage.removeListener(messageListener)
      // 页面卸载时，取消搜索结果页标记
      if (isSearchPageRef.current) {
        unmarkAsSearchPage()
      }
    }
  }, [checkIsGoogleSearchPage, markAsSearchPage, unmarkAsSearchPage, checkExistingSearchPage])

  // 处理详情页的滚动和提取邮箱
  const handleDetailPageProcessing = useCallback(async () => {
    // 等待页面加载完成
    if (document.readyState !== 'complete') {
      console.log('等待页面加载完成...')
      await new Promise((resolve) => {
        const checkReady = () => {
          if (document.readyState === 'complete') {
            resolve()
          } else {
            setTimeout(checkReady, 100)
          }
        }
        checkReady()
      })
    }

    console.log('页面已加载完成，开始浏览')

    // 等待一段时间，模拟阅读页面顶部内容
    await delay(2000)

    // 滚动到底部
    console.log('开始滚动到底部')
    await scrollToBottom()

    // 提取邮箱
    console.log('提取邮箱')
    const emails = extractAndProcessEmails()

    console.log('详情页处理完成，提取到邮箱:', emails)

    // 如果有opener，发送邮箱回主页面
    if (window.opener && emails && emails.length > 0) {
      leadsMiningWindowMessenger.sendExtractedEmails(window.opener, emails)
    }
  }, [extractAndProcessEmails])

  // 监听消息，用于从详情页接收提取的邮箱
  useEffect(() => {
    // 注册窗口消息处理器
    leadsMiningWindowMessenger.registerHandlers({
      [LEADS_MINING_WINDOW_ACTIONS.EXTRACTED_EMAILS]: (data) => {
        const { emails } = data
        if (emails && emails.length > 0) {
          console.log('收到详情页提取的邮箱:', emails)

          // 处理提取到的邮箱
          emails.forEach(async (email) => {
            if (email && typeof email === 'string') {
              try {
                // 使用registerEmail而不是registerProcessedUrl
                await registerEmail(email)
              } catch (error) {
                console.error('注册邮箱时出错:', error)
              }
            }
          })
        }
      },
      [LEADS_MINING_WINDOW_ACTIONS.SCROLL_AND_EXTRACT]: () => {
        console.log('收到滚动和提取邮箱的请求')
        handleDetailPageProcessing()
      },
    })

    // 清理函数由ContentWindowMessenger内部处理
    return () => {
      // 不需要手动移除事件监听器
    }
  }, [registerEmail, handleDetailPageProcessing])

  // 执行搜索
  const executeSearch = useCallback(async () => {
    // 检查当前页面是否为搜索结果页
    if (!isSearchPageRef.current) {
      console.log('当前页面不是搜索结果页，无法执行搜索')
      message.warning('只能在谷歌搜索结果页执行任务')
      updateState({ taskStatus: 'paused', statusMessage: '只能在谷歌搜索结果页执行任务' })
      return
    }

    if (taskStatus !== 'running') return

    try {
      // 如果当前页面深度大于0，说明是详情页，不执行搜索
      if (pageDepthRef.current > 0) {
        console.log('当前是详情页，不执行搜索')
        return
      }

      // 如果当前组合索引超出范围，任务完成
      if (currentCombinationIndex >= searchCombinations.length) {
        completeTask()
        return
      }

      // 获取当前搜索词
      const searchTerm = searchCombinations[currentCombinationIndex]
      updateState({ currentSearchTerm: searchTerm })

      // 检查当前URL是否为Google搜索结果页面
      const isGoogleSearchPage =
        window.location.hostname.includes('google') && window.location.pathname.includes('/search')

      // 检查当前搜索页面的搜索词是否与目标搜索词匹配
      const currentUrlSearchTerm = isGoogleSearchPage
        ? new URLSearchParams(window.location.search).get('q')
        : null
      const isCorrectSearchTerm = currentUrlSearchTerm === searchTerm

      // 判断是否为全新组合（第一页）
      const isNewCombination = currentPage === 1

      // 只有在以下情况才执行Google搜索：
      // 1. 全新组合（第一页）且不在正确的搜索结果页
      // 2. 不在Google搜索页面
      if ((isNewCombination && !isCorrectSearchTerm) || !isGoogleSearchPage) {
        performGoogleSearch(searchTerm)
        return
      }

      // 获取延时参数
      const { browseDelay } = getDelayParams()

      // 如果页面刚加载完成，标记所有搜索结果链接
      if (document.readyState === 'complete') {
        const searchResults = getSearchResultLinks()
        if (searchResults.length > 0) {
          console.log(`找到${searchResults.length}个搜索结果链接`)

          // 清除之前的所有标记
          document
            .querySelectorAll(
              '.leadsMining-link-to-visit, .leadsMining-link-visited, .leadsMining-link-current',
            )
            .forEach((el) => {
              el.classList.remove(
                'leadsMining-link-to-visit',
                'leadsMining-link-visited',
                'leadsMining-link-current',
              )
              // 移除图标和loading动画
              const icons = el.querySelectorAll('.leadsMining-link-icon, .leadsMining-link-loading')
              icons.forEach((icon) => icon.remove())
              // 移除data-visited属性
              el.removeAttribute('data-visited')
            })

          // 存储链接及其状态信息
          const linksWithStatus = []
          let visitedCount = 0

          // 检查每个链接是否已处理，并标记其状态
          for (const link of searchResults) {
            try {
              const url = link.href
              const processed = await isUrlProcessed(url)
              const status = processed ? 'visited' : 'to-visit'

              // 标记链接状态
              markLinkStatus(link, status)

              // 存储链接及其状态
              linksWithStatus.push({
                link,
                url,
                status,
                processed,
              })

              if (processed) {
                visitedCount++
              }
            } catch (error) {
              console.error('检查链接处理状态时出错:', error)
              // 出错时默认标记为待访问
              markLinkStatus(link, 'to-visit')
              // 存储链接及其状态
              linksWithStatus.push({
                link,
                url: link.href,
                status: 'to-visit',
                processed: false,
              })
            }
          }

          // 更新搜索结果引用
          searchResultsRef.current = linksWithStatus

          console.log(
            `已标记${visitedCount}个链接为已访问状态，${
              searchResults.length - visitedCount
            }个链接为待访问状态`,
          )
        }
      }

      // 模拟浏览页面的时间
      await delay(getRandomDelay(browseDelay * 0.8, browseDelay * 1.2))

      // 如果正在处理链接，则不继续处理页面
      if (isProcessingLinkRef.current) {
        return
      }

      // 处理当前页面
      await processCurrentPage()

      // 如果没有开始处理链接，则继续下一步
      if (!isProcessingLinkRef.current) {
        // 计算进度
        const totalSteps = searchCombinations.length * maxPages
        const currentStep = currentCombinationIndex * maxPages + currentPage
        const progressPercent = Math.floor((currentStep / totalSteps) * 100)
        updateState({ progress: progressPercent })

        // 检查是否需要翻页或切换搜索词
        if (currentPage < maxPages && !isLastPage()) {
          // 滚动到底部并点击下一页
          await scrollToBottom()
          updateState({ currentPage: currentPage + 1 })
          clickNextPage()
        } else {
          // 切换到下一个搜索组合
          updateState({
            currentCombinationIndex: currentCombinationIndex + 1,
            currentPage: 1,
          })

          // 如果还有下一个搜索组合，执行搜索
          if (currentCombinationIndex + 1 < searchCombinations.length) {
            const nextSearchTerm = searchCombinations[currentCombinationIndex + 1]
            performGoogleSearch(nextSearchTerm)
          } else {
            completeTask()
          }
        }
      }
    } catch (error) {
      console.error('执行搜索时出错:', error)
      updateState({ statusMessage: `执行搜索时出错: ${error.message}` })
      saveStateToBackground()
    }
  }, [
    taskStatus,
    currentCombinationIndex,
    searchCombinations,
    currentPage,
    maxPages,
    updateState,
    completeTask,
    saveStateToBackground,
    selectedTask,
    processCurrentPage,
    isSearchPageRef,
    isUrlProcessed,
  ])

  // 处理当前页面
  const processCurrentPage = useCallback(async () => {
    // 检查当前页面是否为搜索结果页
    if (!isSearchPageRef.current) {
      console.log('当前页面不是搜索结果页，无法处理页面')
      return
    }

    try {
      // 提取当前页面的邮箱
      extractAndProcessEmails()

      // 如果当前页面深度已达到最大值，不处理链接
      if (pageDepthRef.current >= MAX_PAGE_DEPTH) {
        console.log(
          `当前页面深度(${pageDepthRef.current})已达到最大值(${MAX_PAGE_DEPTH})，不处理链接`,
        )
        return
      }

      // 处理搜索结果链接
      const searchResults = getSearchResultLinks()
      // 重置链接索引
      currentLinkIndexRef.current = 0

      console.log(`找到${searchResults.length}个搜索结果链接`)

      // 清除之前的所有标记
      document
        .querySelectorAll(
          '.leadsMining-link-to-visit, .leadsMining-link-visited, .leadsMining-link-current',
        )
        .forEach((el) => {
          el.classList.remove(
            'leadsMining-link-to-visit',
            'leadsMining-link-visited',
            'leadsMining-link-current',
          )
          // 移除图标和loading动画
          const icons = el.querySelectorAll('.leadsMining-link-icon, .leadsMining-link-loading')
          icons.forEach((icon) => icon.remove())
          // 移除data-visited属性
          el.removeAttribute('data-visited')
        })

      // 存储链接及其状态信息
      const linksWithStatus = []
      let visitedCount = 0

      // 检查每个链接是否已处理，并标记其状态
      for (const link of searchResults) {
        try {
          const url = link.href
          const processed = await isUrlProcessed(url)
          const status = processed ? 'visited' : 'to-visit'

          // 标记链接状态
          markLinkStatus(link, status)

          // 存储链接及其状态
          linksWithStatus.push({
            link,
            url,
            status,
            processed,
          })

          if (processed) {
            visitedCount++
          }
        } catch (error) {
          console.error('检查链接处理状态时出错:', error)
          // 出错时默认标记为待访问
          markLinkStatus(link, 'to-visit')
          // 存储链接及其状态
          linksWithStatus.push({
            link,
            url: link.href,
            status: 'to-visit',
            processed: false,
          })
        }
      }

      // 更新搜索结果引用
      searchResultsRef.current = linksWithStatus

      console.log(
        `已标记${visitedCount}个链接为已访问状态，${
          searchResults.length - visitedCount
        }个链接为待访问状态`,
      )

      // 开始处理第一个链接
      await processNextLink()
    } catch (error) {
      console.error('处理当前页面时出错:', error)
      updateState({ statusMessage: `处理当前页面时出错: ${error.message}` })
    }
  }, [extractAndProcessEmails, updateState, processNextLink, isSearchPageRef, isUrlProcessed])

  // 尝试在详情页中滚动到底部并提取邮箱
  const processDetailPage = useCallback(async (detailWindow) => {
    if (!detailWindow || detailWindow.closed) return

    try {
      // 使用ContentWindowMessenger发送消息
      console.log('向详情页发送滚动和提取邮箱的消息')
      leadsMiningWindowMessenger.sendScrollAndExtract(detailWindow, pageDepthRef.current + 1)
    } catch (error) {
      console.error('处理详情页时出错:', error)
    }
  }, [])

  // 处理下一个链接
  const processNextLink = useCallback(async () => {
    // 检查当前页面是否为搜索结果页
    if (!isSearchPageRef.current) {
      console.log('当前页面不是搜索结果页，无法处理链接')
      isProcessingLinkRef.current = false
      return
    }

    // 如果任务不在运行状态，不处理
    if (taskStatus !== 'running') {
      isProcessingLinkRef.current = false
      return
    }

    // 如果当前页面深度已达到最大值，不处理链接
    if (pageDepthRef.current >= MAX_PAGE_DEPTH) {
      console.log(
        `当前页面深度(${pageDepthRef.current})已达到最大值(${MAX_PAGE_DEPTH})，不处理链接`,
      )
      isProcessingLinkRef.current = false
      return
    }

    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // 获取延时参数
    const { clickDelay, browseDelay } = getDelayParams()

    try {
      const searchResults = searchResultsRef.current
      const currentIndex = currentLinkIndexRef.current

      // 如果没有更多链接或任务不在运行状态，则结束处理
      if (currentIndex >= searchResults.length || taskStatus !== 'running') {
        isProcessingLinkRef.current = false
        return
      }

      isProcessingLinkRef.current = true
      const linkData = searchResults[currentIndex]
      const { link, url, processed } = linkData

      // 标记当前正在处理的链接
      markLinkStatus(link, 'current')
      // 更新链接状态
      linkData.status = 'current'

      // 跳过已处理的URL
      if (processed) {
        console.log(`链接已处理过，跳过: ${url}`)
        // 标记为已访问
        markLinkStatus(link, 'visited')
        // 更新链接状态
        linkData.status = 'visited'

        // 移动到下一个链接
        currentLinkIndexRef.current++
        isProcessingLinkRef.current = false
        setTimeout(() => {
          processNextLink()
        }, 100)
        return
      }

      // 标记URL为已处理
      await registerProcessedUrl(url)
      // 更新链接状态
      linkData.processed = true

      // 模拟点击前的思考时间
      await delay(getRandomDelay(clickDelay * 0.8, clickDelay * 1.2))

      // 保存当前状态
      await saveStateToBackground()

      // 在当前页面打开链接
      updateState({ statusMessage: `正在访问: ${url}` })

      // 关闭之前打开的详情页窗口（如果有）
      if (detailWindowRef.current && !detailWindowRef.current.closed) {
        detailWindowRef.current.close()
      }

      // 添加深度参数到URL
      const urlObj = new URL(url)
      urlObj.searchParams.set(PAGE_DEPTH_KEY, (pageDepthRef.current + 1).toString())
      const urlWithDepth = urlObj.toString()

      // 在新标签页中打开链接
      detailWindowRef.current = window.open(urlWithDepth, '_blank')

      // 处理详情页（滚动到底部并提取邮箱）
      // 发送消息到详情页，请求滚动和提取邮箱
      await processDetailPage(detailWindowRef.current)

      // 详情页处理完成后，设置一个定时器来关闭详情页
      // 使用较长的浏览时间，模拟真实用户行为
      const browseTime = getRandomDelay(browseDelay * 1.5, browseDelay * 2.5)
      timerRef.current = setTimeout(() => {
        // 如果任务已暂停或停止，不继续处理
        if (taskStatus !== 'running') {
          return
        }

        // 关闭详情页
        if (detailWindowRef.current && !detailWindowRef.current.closed) {
          detailWindowRef.current.close()
        }

        // 标记链接为已访问
        markLinkStatus(link, 'visited')
        // 更新链接状态
        linkData.status = 'visited'
        console.log(`链接已访问完成，标记为已访问: ${url}`)

        // 移动到下一个链接
        currentLinkIndexRef.current++
        isProcessingLinkRef.current = false

        // 处理下一个链接
        processNextLink()
      }, browseTime)
    } catch (error) {
      console.error('处理链接时出错:', error)
      updateState({ statusMessage: `处理链接时出错: ${error.message}` })

      // 出错时也移动到下一个链接
      currentLinkIndexRef.current++
      isProcessingLinkRef.current = false
    }
  }, [
    taskStatus,
    isUrlProcessed,
    registerProcessedUrl,
    saveStateToBackground,
    updateState,
    getDelayParams,
    processDetailPage,
    isSearchPageRef,
  ])

  // 修改清理函数，确保清理所有链接标记和图标
  useEffect(() => {
    return () => {
      // 清除定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // 关闭详情页窗口
      if (detailWindowRef.current && !detailWindowRef.current.closed) {
        detailWindowRef.current.close()
      }

      // 清理链接标记样式
      const styleElement = document.getElementById('leadsMining-link-styles')
      if (styleElement) {
        styleElement.remove()
      }

      // 移除所有链接标记和图标
      document
        .querySelectorAll(
          '.leadsMining-link-to-visit, .leadsMining-link-visited, .leadsMining-link-current',
        )
        .forEach((el) => {
          el.classList.remove(
            'leadsMining-link-to-visit',
            'leadsMining-link-visited',
            'leadsMining-link-current',
          )

          // 移除所有图标和loading动画
          const icons = el.querySelectorAll('.leadsMining-link-icon, .leadsMining-link-loading')
          icons.forEach((icon) => icon.remove())
        })
    }
  }, [])

  // 监听任务状态变化
  useEffect(() => {
    console.log(`任务状态变化: ${prevTaskStatusRef.current} -> ${taskStatus}`)

    // 保存上一次的任务状态
    const prevStatus = prevTaskStatusRef.current
    prevTaskStatusRef.current = taskStatus

    // 如果任务从运行变为暂停或停止
    if (prevStatus === 'running' && taskStatus !== 'running') {
      console.log(`任务从运行变为${taskStatus === 'paused' ? '暂停' : '停止'}`)

      // 清除定时器，但不关闭窗口，以便用户可以继续浏览
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      // 更新状态
      isProcessingLinkRef.current = false
      updateState({ statusMessage: `任务已${taskStatus === 'paused' ? '暂停' : '停止'}` })
    }
    // 如果任务从暂停变为运行（继续任务）
    else if (prevStatus === 'paused' && taskStatus === 'running') {
      console.log('任务从暂停变为运行（继续任务）')

      // 检查当前页面是否为搜索结果页
      if (!isSearchPageRef.current) {
        console.log('当前页面不是搜索结果页，无法继续任务')
        message.warning('只能在谷歌搜索结果页继续任务')
        updateState({ taskStatus: 'paused', statusMessage: '只能在谷歌搜索结果页继续任务' })
        return
      }

      updateState({ statusMessage: '任务继续执行' })

      // 如果有打开的详情页，关闭它并继续处理下一个链接
      if (detailWindowRef.current && !detailWindowRef.current.closed) {
        detailWindowRef.current.close()
        detailWindowRef.current = null
      }

      // 继续处理链接
      setTimeout(() => {
        processNextLink()
      }, 500)
    }
    // 如果任务停止
    else if (taskStatus === 'idle' || taskStatus === 'completed') {
      console.log(`任务${taskStatus === 'idle' ? '停止' : '完成'}`)

      // 清除定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      // 关闭详情页窗口
      if (detailWindowRef.current && !detailWindowRef.current.closed) {
        detailWindowRef.current.close()
        detailWindowRef.current = null
      }

      isProcessingLinkRef.current = false
    }
  }, [taskStatus, updateState, processNextLink, isSearchPageRef])

  // 定位到邮箱
  const locateEmail = useCallback((email) => {
    const emailElement = document.querySelector(`[data-email='${email}']`)
    if (emailElement) {
      scrollToEmail(emailElement)
      highlightEmail(emailElement)
    } else {
      message.error('这个我不好找，你自己 Ctrl+F 找吧')
    }
  }, [])

  return {
    executeSearch,
    processCurrentPage,
    processNextLink,
    locateEmail,
    isSearchPage: isSearchPageRef.current,
  }
}
