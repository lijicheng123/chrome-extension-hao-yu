import { useEffect, useRef } from 'react'
import { 
  isLandingPage, 
  extractDataFromLandingPage,
  getPageMarker,
  setPageMarker
} from '../utils/googleSearchAutomation'
import { 
  PAGE_DEPTH,
  PAGE_MARKER_ACTION
} from '../constants/automationConfig'
import { message } from 'antd'
import { TabManagerContentAPI } from '../../../services/messaging/tabManager'
import { delay } from '../utils/delayUtils'
/**
 * 决策引擎Hook
 * 负责自动化挖掘的决策逻辑，包括：
 * 1. 随缘挖掘（在所有页面自动提取）
 * 2. 非指定平台页面的自动处理
 * 3. 平台相关的挖掘策略决策
 * 4. 任务状态变化的处理
 */

export const useDecisionEngine = (backgroundState, emailProcessor, taskManager, setEmailList) => {
  const { casualMiningStatus, aiFirst } = backgroundState;
  const { extractCurrentPageEmails } = emailProcessor || {};
  const { selectedTask } = taskManager || {};

  const hasExecuted = useRef(false); // 使用 useRef 来保存执行状态

  const handleLandingPage = async () => {
    console.log('========== LandingPage处理开始 ==========')
    console.log('当前是LandingPage，开始进行停留、滚动、提取线索')
    
    // 获取当前页面的标记信息
    const pageMarker = await getPageMarker()
    console.log('LandingPage获取到页面标记:', pageMarker)
    
    try {
      const extractedData = await extractDataFromLandingPage({
        onCaptchaDetected: () => {
          console.log('在LandingPage检测到验证码')
        },
        onExtracted: (contact) => {
          console.log(`LandingPage提取到 ${contact.length} 个联系人`)
          setEmailList(contact)
        },
        ai: aiFirst,
        isManual: false
      })
      
      let finalExtractedData = null
      
      if (extractedData && extractedData.length > 0) {
        console.log(`提取到 ${extractedData.length} 条线索:`, extractedData)
        
        // 为每个联系人添加task_id
        const contactsWithTaskId = extractedData.map((contact) => ({
          ...contact,
          task_id: selectedTask?.id || 1,
        }))
        console.log(`为每个联系人添加task_id:`, contactsWithTaskId)
        
        // 提交到服务器
        const success = await emailProcessor.submitEmailLead(contactsWithTaskId, {
          forceSubmit: true,
          ai: aiFirst,
          isManual: false
        })
        
        if (success) {
          console.log('提交成功')
          message.success('提交成功')
          finalExtractedData = contactsWithTaskId
        } else {
          console.log('提交失败')
        }
      } else {
        console.log('LandingPage未提取到线索')
      }
      console.log('LandingPage提取完成，通知SERP继续处理下一个链接')
        
      await setPageMarker({
        from: PAGE_DEPTH.LANDING_PAGE,    // 来自LandingPage
        to: PAGE_DEPTH.SERP,              // 发给SERP页面
        action: PAGE_MARKER_ACTION.NEXT,  // 要求继续下一个操作
        keyword: pageMarker.keyword,
        taskId: pageMarker.taskId,
        resultUrl: pageMarker.resultUrl,
        data: {
          extractedData: finalExtractedData,
          extractedCount: finalExtractedData ? finalExtractedData.length : 0
        }
      })

      await delay(1000)
      // 常规处理：关闭非Google搜索标签页
      TabManagerContentAPI.closeNonGoogleSearchTabs()
      
    } catch (error) {
      console.error('LandingPage处理失败:', error)
      
      // 如果有页面标记且来自SERP，仍然需要通知SERP继续
      if (pageMarker && pageMarker.from === PAGE_DEPTH.SERP) {
        console.log('LandingPage处理失败，但仍通知SERP继续处理下一个链接')
        
        await setPageMarker({
          from: PAGE_DEPTH.LANDING_PAGE,
          to: PAGE_DEPTH.SERP,
          action: PAGE_MARKER_ACTION.NEXT,
          keyword: pageMarker.keyword,
          taskId: pageMarker.taskId,
          resultUrl: pageMarker.resultUrl,
          data: {
            extractedData: null,
            extractedCount: 0,
            error: error.message
          }
        })
      }
    }
    
    console.log('========== LandingPage处理结束 ==========')
  }

  useEffect(() => {
    if (hasExecuted.current || casualMiningStatus !== 'cRunning') {
      console.log('已经执行过，或者casualMiningStatus不是cRunning，跳过后续逻辑')
      return; // 如果已经执行过，则跳过后续逻辑
    }

    const timer = setTimeout(async () => {
      const isLanding = await isLandingPage()
      if (isLanding) {
        handleLandingPage()
        return;
      }
      extractCurrentPageEmails({
        forceSubmit: true,
        ai: aiFirst,
        isManual: false
      });
    }, 1000); // 延迟1秒执行，确保页面稳定

    hasExecuted.current = true; // 标记为已执行

    return () => clearTimeout(timer);
  }, [casualMiningStatus, aiFirst]); // 依赖数组可以保持不变
};
