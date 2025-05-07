import { useState, useCallback, useRef } from 'react'
import { message } from 'antd'
import { extractPageEmails, submitEmails } from '../utils/emailService'
import { scrollToEmail, highlightEmail } from '../utils/emailExtractor'

/**
 * 邮箱处理Hook
 * 负责邮箱的提取、处理和提交
 */
export const useEmailProcessor = (selectedTask, backgroundState) => {
  const [editingEmail, setEditingEmail] = useState(null)
  const [newEmailValue, setNewEmailValue] = useState('')
  const [newNoteValue, setNewNoteValue] = useState('')
  const [currentPageEmails, setCurrentPageEmails] = useState([])

  const { currentSearchTerm, handleCaptchaDetected, emailList, setEmailList } =
    backgroundState

  /**
   * 仅从当前页面提取邮箱
   * @returns {Array} 邮箱列表
   */
  const extractCurrentPageEmails = useCallback(
    async ({ forceSubmit = false } = {}) => {
      try {
        // 提取邮箱，返回的是已经去重了的
        const emails = await extractPageEmails({
          onCaptchaDetected: handleCaptchaDetected,
          onExtracted: (foundEmails) => {
            setCurrentPageEmails(foundEmails)
          }
        })
        // 更新邮箱列表，里边会存储的
        setEmailList((prev = []) => [...prev, ...emails])
        
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
   * @param {string|string[]} email - 单个邮箱或邮箱数组
   * @param {Object} options - 选项
   * @param {boolean} options.forceSubmit - 是否强制提交
   */
  const submitEmailLead = useCallback(
    async (email, { forceSubmit = false } = {}) => {
      if (!selectedTask?.id && !forceSubmit) return false
      
      try {
        return await submitEmails(email, {
          taskId: selectedTask?.id || 2,
          searchTerm: forceSubmit ? '' : currentSearchTerm || window.location.pathname
        })
      } catch (error) {
        console.error('提交邮箱线索时出错:', error)
        return false
      }
    },
    [selectedTask?.id, currentSearchTerm],
  )

  // 打开编辑邮箱模态框
  const handleEditEmail = useCallback((email) => {
    setEditingEmail(email)
    setNewEmailValue(email)
    setNewNoteValue('')
  }, [])

  // 更新邮箱
  const handleUpdateEmail = useCallback(() => {
    // 实现邮箱更新逻辑
    setEditingEmail(null)
  }, [])

  // 删除客户
  const handleDeleteCustomer = useCallback(
    (email) => {
      // 从当前页面邮箱列表中删除
      setCurrentPageEmails((prev) => prev.filter((e) => e !== email))

      // 如果在注册的邮箱列表中，也从中删除
      if (emailList.includes(email)) {
        // 这里可以调用后端API删除邮箱
        message.success(`已从列表中删除: ${email}`)
      }
    },
    [emailList],
  )

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

  console.log('currentPageEmails=====>1:', currentPageEmails)
  return {
    extractCurrentPageEmails,
    currentPageEmails,
    editingEmail,
    newEmailValue,
    newNoteValue,
    setNewEmailValue,
    setNewNoteValue,
    handleEditEmail,
    handleUpdateEmail,
    handleDeleteCustomer,
    setEditingEmail,
    submitEmailLead,
    locateEmail,
  }
}
