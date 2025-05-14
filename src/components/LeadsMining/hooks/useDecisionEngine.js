import { useEffect } from 'react'
/**
 * 搜索引擎Hook
 * 负责搜索执行和页面处理
 */
export const useDecisionEngine = (backgroundState, emailProcessor) => {

  // 从backgroundState中解构出需要的属性
  const { casualMiningStatus, aiFirst } = backgroundState

  // 提取邮箱的函数
  const { extractCurrentPageEmails } = emailProcessor || {}

  // 所有页面（随缘挖掘）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (casualMiningStatus === 'cRunning') {
        extractCurrentPageEmails({ forceSubmit: true, ai: aiFirst })
      }
    }, 1000) // 延迟1秒执行
    return () => clearTimeout(timer)
  }, [casualMiningStatus, aiFirst])

}
