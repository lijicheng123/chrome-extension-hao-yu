import { pushRecord, setAbortController } from './shared.mjs'
import { fetchSSE } from '../../utils/fetch-sse.mjs'
import { getConversationPairs } from '../../utils/get-conversation-pairs.mjs'
import { getUserConfig } from '../../config/index.mjs'
import { isEmpty } from 'lodash-es'
import { API_CONFIG } from '../../constants/api.js'
const baseUrl = API_CONFIG.DOUBAO_BASE_URL
const apiKey = API_CONFIG.DOUBAO_API_KEY
/**
 * 使用豆包API生成回答（非流式)
 * @param {Browser.Runtime.Port} port - 连接端口
 * @param {string} question - 用户问题
 * @param {Session} session - 会话信息
 * @param {Object} options - 选项
 * @param {boolean} options.stream - 是否使用流式响应，默认为true
 */
export async function generateAnswersWithDoubaoApi(port, question, session, options = {}) {
  const { stream = true } = options

  if (stream) {
    return generateAnswersWithDoubaoStreamApi(port, question, session)
  } else {
    return generateAnswersWithDoubaoNonStreamApi(port, question, session)
  }
}

/**
 * 使用豆包API生成回答（非流式)
 * @param {Browser.Runtime.Port} port - 连接端口
 * @param {string} question - 用户问题
 * @param {Session} session - 会话信息
 */
async function generateAnswersWithDoubaoNonStreamApi(port, question, session) {
  const { controller, messageListener, disconnectListener } = setAbortController(port)
  const config = await getUserConfig()

  try {
    const prompt = getConversationPairs(
      session.conversationRecords.slice(-config.maxConversationContextLength),
      false,
    )
    prompt.push({ role: 'user', content: question })
    prompt.push({ role: 'assistant', content: '[' })

    const apiUrl = `${baseUrl}/api/v3/chat/completions`
    // 构建请求体
    const requestBody = {
      provider_id: 1,
      model: 'doubao-1-5-lite-32k-250115', // 默认使用豆包模型
      messages: prompt,
    }

    // 发送到后台执行API请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })
    console.log('response:::', response)
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    const responseData = await response.json()
    console.log('responseData:::', responseData)
    // 提取AI回答
    const answer = `[${responseData?.choices?.[0]?.message?.content}`

    // 更新会话并发送响应
    pushRecord(session, question, answer)
    port.postMessage({ answer, done: true, session })
  } catch (error) {
    console.error('豆包API调用失败:', error)
    port.postMessage({
      error: error.message || '调用豆包API失败',
      done: true,
    })
  } finally {
    port.onMessage.removeListener(messageListener)
    port.onDisconnect.removeListener(disconnectListener)
  }
}

/**
 * 使用豆包API生成回答（流式)
 * @param {Browser.Runtime.Port} port - 连接端口
 * @param {string} question - 用户问题
 * @param {Session} session - 会话信息
 */
async function generateAnswersWithDoubaoStreamApi(port, question, session) {
  const { controller, messageListener, disconnectListener } = setAbortController(port)
  const config = await getUserConfig()
  const prompt = getConversationPairs(
    session.conversationRecords.slice(-config.maxConversationContextLength),
    false,
  )
  prompt.push({ role: 'user', content: question })

  let answer = ''
  let finished = false

  const finish = () => {
    finished = true
    pushRecord(session, question, answer)
    console.debug('conversation history', { content: session.conversationRecords })

    port.postMessage({ answer, done: true, session: session })
  }

  const apiUrl = `${baseUrl}/api/v3/chat/completions`

  await fetchSSE(apiUrl, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      provider_id: 1,
      model: 'doubao-1-5-lite-32k-250115',
      messages: prompt,
      stream: true,
    }),
    onMessage(message) {
      console.debug('sse message', message)
      if (finished) return

      if (message.trim() === '[DONE]') {
        finish()
        return
      }

      let data
      try {
        data = JSON.parse(message)
      } catch (error) {
        console.debug('json error', error)
        return
      }

      // 根据豆包API的响应格式解析数据
      if (data.result?.choices?.[0]?.delta?.content) {
        answer += data.result.choices[0].delta.content
      }

      port.postMessage({ answer: answer, done: false, session: null })

      if (data.result?.choices?.[0]?.finish_reason) {
        finish()
        return
      }
    },
    async onStart() {},
    async onEnd() {
      port.postMessage({ done: true, answer })
      port.onMessage.removeListener(messageListener)
      port.onDisconnect.removeListener(disconnectListener)
    },
    async onError(resp) {
      port.onMessage.removeListener(messageListener)
      port.onDisconnect.removeListener(disconnectListener)
      if (resp instanceof Error) throw resp
      const error = await resp.json().catch(() => ({}))
      throw new Error(!isEmpty(error) ? JSON.stringify(error) : `${resp.status} ${resp.statusText}`)
    },
  })
}
