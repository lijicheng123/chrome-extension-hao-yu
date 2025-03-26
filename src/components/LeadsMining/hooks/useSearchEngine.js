import { message } from 'antd'
// import { isSearchUrl } from '../utils/searchEngineUtils'
import { debounce } from '../utils/searchEngineUtils'
import { useCallback, useRef, useEffect, useMemo } from 'react'
import {
  scrollToBottom,
  clickNextPage,
  isLastPage,
  performGoogleSearch,
  getSearchResultLinks,
  markLinkStatus,
  getTotalPages,
  getCurrentPage,
} from '../utils/searchEngine'
import { scrollToEmail, highlightEmail } from '../utils/emailExtractor'
import {
  delay,
  getRandomDelay,
  getDelayParams,
  cleanupLinkMarkers,
  PAGE_DEPTH_KEY,
  MAX_PAGE_DEPTH,
  isStatusChanged,
} from '../utils/searchEngineUtils'
import { LeadsMiningContentAPI } from '../../../services/messaging/leadsMining'
import { isSearchResultPage } from '../utils/searchEngineConfig'

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

  // 从backgroundState中解构出需要的属性
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

  // 提取邮箱的函数
  const { extractCurrentPageEmails } = emailProcessor || {}

  const isSearchResultPageDetected = useMemo(() => {
    return isSearchResultPage()
  }, [isSearchResultPage])

  const isDetailPageDetected = useMemo(() => {
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
    return pageDepthRef.current > 0 && pageDepthRef.current <= MAX_PAGE_DEPTH
  }, [pageDepthRef.current])

  // 检查当前页面是否为搜索结果页
  const checkIsSearchResultPage = useCallback(() => {
    // 使用新的变量名
    const isSearchResult = isSearchResultPageDetected

    // 只有当深度为0(不是详情页)且是搜索结果页时，才认为是搜索结果页
    return isSearchResult && pageDepthRef.current === 0
  }, [isSearchResultPageDetected])

  // 简化后的检查是否已存在搜索结果页逻辑
  const checkExistingSearchPage = useCallback(async () => {
    try {
      // 使用LeadsMiningContentAPI检查是否有其他标签页打开了搜索结果页
      const exists = await LeadsMiningContentAPI.hasSearchResultPage()
      if (exists) {
        console.log('已存在搜索结果页')
        return true
      }

      return false
    } catch (error) {
      console.error('检查已存在搜索结果页时出错:', error)
      return false
    }
  }, [isSearchResultPageDetected])

  // 初始化页面深度，基本是详情页执行
  useEffect(() => {
    // 如果是详情页，自动执行滚动和提取邮箱
    if (isDetailPageDetected && selectedTask?.id) {
      console.log('详情页自动滚动并提取邮箱')
      handleDetailPageProcessing()
    }
  }, [handleDetailPageProcessing, isDetailPageDetected, selectedTask?.id])

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

    // 等待2-3秒，模拟阅读页面顶部内容
    await delay(getRandomDelay(2, 3))

    // 滚动到底部
    console.log('开始滚动到底部')
    await scrollToBottom()

    // 提取邮箱
    console.log('提取邮箱')
    const emails = extractCurrentPageEmails() || []
    debugger
    // 我希望在这里发送一条消息，消息内容为提取到的邮箱以及完成的状态
    console.log('详情页处理完成，提取到的邮箱:', emails)

    // 通过window.postMessage发送消息到opener
    // window.opener &&
    //   leadsMiningWindowMessenger.sendFinishedToSearchResultPage(window.opener, { emails })

    // 如果有提取到的邮箱，通过background发送，支持跨域通信
    if (emails && selectedTask?.id) {
      const taskId = selectedTask.id

      console.log('通过background发送提取到的邮箱:', emails, '任务ID:', taskId)

      // 使用LeadsMiningContentAPI发送邮箱到background
      LeadsMiningContentAPI.sendExtractedEmails(taskId, emails)
        .then((result) => {
          console.log('发送提取的邮箱结果:', result)
        })
        .catch((error) => {
          console.error('发送提取的邮箱出错:', error)
        })
    }
  }, [extractCurrentPageEmails, selectedTask])

  const test = useCallback(() => {
    console.log('test total pages', getTotalPages())
    console.log('test current page', getCurrentPage())
    console.log('test is last page', isLastPage())
  }, [])

  // 执行搜索
  const executeSearch = useCallback(async () => {
    // 检查当前页面是否为搜索结果页
    if (!checkIsSearchResultPage()) {
      message.warning('只能在搜索结果页执行任务')
      return
    }

    if (taskStatus !== 'running') return

    try {
      // 如果当前组合索引超出范围，任务完成
      if (currentCombinationIndex >= searchCombinations.length) {
        completeTask()
        return
      }

      // 获取当前搜索词
      const searchTerm = searchCombinations[currentCombinationIndex]
      updateState({ currentSearchTerm: searchTerm })

      // 检查当前搜索页面的搜索词是否与目标搜索词匹配
      const currentUrlSearchTerm = new URLSearchParams(window.location.search).get('q')
      const isCorrectSearchTerm = currentUrlSearchTerm === searchTerm

      // 判断是否为全新组合（第一页）
      const isNewCombination = currentPage === 1

      // 只有在以下情况才执行Google搜索：
      // 1. 全新组合（第一页）且不在正确的搜索结果页
      // 2. 不在Google搜索页面 上面已经判断了
      if (isNewCombination && !isCorrectSearchTerm) {
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

        console.log(
          '当前情况currentPage，maxPages，isLastPage:',
          currentPage,
          maxPages,
          isLastPage(),
        )

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
    checkIsSearchResultPage,
    isUrlProcessed,
  ])

  // 处理当前页面
  const processCurrentPage = useCallback(async () => {
    try {
      // 提取当前页面的邮箱
      extractCurrentPageEmails()

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
  }, [
    extractCurrentPageEmails,
    updateState,
    processNextLink,
    checkIsSearchResultPage,
    isUrlProcessed,
  ])

  // 处理下一个链接(这个方法只在搜索结果列表页执行)
  const processNextLink = useCallback(async () => {
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

      // 如果没有更多链接则点击下一页处理
      if (currentIndex >= searchResults.length && !isLastPage() && taskStatus === 'running') {
        isProcessingLinkRef.current = false
        clickNextPage()
        return
      }

      // 如果没有更多链接或任务不在运行状态，则结束处理
      if (currentIndex >= searchResults.length || taskStatus !== 'running') {
        isProcessingLinkRef.current = false
        console.log(
          '调试链接跳转：currentIndex & taskStatus:',
          currentIndex >= searchResults.length,
          taskStatus,
        )
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
      console.log('check next link 在新标签页中打开链接===>: ', urlWithDepth)
      // 在新标签页中打开链接
      detailWindowRef.current = window.open(urlWithDepth, '_blank')

      // 至此打开了新的标签，剩下的工作就是等待详情页处理完成后，关闭详情页，并标记链接为已访问
      // 等待详情页发通知回来，处理
      // 详情页处理完成后，设置一个定时器来关闭详情页
      // 最长等待50-65秒内的随机时间，如果期间没有收到详情页处理完成的消息，则强行处理下一个链接
      const waitRandomTime = getRandomDelay(browseDelay * 25, browseDelay * 30)
      console.log('check next link 等待详情页处理完成的时间===>: ', waitRandomTime)
      timerRef.current = setTimeout(() => {
        console.log('调试链接跳转：进入timeout:')
        // 处理状态
        handleNextStatus()
        // 关闭详情页
        handleDeleteTimerAndCloseDetailPage()
        // 处理下一个链接
        processNextLink()
      }, 20000) // 最长等待50-65秒内的随机时间，如果期间没有收到详情页处理完成的消息，则强行处理下一个链接
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
    checkIsSearchResultPage,
    handleDeleteTimerAndCloseDetailPage,
  ])

  const handleNextStatus = useCallback(() => {
    const searchResults = searchResultsRef.current
    const currentIndex = currentLinkIndexRef.current
    const linkData = searchResults[currentIndex]
    console.log(`下一个链接信息====>:`, searchResults, currentIndex, linkData)
    const { link, url } = linkData
    // 标记链接为已访问
    markLinkStatus(link, 'visited')
    // 更新链接状态
    linkData.status = 'visited'
    console.log(`调试链接跳转：链接已访问完成，标记为已访问: ${url}`)
    // 移动到下一个链接
    currentLinkIndexRef.current++
    isProcessingLinkRef.current = false
  }, [currentLinkIndexRef, isProcessingLinkRef, markLinkStatus])

  // 只有搜索结果列表页才需要关闭详情页&清理工具
  useEffect(() => {
    if (isSearchResultPageDetected) {
      // 我希望在这里实现一个消息监听，监听详情页发过来的消息

      // 2. 通过background监听跨域详情页发来的消息
      if (selectedTask?.id) {
        LeadsMiningContentAPI.registerExtractedEmailsHandler((data) => {
          console.log('收到详情页提取的邮箱(background中转):', data)

          const { emails, taskId: emailTaskId } = data
          const currentTaskId = selectedTask?.id
          handleNextStatus()
          debugger
          // 验证是否是当前任务的邮箱
          if (emailTaskId === currentTaskId && emails && emails.length > 0) {
            // 处理提取到的邮箱
            emails.forEach(async (email) => {
              if (email && typeof email === 'string') {
                try {
                  await registerEmail(email)
                } catch (error) {
                  console.error('注册邮箱失败:', error)
                }
              }
            })

            // 处理完成后关闭详情页并继续处理下一个链接
            handleDeleteTimerAndCloseDetailPage()
            processNextLink()
          }
        })
      }
    }
  }, [
    isSearchResultPageDetected,
    handleDeleteTimerAndCloseDetailPage,
    processNextLink,
    selectedTask,
    registerEmail,
  ])

  /**
   * 删除定时器&关闭详情页
   */
  const handleDeleteTimerAndCloseDetailPage = useCallback(() => {
    // 清除定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // 关闭详情页窗口
    if (detailWindowRef.current && !detailWindowRef.current.closed) {
      detailWindowRef.current.close()
    }
  }, [timerRef, detailWindowRef])

  // 监听任务状态变化
  useEffect(() => {
    // 只有当任务状态与上一个状态不同时才执行
    if (isStatusChanged(prevTaskStatusRef.current, taskStatus) && isSearchResultPageDetected) {
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
    }
  }, [taskStatus, updateState, processNextLink, isSearchResultPageDetected])

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
    processNextLink,
    locateEmail,
    checkExistingSearchPage,
    isSearchPage: isSearchResultPageDetected,
    test,
  }
}
