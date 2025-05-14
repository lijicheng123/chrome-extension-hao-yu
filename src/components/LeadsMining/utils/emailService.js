import { customerDevService } from '../../../services/api/leadsMining'
import { extractAllEmails } from './emailExtractor'
import { detectCaptcha } from './captchaDetector'
import { optimizeUrl } from './searchEngineUtils'

/**
 * 从当前页面提取邮箱
 * @param {Object} options - 配置选项
 * @param {Function} options.onCaptchaDetected - 检测到验证码时的回调
 * @param {Function} options.onExtracted - 提取完成时的回调，参数为找到的邮箱数组
 * @returns {Array} 提取的邮箱列表
 */
export const extractPageEmails = async ({ onCaptchaDetected, onExtracted, ai } = {}) => {
  try {
    if (detectCaptcha()) {
      console.warn('检测到验证码，请手动处理')
      if (onCaptchaDetected && typeof onCaptchaDetected === 'function') {
        onCaptchaDetected()
      }
      return []
    }
    const emails = await extractAllEmails({ ai })
    if (onExtracted && typeof onExtracted === 'function') {
      onExtracted(emails)
    }
    
    return emails
  } catch (error) {
    console.error('提取邮箱过程中出错:', error)
    return []
  }
}

/**
 * 构建提交数据
 * @param {string | Object} email - 邮箱地址
 * @param {Object} options - 提交选项
 * @returns {Object} 提交数据对象
 */
const buildSubmitData = (email, { taskId, searchTerm }) => {
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
    leads_keywords: searchTerm || window.location.pathname,
  }

  // 处理 email 参数
  if (typeof email === 'object') {
    const userEmail = email.user_email || email.email || ''
    return {
      ...baseData,
      // 联系人信息
      user_email: userEmail,
      user_name: email.user_name || userEmail,
      // 公司信息
      company_name: email.company_name || hostname,
      company_email: userEmail,
      // 线索信息
      thread_name: `${hostname}-${userEmail}`,
      // 合并传入的 email 对象中的其他字段
      ...email
    }
  }

  // 处理 email 为字符串的情况
  return {
    ...baseData,
    // 联系人信息
    user_email: email,
    user_name: email,
    // 公司信息
    company_name: hostname,
    company_email: email,
    // 线索信息
    thread_name: `${hostname}-${email}`,
  }
}

/**
 * 提交邮箱到服务器
 * @param {Array|String} emails - 要提交的邮箱，可以是单个邮箱或邮箱数组
 * @param {Object} options - 提交选项
 * @param {Number} options.taskId - 任务ID
 * @param {String} options.searchTerm - 搜索关键词
 * @param {Function} options.onSuccess - 提交成功的回调
 * @param {Function} options.onError - 提交失败的回调
 * @returns {Promise<boolean>} 是否提交成功
 */
export const submitEmails = async (emails, { taskId = 1, searchTerm = '', onSuccess, onError } = {}) => {
  if (!emails || (Array.isArray(emails) && emails.length === 0)) {
    return false
  }
  
  try {
    const emailArray = Array.isArray(emails) ? emails : [emails]
    const submitData = emailArray.map(email => buildSubmitData(email, { taskId, searchTerm }))
    await customerDevService.submitLead(submitData)
    
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess(emailArray)
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
 * @returns {Promise<Array>} 提取并提交的邮箱列表
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