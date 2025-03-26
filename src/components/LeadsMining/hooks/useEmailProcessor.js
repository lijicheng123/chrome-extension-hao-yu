import { useState, useCallback, useRef } from 'react'
import { message } from 'antd'
import { customerDevService } from '../../../services/api/leadsMining'
import { detectCaptcha } from '../utils/captchaDetector'
import {
  getPageText,
  matchEmailsInText,
  removeDuplicates,
  clearMarkedEmails,
} from '../utils/emailExtractor'
import { debounce } from '../utils/searchEngineUtils'

/**
 * 邮箱处理Hook
 * 负责邮箱的提取、处理和提交
 */
export const useEmailProcessor = (selectedTask, backgroundState) => {
  const [editingEmail, setEditingEmail] = useState(null)
  const [newEmailValue, setNewEmailValue] = useState('')
  const [newNoteValue, setNewNoteValue] = useState('')
  const [currentPageEmails, setCurrentPageEmails] = useState([])

  // 上次处理的页面文本和邮箱缓存
  const lastProcessedText = useRef('')
  const lastExtractedEmails = useRef([])

  const { currentSearchTerm, handleCaptchaDetected, taskStatus, emailList, registerEmail } =
    backgroundState

  // 从当前页面提取邮箱
  const extractCurrentPageEmails = useCallback(() => {
    try {
      debugger
      // 检测是否有验证码
      if (detectCaptcha()) {
        handleCaptchaDetected()
        return
      }

      const pageText = getPageText()

      // 如果页面文本没有变化，直接返回上次的结果
      if (pageText === lastProcessedText.current) {
        return lastExtractedEmails.current
      }

      // 更新上次处理的页面文本
      lastProcessedText.current = pageText

      // 清除之前标记的邮箱，防止重复标记
      clearMarkedEmails()

      const emails = matchEmailsInText(pageText)
      const uniqueEmails = removeDuplicates(emails)

      // 更新上次提取的邮箱
      lastExtractedEmails.current = uniqueEmails

      setCurrentPageEmails(uniqueEmails)
      return uniqueEmails
    } catch (error) {
      console.error('提取当前页面邮箱时出错:', error)
      return []
    }
  }, [])

  // 提交当前页面所有邮箱线索
  const submitCurrentPageEmails = useCallback(async () => {
    if (!selectedTask) {
      message.error('请先选择任务')
      return
    }

    const emails = extractCurrentPageEmails()
    if (emails.length === 0) {
      message.info('当前页面未发现邮箱')
      return
    }

    try {
      for (const email of emails) {
        // 统一使用submitEmailLead方法提交邮箱线索
        await submitEmailLead(email)
        // 注册到本地列表
        if (!emailList.includes(email)) {
          registerEmail(email)
        }
      }

      message.success(`成功提交 ${emails.length} 个邮箱线索`)
    } catch (error) {
      console.error('提交邮箱线索时出错:', error)
      message.error(`提交邮箱线索失败: ${error.message}`)
    }
  }, [selectedTask, currentSearchTerm, emailList, registerEmail, extractCurrentPageEmails])

  // 提交邮箱线索到服务器
  const submitEmailLead = useCallback(
    async (email) => {
      if (!selectedTask) return

      try {
        // 使用submitLeadWithTemplate方法，保留示例数据
        await customerDevService.submitLeadWithTemplate({
          user_email: email, // 覆盖联系人邮箱
          company_email: email, // 覆盖公司邮箱
          task_id: selectedTask.id, // 关联的任务ID
          leads_source_url: window.location.href,
          leads_target_url: window.location.href,
          leads_keywords: currentSearchTerm || window.location.pathname,
        })
      } catch (error) {
        console.error('提交邮箱线索时出错:', error)
      }
    },
    [selectedTask, currentSearchTerm],
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

  return {
    extractCurrentPageEmails,
    submitCurrentPageEmails,
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
  }
}
