import { useState, useCallback } from 'react'
import { message } from 'antd'
import { customerDevService } from '../../../services/api/leadsMining'
import { detectCaptcha } from '../utils/captchaDetector'
import {
  getPageText,
  matchEmailsInText,
  removeDuplicates,
  clearMarkedEmails,
} from '../utils/emailExtractor'

/**
 * 邮箱处理Hook
 * 负责邮箱的提取、处理和提交
 */
export const useEmailProcessor = (selectedTask, backgroundState) => {
  const [editingEmail, setEditingEmail] = useState(null)
  const [newEmailValue, setNewEmailValue] = useState('')
  const [newNoteValue, setNewNoteValue] = useState('')

  const { currentSearchTerm, handleCaptchaDetected, taskStatus, emailList, registerEmail } =
    backgroundState

  // 提取并处理邮箱
  const extractAndProcessEmails = useCallback(() => {
    if (taskStatus !== 'running') return

    try {
      // 检测是否有验证码
      if (detectCaptcha()) {
        handleCaptchaDetected()
        return
      }

      // 清除之前标记的邮箱，防止重复标记
      clearMarkedEmails()

      const pageText = getPageText()
      const emails = matchEmailsInText(pageText)
      const uniqueEmails = removeDuplicates(emails)

      // 处理新发现的邮箱
      uniqueEmails.forEach((email) => {
        if (!emailList.includes(email)) {
          registerEmail(email)
          submitEmailLead(email)
        }
      })

      return uniqueEmails
    } catch (error) {
      console.error('提取邮箱时出错:', error)
      return []
    }
  }, [taskStatus, handleCaptchaDetected, emailList, registerEmail])

  // 提交邮箱线索到服务器
  const submitEmailLead = useCallback(
    async (email) => {
      if (!selectedTask) return

      try {
        await customerDevService.submitEmailLead({
          email,
          searchTerm: currentSearchTerm,
          taskId: selectedTask.id,
        })
      } catch (error) {
        console.error('提交邮箱线索时出错:', error)
      }
    },
    [selectedTask, currentSearchTerm],
  )

  // 打开编辑邮箱模态框
  const openEditModal = useCallback((email) => {
    setEditingEmail(email)
    setNewEmailValue(email)
    setNewNoteValue('')
  }, [])

  // 关闭编辑邮箱模态框
  const closeEditModal = useCallback(() => {
    setEditingEmail(null)
    setNewEmailValue('')
    setNewNoteValue('')
  }, [])

  // 保存编辑后的邮箱
  const saveEditedEmail = useCallback(async () => {
    if (!editingEmail || !newEmailValue) return

    try {
      // 更新邮箱
      // TODO: 实现邮箱更新逻辑

      message.success('邮箱更新成功')
      closeEditModal()
    } catch (error) {
      console.error('保存编辑邮箱时出错:', error)
      message.error('邮箱更新失败')
    }
  }, [editingEmail, newEmailValue, newNoteValue, closeEditModal])

  return {
    extractAndProcessEmails,
    editingEmail,
    newEmailValue,
    newNoteValue,
    setNewEmailValue,
    setNewNoteValue,
    openEditModal,
    closeEditModal,
    saveEditedEmail,
  }
}
