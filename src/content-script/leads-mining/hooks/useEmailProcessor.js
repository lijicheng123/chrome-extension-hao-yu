import { useState, useCallback } from 'react'
import { message } from 'antd'
import { extractPageEmails, submitEmails } from '../utils/emailService'
import { scrollToEmail, highlightEmail, markEmails } from '../utils/emailUtils'

/**
 * 邮箱处理Hook
 * 负责邮箱的提取、处理和提交
 */
export const useEmailProcessor = (selectedTask, backgroundState) => {
  const [currentPageEmails, setCurrentPageEmails] = useState([])

  const { currentSearchTerm, handleCaptchaDetected, emailList, setEmailList } =
    backgroundState

  /**
   * 仅从当前页面提取邮箱
   * @returns {Array<{user_email: string, user_name?: string, user_function?: string, user_phone?: string, user_mobile?: string, company_name?: string, company_phone?: string, company_email?: string, company_website?: string, linkin_site?: string, tag_names?: string[]}>} 邮箱对象列表
   */
  const extractCurrentPageEmails = useCallback(
    async (options) => {
      const { forceSubmit = false, ai, isManual } = options
      try {
        // 提取邮箱，返回的是已经去重了的邮箱对象数组
        const emails = await extractPageEmails({
          onCaptchaDetected: handleCaptchaDetected,
          onExtracted: (foundEmails) => {
            setCurrentPageEmails(foundEmails)
          },
          ai,
          isManual
        })

        
        // 更新邮箱列表
        setEmailList(emails || [])
        
        if (emails?.length > 0 && (selectedTask?.id || forceSubmit)) {
          await submitEmailLead(emails, { forceSubmit })
        }
        
        return emails
      } catch (error) {
        console.error('提取当前页面邮箱时出错:', error)
        return []
      }
    },
    [handleCaptchaDetected, submitEmailLead, selectedTask?.id, currentSearchTerm],
  )

  /**
   * 提交邮箱线索到服务器
   * @param {Array<{user_email: string, user_name?: string, user_function?: string, user_phone?: string, user_mobile?: string, company_name?: string, company_phone?: string, company_email?: string, company_website?: string, linkin_site?: string, tag_names?: string[]}>} emailData - 邮箱对象数组
   * @param {Object} options - 选项
   * @param {boolean} options.forceSubmit - 是否强制提交
   */
  const submitEmailLead = useCallback(
    async (emailData, { forceSubmit = false } = {}) => {
      if (!selectedTask?.id && !forceSubmit) return false
      
      try {
        return await submitEmails(emailData, {
          taskId: selectedTask?.id,
          searchTerm: forceSubmit ? '' : currentSearchTerm || window.location.pathname
        })
      } catch (error) {
        console.error('提交邮箱线索时出错:', error)
        return false
      }
    },
    [selectedTask?.id, currentSearchTerm],
  )

  // 删除客户
  const handleDeleteCustomer = useCallback(
    (emailData) => {
      // 从当前页面邮箱列表中删除
      setCurrentPageEmails((prev) => 
        prev.filter((e) => e.user_email !== emailData.user_email)
      )

      // 如果在注册的邮箱列表中，也从中删除
      if (emailList.some(item => item.user_email === emailData.user_email)) {
        setEmailList(prev => 
          prev.filter(item => item.user_email !== emailData.user_email)
        )
        message.success(`已从列表中删除: ${emailData.user_email}`)
      }
    },
    [emailList, setEmailList],
  )

  // 定位到邮箱
  const locateEmail = useCallback((emailData) => {
    // 获取邮箱字符串
    const email = emailData.user_email
    if (!email) {
      message.error('邮箱地址无效')
      return
    }
    
    // 尝试查找带有 data-email 属性的元素
    const emailElement = document.querySelector(`[data-email='${email}']`)
    if (emailElement) {
      scrollToEmail(emailElement)
      highlightEmail(emailElement)
      return
    }
    
    // 如果找不到标记的元素，则尝试在页面中查找并标记邮箱
    const bodyText = document.body.innerText
    if (bodyText.includes(email)) {
      // 手动标记邮箱
      const markedElements = markEmails([email])
      if (markedElements && markedElements.length > 0) {
        setTimeout(() => {
          const newEmailElement = document.querySelector(`[data-email='${email}']`)
          if (newEmailElement) {
            scrollToEmail(newEmailElement)
            highlightEmail(newEmailElement)
          } else {
            message.error('邮箱已找到但无法定位，请使用 Ctrl+F 查找')
          }
        }, 500)
      } else {
        message.error('邮箱在页面中但无法标记，请使用 Ctrl+F 查找')
      }
    } else {
      message.error('这个邮箱不在当前页面中，请使用 Ctrl+F 查找')
    }
  }, [])

  return {
    extractCurrentPageEmails,
    currentPageEmails,
    handleDeleteCustomer,
    submitEmailLead,
    locateEmail,
  }
}
