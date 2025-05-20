import { matchEmailsInText, removeDuplicates, markEmails } from './emailUtils'
import Browser from 'webextension-polyfill'
import { initSession } from '../../../services/init-session.mjs'
import { message } from 'antd'
// zindex 最大
message.config({
  zIndex: 2147483647,
});

export function getPageText() {
  const bodyText = document.body.innerText
  return bodyText
}

/**
 * 提取所有邮箱
 * @param {Object} options - 配置选项
 * @param {boolean} options.ai - 是否使用AI提取
 * @returns {Promise<Array<{user_email: string, user_name?: string, user_function?: string, user_phone?: string, user_mobile?: string, company_name?: string, company_phone?: string, company_email?: string, company_website?: string, linkin_site?: string, tag_names?: string[]}>>} 邮箱对象数组
 */
export const extractAllEmails = async (options) => {
  const pageText = getPageText()
  if (!/@/.test(pageText) && options?.isManual !== true) {
    message.info('页面中没有邮箱，不提取~')
    return []
  }
  if (options?.ai !== true) {
    const emails = matchEmailsInText(pageText)
    const uniqueEmails = await removeDuplicates(emails)
    
    // 先将邮箱字符串转为对象
    const emailObjects = uniqueEmails.map(email => ({
      user_email: email,
      user_name: email
    }))
    
    // 标记邮箱
    setTimeout(() => {
      // 这里传递原始的邮箱字符串数组，因为 markEmails 函数需要字符串来匹配页面内容
      markEmails(uniqueEmails)
    }, 1000)

    console.log('字符串方式获取到了线索信息:', emailObjects)
    
    return emailObjects
  } else {
    // 获取页面描述和URL
    const pageDescription = document.querySelector('meta[name="description"]')?.content || ''
    const pageTitle = document.title
    const currentUrl = window.location.href
    const pageInfo = {
      url: currentUrl,
      title: pageTitle,
      description: pageDescription,
      content: pageText
    }

    // 调用AI的能力提取邮箱、电话号码、WhatsApp等信息
    const prompt = `你是外贸业务员，从网页提取联系人信息用于商业开发。目标：返回标准化JSON数组，无有效邮箱则返回[]。

字段说明：
user_email: 必填真实邮箱
user_name: 优先取姓名，否则用邮箱前缀
user_function: 优先根据页面内容提取，否则合理推测，如果不确定则置空
user_phone: 座机，国际格式
user_mobile: 手机，国际格式
company_name: 从URL/meta/内容中提取
company_website: 优先官网链接，其次页脚/搜索推断，否则用当前页面域名地址，url格式
linkedin_site: LinkedIn主页，url格式
tag_names: 根据内容生成1-3标签，无法确定则空
user_street/user_street2/user_city/user_state/user_zip/user_country: 提取地址信息
user_website: 用户个人网站,url格式
user_linkedin: LinkedIn个人资料，url格式
user_facebook: Facebook个人资料，url格式

规则：
- 不确定的字段留空，不填“未知”
- 合并重复联系人，不同公司分开
- 无有效邮箱返回[]

示例输出：
[{
  "user_email": "john.doe@example.com",
  "user_name": "John Doe",
  "user_function": "Marketing Director",
  "user_phone": "+1 555 123 4567",
  "user_mobile": "",
  "company_name": "Example Inc.",
  "company_website": "https://www.example.com",
  "linkedin_site": "https://www.linkedin.com/in/johndoe",
  "tag_names": ["Marketing", "SaaS"],
  "user_street": "123 Main St",
  "user_street2": "Suite 400",
  "user_city": "New York",
  "user_state": "NY",
  "user_zip": "10001",
  "user_country": "United States",
  "user_website": "https://www.website.com",
  "user_linkedin": "https://www.linkedin.com/in/johndoe",
  "user_facebook": ""
}]`

    const port = Browser.runtime.connect()
    message.loading('AI正在提取线索信息...')
    const response = await new Promise((resolve, reject) => {
      const messageListener = (msg) => {
        if (msg.error) {
          reject(msg.error)
        }
        if (msg.done) {
          resolve(msg.answer)
        }
      }

      port.onMessage.addListener(messageListener)

      const session = initSession({
        question: prompt + "\n\n网页信息：\n" + JSON.stringify(pageInfo, null, 2),
        conversationRecords: [],
        modelName: 'doubao-1-5-lite-32k-250115', // 使用豆包模型
        stream: false, // 使用非流式响应
        temperature: 0.01,
        top_k: 0.9,
      })

      const postMessage = async ({ session, stop }) => {
        // 直接使用background执行API请求
        port.postMessage({ session, stop })
      }

      postMessage({ session })
    })

    try {
      const result = JSON.parse(response)
      console.log('AI方式获取到了线索信息:', result)
      message.destroy()
      message.success('AI提取线索信息成功')
      
      // 从结果中提取邮箱字符串用于标记
      const emailStrings = result.map(item => item.user_email).filter(Boolean)
      if (emailStrings.length > 0) {
        setTimeout(() => {
          markEmails(emailStrings)
        }, 1000)
      }
      
      return result
    } catch (e) {
      message.destroy()
      message.error('AI提取线索信息失败,请重试~')
      console.error("Failed to parse AI response:", e)
      return []
    }
  }
}
