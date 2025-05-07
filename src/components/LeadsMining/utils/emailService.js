import { customerDevService } from '../../../services/api/leadsMining'
import {
  getPageText,
  matchEmailsInText,
  removeDuplicates,
  clearMarkedEmails,
} from './emailExtractor'
import { detectCaptcha } from './captchaDetector'
import { optimizeUrl } from './searchEngineUtils'

/**
 * 从当前页面提取邮箱
 * @param {Object} options - 配置选项
 * @param {Function} options.onCaptchaDetected - 检测到验证码时的回调
 * @param {Function} options.onExtracted - 提取完成时的回调，参数为找到的邮箱数组
 * @returns {Array} 提取的邮箱列表
 */
export const extractPageEmails = async ({ onCaptchaDetected, onExtracted } = {}) => {
  try {
    // 检测是否有验证码
    if (detectCaptcha()) {
      console.warn('检测到验证码，请手动处理')
      if (onCaptchaDetected && typeof onCaptchaDetected === 'function') {
        onCaptchaDetected()
      }
      return []
    }

    // 获取页面文本
    const pageText = getPageText()

    // 清除之前标记的邮箱，防止重复标记
    clearMarkedEmails()

    // 提取并去重邮箱
    const emails = matchEmailsInText(pageText)
    const uniqueEmails = removeDuplicates(emails)
    
    // 通知提取完成
    if (onExtracted && typeof onExtracted === 'function') {
      onExtracted(uniqueEmails)
    }
    
    return uniqueEmails
  } catch (error) {
    console.error('提取邮箱过程中出错:', error)
    return []
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
export const submitEmails = async (emails, { taskId = 2, searchTerm = '', onSuccess, onError } = {}) => {
  if (!emails || (Array.isArray(emails) && emails.length === 0)) {
    return false
  }
  
  try {
    // 处理单个邮箱或邮箱数组
    const emailArray = Array.isArray(emails) ? emails : [emails]
    
    // 构建提交数据
    const submitData = emailArray.map(email => ({
      // 联系人信息
      user_email: email,
      user_name: email,
      user_function: '销售总监',
      user_phone: '13800138000',
      user_mobile: '13900139000',
      user_website: 'https://personal.example.com',
      user_street: '朝阳区建国路88号',
      user_street2: '2号楼3层',
      user_city: '北京',
      user_country_id: 233,
      user_state_id: 13,
      user_title_id: 3,
      
      // 公司信息
      company_name: `${window.location.hostname}公司`,
      company_street: '朝阳区建国路88号',
      company_street2: '2号楼整栋',
      company_city: '北京',
      company_country_id: 233,
      company_state_id: 13,
      company_phone: '010-12345678',
      company_email: email,
      company_website: 'https://www.example.com',
      
      // 线索信息
      thread_name: `${window.location.hostname}-${email}`,
      thread_type: 'lead',
      linkin_site: 'https://linkedin.com/in/zhangsan',
      city: '北京',
      country_id: 233,
      state_id: 13,
      street: '朝阳区建国路88号',
      street2: '2号楼',
      tag_names: ['潜在客户', '高价值', '科技行业'],
      priority: '2',
      
      // 来源信息
      leads_source_url: optimizeUrl(window.location.href),
      leads_target_url: optimizeUrl(window.location.href),
      task_id: taskId,
      leads_keywords: searchTerm || window.location.pathname,
    }))
    
    // 提交数据
    await customerDevService.submitLead(submitData)
    
    // 提交成功回调
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess(emailArray)
    }
    
    return true
  } catch (error) {
    console.error('提交邮箱线索时出错:', error)
    
    // 提交失败回调
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
    onExtracted: options.onExtracted
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