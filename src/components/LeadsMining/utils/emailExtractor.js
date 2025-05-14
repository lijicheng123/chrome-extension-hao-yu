import { matchEmailsInText, removeDuplicates, markEmails } from './emailUtils'
import Browser from 'webextension-polyfill'
import { getUserConfig, isUsingBingWebModel } from '../../../config/index.mjs'
import { generateAnswersWithBingWebApi } from '../../../services/apis/bing-web.mjs'
import { handlePortError } from '../../../services/wrappers.mjs'
import { initSession } from '../../../services/init-session.mjs'
import { isUsingModelName } from '../../../utils'
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
    const prompt = `分析网站内容提取联系人信息，返回JSON数组。格式：
[{
  "user_email": "",
  "user_name": "",
  "user_function": "",
  "user_phone": "",
  "user_mobile": "",
  "company_name": "",
  "company_phone": "",
  "company_email": "",
  "company_website": "",
  "linkin_site": "",
  "tag_names": []
}]

规则：
1. 数据提取：
   - 邮箱：公司邮箱作为company_email，其他作为user_email
   - 电话：座机作为company_phone，手机作为user_mobile
   - 公司：从URL和页面描述提取公司名称
   - 网站：优先使用页面中的网站地址，其次使用URL域名

2. 信息补充：
   - 职位：根据内容推测职位，不确定则不返回
   - 标签：根据行业、业务、产品等推测生成1-3个标签，推测不出来则不返回
   - 姓名：优先从内容提取，其次使用邮箱前缀

3. 数据要求：
   - 邮箱为必填，无邮箱则返回空数组
   - 不确定的信息不返回，不写"未知"
   - 移除特殊字符，统一格式
   - 相同联系人合并信息，不同公司分开创建

4. 输出要求：
   - 只返回JSON数组，不需要任何解释或者其他内容
   - 无信息则返回空数组[]`

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
        question: prompt + "\n\n页面信息：\n" + JSON.stringify(pageInfo, null, 2),
        conversationRecords: []
      })

      const postMessage = async ({ session, stop }) => {
        const useForegroundFetch = isUsingBingWebModel(session)
        if (useForegroundFetch) {
          try {
            const bingToken = (await getUserConfig()).bingAccessToken
            if (isUsingModelName('bingFreeSydney', session)) {
              await generateAnswersWithBingWebApi(port, session.question, session, bingToken, true)
            } else {
              await generateAnswersWithBingWebApi(port, session.question, session, bingToken)
            }
          } catch (err) {
            handlePortError(session, port, err)
            reject(err)
          }
        } else {
          port.postMessage({ session, stop })
        }
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
