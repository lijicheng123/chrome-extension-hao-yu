import { useState, useCallback, useRef } from 'react'
import { message } from 'antd'
import { customerDevService } from '../../../services/api/leadsMining'
import { detectCaptcha } from '../utils/captchaDetector'
import { optimizeUrl } from '../utils/searchEngineUtils'
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
  const [currentPageEmails, setCurrentPageEmails] = useState([])

  const { currentSearchTerm, handleCaptchaDetected, taskStatus, emailList, registerEmail } =
    backgroundState

  /**
   * 仅从当前页面提取邮箱
   * @returns {Array} 邮箱列表
   */
  const extractCurrentPageEmails = useCallback(
    ({ forceSubmit = false } = {}) => {
      try {
        // 检测是否有验证码
        if (detectCaptcha()) {
          handleCaptchaDetected()
          return
        }

        const pageText = getPageText()

        // 清除之前标记的邮箱，防止重复标记
        clearMarkedEmails()

        const emails = matchEmailsInText(pageText)
        const uniqueEmails = removeDuplicates(emails)

        setCurrentPageEmails(uniqueEmails)
        if (uniqueEmails?.length > 0) {
          submitEmailLead(uniqueEmails, { forceSubmit })
        }
        return uniqueEmails
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
      if (!selectedTask?.id && !forceSubmit) return

      try {
        // 处理email参数，如果是数组则遍历提交，否则作为单个邮箱处理
        const emails = Array.isArray(email) ? email : [email]

        const submitEmails = []
        for (const singleEmail of emails) {
          submitEmails.push({
            // 联系人信息
            user_email: singleEmail, // 覆盖联系人邮箱
            user_name: singleEmail, // 覆盖联系人姓名
            user_function: '销售总监', // 联系人职位
            user_phone: '13800138000', // 联系人电话
            user_mobile: '13900139000', // 联系人手机
            user_website: 'https://personal.example.com', // 联系人网站
            user_street: '朝阳区建国路88号', // 联系人地址
            user_street2: '2号楼3层', // 联系人地址2
            user_city: '北京', // 联系人城市
            user_country_id: 233, // 联系人国家ID
            user_state_id: 13, // 联系人省份ID
            user_title_id: 3, // 联系人称谓ID

            // 公司信息
            company_name: '示例科技有限公司11', // 公司名称（必填）
            company_street: '朝阳区建国路88号', // 公司地址
            company_street2: '2号楼整栋', // 公司地址2
            company_city: '北京', // 公司城市
            company_country_id: 233, // 公司国家ID
            company_state_id: 13, // 公司省份ID
            company_phone: '010-12345678', // 公司电话
            company_email: singleEmail, // 覆盖公司邮箱
            company_website: 'https://www.example.com', // 公司网站

            // 线索信息
            thread_name: `${window.location.hostname}-${singleEmail}`,
            thread_type: 'lead', // 线索类型：lead(线索)或opportunity(商机)
            linkin_site: 'https://linkedin.com/in/zhangsan', // LinkedIn链接
            city: '北京', // 线索城市
            country_id: 233, // 线索国家ID
            state_id: 13, // 线索省份ID
            street: '朝阳区建国路88号', // 线索地址
            street2: '2号楼', // 线索地址2
            tag_names: ['潜在客户', '高价值', '科技行业'], // 标签名称列表
            priority: '2', // 优先级：0(低)、1(中)、2(高)、3(很高)
            // 来源信息
            leads_source_url: optimizeUrl(window.location.href),
            leads_target_url: optimizeUrl(window.location.href),
            task_id: selectedTask?.id || 2, // 关联的任务ID
            leads_keywords: forceSubmit ? '' : currentSearchTerm || window.location.pathname,
          })
        }
        await customerDevService.submitLead(submitEmails)
      } catch (error) {
        console.error('提交邮箱线索时出错:', error)
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
  }
}
