import { customerDevService } from '../../../services/api/leadsMining'
import { extractAllEmails } from './emailExtractor'
import { detectCaptcha } from './captchaDetector'
import { optimizeUrl } from './searchEngineUtils'
import { addContactsToStorage } from './../hooks/usePlatformStorage'

/**
 * 从当前页面提取邮箱
 * @param {Object} options - 配置选项
 * @param {Function} options.onCaptchaDetected - 检测到验证码时的回调
 * @param {Function} options.onExtracted - 提取完成时的回调，参数为找到的邮箱对象数组
 * @returns {Array<{user_email: string, user_name?: string, user_function?: string, user_phone?: string, user_mobile?: string, company_name?: string, company_phone?: string, company_email?: string, company_website?: string, linkin_site?: string, tag_names?: string[]}>} 提取的邮箱对象列表
 */
export const extractPageEmails = async (options) => {
  const { onCaptchaDetected, onExtracted } = options
  try {
    if (detectCaptcha()) {
      console.warn('检测到验证码，请手动处理')
      if (onCaptchaDetected && typeof onCaptchaDetected === 'function') {
        onCaptchaDetected()
      }
      return []
    }
    const emails = await extractAllEmails(options)
    // 在这里将联系方式添加到全局存储
    if (emails.length > 0) {
      await addContactsToStorage(emails)
    }
    
    if (onExtracted && typeof onExtracted === 'function') {
      onExtracted(emails)
    }

    console.log('extractPageEmails:::', emails)
    
    return emails
  } catch (error) {
    console.error('提取邮箱过程中出错:', error)
    return []
  }
}

/**
 * 构建提交数据
 * @param {Object} emailData - 邮箱对象
 * @param {Object} options - 提交选项
 * @returns {Object} 提交数据对象
 */
const buildSubmitData = (emailData, { taskId, searchTerm }) => {
  const hostname = window.location.hostname
  const currentUrl = optimizeUrl(window.location.href)

  // 基础数据模板
  const baseData = {
    // 联系人信息
    // user_function: '销售总监',
    // user_phone: '13800138000',
    // user_mobile: '13900139000',
    // user_website: 'https://personal.example.com',
    // user_street: '朝阳区建国路88号',
    // user_street2: '2号楼3层',
    // user_city: '北京',
    // user_country_id: 233,
    // user_state_id: 13,
    // user_title_id: 3,
    
    // 公司信息
    // company_street: '朝阳区建国路88号',
    // company_street2: '2号楼整栋',
    // company_city: '北京',
    // company_country_id: 233,
    // company_state_id: 13,
    // company_phone: '010-12345678',
    // company_website: 'https://www.example.com',
    
    // 线索信息
    thread_type: 'lead',
    linkin_site: '',
    // city: '北京',
    // country_id: 233,
    // state_id: 13,
    // street: '朝阳区建国路88号',
    // street2: '2号楼',
    priority: '2',
    
    // 来源信息
    leads_source_url: currentUrl,
    leads_target_url: currentUrl,
    task_id: taskId,
    leads_keywords: searchTerm,
  }

  const userEmail = emailData.user_email || ''
  return {
    ...baseData,
    // 联系人信息
    user_email: userEmail,
    user_name: emailData.user_name || userEmail,
    // 公司信息
    // company_name: emailData.company_name || hostname,
    // company_email: userEmail,
    // 线索信息
    thread_name: `${hostname}-${userEmail || emailData.user_name}`,
    // 合并传入的 email 对象中的其他字段
    ...emailData
  }
}

/**
 * 提交邮箱到服务器
 * @param {Array<{user_email: string, user_name?: string, user_function?: string, user_phone?: string, user_mobile?: string, company_name?: string, company_phone?: string, company_email?: string, company_website?: string, linkin_site?: string, tag_names?: string[]}>} emails - 要提交的邮箱对象数组
 * @param {Object} options - 提交选项
 * @param {Number} options.taskId - 任务ID
 * @param {String} options.searchTerm - 搜索关键词
 * @param {Function} options.onSuccess - 提交成功的回调
 * @param {Function} options.onError - 提交失败的回调
 * @returns {Promise<boolean>} 是否提交成功
 */
export const submitEmails = async (emails, { taskId = 1, searchTerm = '', onSuccess, onError } = {}) => {
  if (!emails || emails.length === 0) {
    return false
  }
  
  try {
    const submitData = emails.map(email => buildSubmitData(email, { taskId, searchTerm }))
    await customerDevService.submitLead(submitData)
    
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess(emails)
    }
    
    return true
  } catch (error) {
    console.error('提交邮箱线索时出错:', error)
    
    if (onError && typeof onError === 'function') {
      onError(error)
    }
    
    return false
  }
}

/**
 * 一键完成提取和提交
 * 提取当前页面的邮箱并直接提交
 * @param {Object} options - 配置选项
 * @returns {Promise<Array<{user_email: string, user_name?: string, user_function?: string, user_phone?: string, user_mobile?: string, company_name?: string, company_phone?: string, company_email?: string, company_website?: string, linkin_site?: string, tag_names?: string[]}>>} 提取并提交的邮箱对象列表
 */
export const extractAndSubmitEmails = async (options = {}) => {
  const emails = await extractPageEmails({
    onCaptchaDetected: options.onCaptchaDetected,
    onExtracted: options.onExtracted,
    ai: options.ai
  })

  if (emails.length > 0) {
    await submitEmails(emails, {
      taskId: options.taskId,
      searchTerm: options.searchTerm,
      onSuccess: options.onSubmitSuccess,
      onError: options.onSubmitError
    })
  }
  
  return emails
} 