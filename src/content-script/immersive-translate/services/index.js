// 翻译服务管理模块
import { getUserConfig } from '../../../config/index.mjs'
import Browser from 'webextension-polyfill'

// 翻译服务配置
export const TRANSLATE_SERVICES = {
  // 免费服务
  google_free: {
    name: 'Google Translate (免费)',
    type: 'free',
    maxLength: 5000,
    rateLimit: '100/hour',
    languages: ['zh-CN', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'it', 'pt'],
    description: '免费的Google翻译API，有使用限制'
  },
  microsoft_free: {
    name: 'Microsoft Translator (免费)',
    type: 'free', 
    maxLength: 5000,
    rateLimit: '2M字符/月',
    languages: ['zh-CN', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'it', 'pt'],
    description: '微软翻译免费层，每月2M字符'
  },
  
  // 现有AI服务（利用项目现有的AI模型）
  ai_model: {
    name: '内置AI模型',
    type: 'ai',
    maxLength: 8000,
    pricing: '根据AI模型收费',
    languages: ['zh-CN', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru'],
    description: '使用项目配置的AI模型进行翻译'
  }
}

// 翻译服务接口类
class TranslationService {
  constructor(serviceId, config = {}) {
    this.serviceId = serviceId
    this.config = config
    this.serviceInfo = TRANSLATE_SERVICES[serviceId]
  }

  // eslint-disable-next-line no-unused-vars
  async translate(text, targetLang, sourceLang = 'auto', customPrompt = null) {
    throw new Error('Translation method must be implemented by subclass')
  }

  // 默认批量翻译实现（逐个翻译）
  // eslint-disable-next-line no-unused-vars
  async batchTranslate(texts, targetLang, sourceLang = 'auto', customPrompt = null) {
    const results = []
    
    for (const text of texts) {
      try {
        const result = await this.translate(text, targetLang, sourceLang, customPrompt)
        results.push({
          ...result,
          originalText: text
        })
      } catch (error) {
        results.push({
          text: text,
          error: error.message,
          service: this.serviceId,
          originalText: text
        })
      }
      
      // 添加延迟避免频率限制
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    
    return results
  }

  validateText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('文本不能为空')
    }
    
    if (text.length > this.serviceInfo.maxLength) {
      throw new Error(`文本长度超过限制（${this.serviceInfo.maxLength}字符）`)
    }
    
    return true
  }
}

// Google 免费翻译服务
class GoogleFreeService extends TranslationService {
  async translate(text, targetLang, sourceLang = 'auto', customPrompt = null) {
    this.validateText(text)
    
    try {
      if (customPrompt) {
        console.log('Google Free服务不支持自定义Prompt，将使用默认翻译')
      }
      
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      const translatedText = data[0].map(item => item[0]).join('')
      
      return {
        text: translatedText,
        sourceLang: data[2],
        service: this.serviceId
      }
    } catch (error) {
      console.error('Google Free translation error:', error)
      throw new Error('Google免费翻译失败: ' + error.message)
    }
  }
}

// Microsoft 免费翻译服务
class MicrosoftFreeService extends TranslationService {
  async translate(text, targetLang, sourceLang = 'auto', customPrompt = null) {
    this.validateText(text)
    
    try {
      if (customPrompt) {
        console.log('Microsoft Free服务不支持自定义Prompt，将使用默认翻译')
      }
      
      const apiKey = this.config.apiKey || await this.getApiKey()
      if (!apiKey) {
        throw new Error('需要配置Microsoft翻译API密钥')
      }
      
      const endpoint = 'https://api.cognitive.microsofttranslator.com/translate'
      const params = new URLSearchParams({
        'api-version': '3.0',
        'to': targetLang
      })
      
      if (sourceLang !== 'auto') {
        params.append('from', sourceLang)
      }
      
      const response = await fetch(`${endpoint}?${params}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Region': this.config.region || 'eastus'
        },
        body: JSON.stringify([{ text }])
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      const translatedText = data[0].translations[0].text
      
      return {
        text: translatedText,
        sourceLang: data[0].detectedLanguage?.language || sourceLang,
        service: this.serviceId
      }
    } catch (error) {
      console.error('Microsoft translation error:', error)
      throw new Error('Microsoft翻译失败: ' + error.message)
    }
  }
  
  async getApiKey() {
    const userConfig = await getUserConfig()
    return userConfig.microsoftTranslateApiKey
  }
}

// AI模型翻译服务
class AIModelService extends TranslationService {
  async translate(text, targetLang, sourceLang = 'auto', customPrompt = null) {
    this.validateText(text)
    
    try {
      // 构建翻译提示词
      const translationPrompt = this.buildTranslationPrompt(text, targetLang, sourceLang, customPrompt)
      
      // 使用项目的AI API调用方式
      const translatedText = await this.callAIAPI(translationPrompt)
      
      // 检测源语言
      const detectedSourceLang = this.detectSourceLanguage(text)
      
      return {
        text: translatedText,
        sourceLang: detectedSourceLang,
        service: this.serviceId,
        customPromptUsed: !!customPrompt
      }
      
    } catch (error) {
      console.error('AI model translation error:', error)
      throw new Error('AI模型翻译失败: ' + error.message)
    }
  }
  
  /**
   * 构建翻译提示词
   */
  buildTranslationPrompt(text, targetLang, sourceLang, customPrompt) {
    const targetLanguageMap = {
      'zh-CN': '简体中文',
      'en': '英语',
      'ja': '日语',
      'ko': '韩语',
      'es': '西班牙语',
      'fr': '法语',
      'de': '德语',
      'ru': '俄语'
    }
    
    const targetLanguageName = targetLanguageMap[targetLang] || targetLang
    
    let prompt = `你是专业的外贸翻译助手。将下面文本翻译成${targetLanguageName}，务必仅仅返回翻译结果文本，绝对不要任何解释、补充或格式`
    
    // 添加自定义提示词规则
    if (customPrompt) {
      prompt += `\n\n翻译要求：${customPrompt}`
    }
    
    // 添加外贸专业翻译规则
    prompt += `\n\n翻译规则：
1. 保持商务专业语气
2. 保留品牌名、公司名、产品型号
3. 对于专业术语，根据上下文选择最合适的翻译
4. 只返回翻译结果，不要包含任何解释或额外内容

原文：${text}

翻译：`
    
    return prompt
  }
  
  /**
   * 调用AI API进行翻译
   */
  async callAIAPI(prompt) {
    return new Promise((resolve, reject) => {
      // 使用Browser扩展的runtime.connect建立连接
      const port = Browser.runtime.connect()
      
      let responseText = ''
      
      const messageListener = (msg) => {
        if (msg.error) {
          port.onMessage.removeListener(messageListener)
          reject(new Error(msg.error))
          return
        }
        
        if (msg.answer) {
          responseText = msg.answer
        }
        
        if (msg.done) {
          port.onMessage.removeListener(messageListener)
          // 清理AI回答中的多余内容
          const cleanedText = this.cleanAIResponse(responseText)
          resolve(cleanedText)
        }
      }
      
      port.onMessage.addListener(messageListener)
      
      // 构建session对象，使用豆包模型进行非流式翻译
      const session = {
        question: prompt,
        conversationRecords: [],
        modelName: 'doubao-1-5-lite-32k-250115', // 使用豆包模型
        aiConfig: {
          responseFormat: 'text', // 指定返回纯文本格式
          temperature: 0.1, // 较低的温度确保翻译一致性
          top_k: 0.9,
          top_p: 0.9,
          stream: false, // 非流式响应
          assistantPrefix: null, // 不添加前缀，直接返回翻译文本
        },
        apiMode: null
      }
      
      // 发送翻译请求
      port.postMessage({ session, stop: false })
      
      // 设置超时
      setTimeout(() => {
        port.onMessage.removeListener(messageListener)
        reject(new Error('AI翻译请求超时'))
      }, 30000) // 30秒超时
    })
  }
  
  /**
   * 清理AI响应，提取纯翻译结果
   */
  cleanAIResponse(response) {
    if (!response) return ''
    
    // 移除可能的前缀标记
    let cleaned = response.replace(/^\[.*?\]\s*/, '')
    
    // 移除常见的AI回复前缀
    cleaned = cleaned.replace(/^(翻译：|翻译结果：|Translation：|Result：)\s*/i, '')
    
    // 移除引号
    cleaned = cleaned.replace(/^["']|["']$/g, '')
    
    // 移除多余的空白字符
    cleaned = cleaned.trim()
    
    return cleaned || response
  }
  
  /**
   * 检测源语言
   */
  detectSourceLanguage(text) {
    // 简单的语言检测
    if (/[\u4e00-\u9fa5]/.test(text)) {
      return 'zh-CN'
    } else if (/^[a-zA-Z\s.,!?;:'"()[\]{}\-_+=@#$%^&*0-9]+$/.test(text.trim())) {
      return 'en'
    } else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      return 'ja'
    } else if (/[\uac00-\ud7af]/.test(text)) {
      return 'ko'
    }
    return 'auto'
  }
}

// 翻译服务工厂
export class TranslationServiceFactory {
  static services = {
    google_free: GoogleFreeService,
    microsoft_free: MicrosoftFreeService,
    ai_model: AIModelService
  }
  
  static create(serviceId, config = {}) {
    const ServiceClass = this.services[serviceId]
    if (!ServiceClass) {
      throw new Error(`未知的翻译服务: ${serviceId}`)
    }
    
    return new ServiceClass(serviceId, config)
  }
  
  static getAvailableServices() {
    return Object.keys(TRANSLATE_SERVICES).map(id => ({
      id,
      ...TRANSLATE_SERVICES[id]
    }))
  }
  
  static async getRecommendedService() {
    // 根据目标语言推荐最佳服务
    const userConfig = await getUserConfig()
    
    // 如果用户配置了Microsoft密钥，推荐Microsoft
    if (userConfig.microsoftTranslateApiKey) {
      return 'microsoft_free'
    }
    
    // 默认推荐Google免费版（最稳定可靠）
    return 'google_free'
  }
}

// 翻译服务管理器
export class TranslationManager {
  constructor() {
    this.fallbackServices = ['google_free', 'ai_model']
  }
  
  async translate(text, targetLang, sourceLang = 'auto', serviceId = null, customPrompt = null) {
    // 如果没有指定服务，使用推荐服务
    if (!serviceId) {
      serviceId = await TranslationServiceFactory.getRecommendedService()
    }
    
    try {
      const service = TranslationServiceFactory.create(serviceId)
      return await service.translate(text, targetLang, sourceLang, customPrompt)
    } catch (error) {
      console.warn(`翻译服务 ${serviceId} 失败:`, error.message)
      
      // 尝试备用服务
      for (const fallbackId of this.fallbackServices) {
        if (fallbackId === serviceId) continue
        
        try {
          console.log(`尝试备用翻译服务: ${fallbackId}`)
          const fallbackService = TranslationServiceFactory.create(fallbackId)
          const result = await fallbackService.translate(text, targetLang, sourceLang, customPrompt)
          result.fallback = true
          result.originalService = serviceId
          return result
        } catch (fallbackError) {
          console.warn(`备用服务 ${fallbackId} 也失败:`, fallbackError.message)
        }
      }
      
      throw new Error(`所有翻译服务都失败了。最后错误: ${error.message}`)
    }
  }
  
  // 真正的批量翻译：使用服务的批量翻译能力
  async batchTranslate(texts, targetLang, sourceLang = 'auto', serviceId = null, customPrompt = null) {
    if (!texts || texts.length === 0) {
      return []
    }

    // 如果没有指定服务，使用推荐服务
    if (!serviceId) {
      serviceId = await TranslationServiceFactory.getRecommendedService()
    }
    
    try {
      const service = TranslationServiceFactory.create(serviceId)
      
      // 使用服务的批量翻译方法
      if (service.batchTranslate && typeof service.batchTranslate === 'function') {
        console.log(`使用 ${serviceId} 服务批量翻译 ${texts.length} 个文本`)
        return await service.batchTranslate(texts, targetLang, sourceLang, customPrompt)
      } else {
        // 回退到默认的逐个翻译
        console.log(`${serviceId} 服务不支持批量翻译，使用逐个翻译`)
        return await this.fallbackBatchTranslate(texts, targetLang, sourceLang, serviceId, customPrompt)
      }
      
    } catch (error) {
      console.warn(`批量翻译服务 ${serviceId} 失败:`, error.message)
      
      // 尝试备用服务
      for (const fallbackId of this.fallbackServices) {
        if (fallbackId === serviceId) continue
        
        try {
          console.log(`尝试备用批量翻译服务: ${fallbackId}`)
          const fallbackService = TranslationServiceFactory.create(fallbackId)
          const results = await fallbackService.batchTranslate(texts, targetLang, sourceLang, customPrompt)
          
          // 标记使用了备用服务
          return results.map(result => ({
            ...result,
            fallback: true,
            originalService: serviceId
          }))
          
        } catch (fallbackError) {
          console.warn(`备用批量翻译服务 ${fallbackId} 也失败:`, fallbackError.message)
        }
      }
      
      throw new Error(`所有批量翻译服务都失败了。最后错误: ${error.message}`)
    }
  }

  // 回退的批量翻译方法
  async fallbackBatchTranslate(texts, targetLang, sourceLang = 'auto', serviceId = null, customPrompt = null) {
    const results = []
    
    for (const text of texts) {
      try {
        const result = await this.translate(text, targetLang, sourceLang, serviceId, customPrompt)
        results.push({
          ...result,
          originalText: text
        })
      } catch (error) {
        results.push({
          text: text,
          error: error.message,
          service: serviceId,
          originalText: text
        })
      }
    }
    
    return results
  }
} 