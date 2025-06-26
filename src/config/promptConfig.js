import { getUserConfig } from './index.mjs'

/**
 * 模块定义
 */
export const MODULES = {
  LEADS_MINING: 'leadsMining',
  SELECTION_TOOLS: 'selectionTools'
}

/**
 * 线索挖掘 Prompt 类型定义
 */
export const LEADS_MINING_PROMPT_TYPES = {
  CONTACT_EXTRACTION: 'contactExtraction',
  CONTACT_EXTRACTION_WITH_LINKS: 'contactExtractionWithLinks',
  EMAIL_GENERATION: 'emailGeneration'
}

/**
 * 划词工具 Prompt 类型定义
 */
export const SELECTION_TOOLS_PROMPT_TYPES = {
  EXPLAIN: 'explain',
  TRANSLATE: 'translate',
  TRANSLATE_TO_EN: 'translateToEn',
  TRANSLATE_TO_ZH: 'translateToZh',
  TRANSLATE_BIDI: 'translateBidi',
  IMMERSIVE_TRANSLATE: 'immersiveTranslate',
  SUMMARY: 'summary',
  POLISH: 'polish',
  SENTIMENT: 'sentiment',
  DIVIDE: 'divide',
  CODE: 'code',
  ASK: 'ask'
}

/**
 * 线索挖掘 Prompt 元数据定义
 */
export const LEADS_MINING_METADATA = {
  [LEADS_MINING_PROMPT_TYPES.CONTACT_EXTRACTION]: {
    title: '联系人信息提取Prompt',
    description: '用于从网页中提取基础联系人信息，包括邮箱、姓名、职位、电话、手机、公司名称、公司网站、LinkedIn主页、标签、地址、个人网站、LinkedIn账号、Facebook账号、Twitter/X账号、YouTube频道、TikTok账号、Instagram账号等',
    usage: 'AI优先的LandingPage页面，或者手动提取',
    category: 'extraction'
  },
  [LEADS_MINING_PROMPT_TYPES.CONTACT_EXTRACTION_WITH_LINKS]: {
    title: '联系人信息提取Prompt（含链接）',
    description: '除了从网页中提取联系人信息外，再获取公司重要链接，包括关于我们、产品页面、联系我们等',
    usage: 'SERP自动化下AI优先的LandingPage页面',
    category: 'extraction'
  },
  [LEADS_MINING_PROMPT_TYPES.EMAIL_GENERATION]: {
    title: '开发信生成Prompt',
    description: '根据任务信息和多个网页内容生成英语开发信，要求控制在300个英文单词内',
    usage: 'SERP自动化下AI优先的LandingPage页面或者LandingPage页手动生成',
    category: 'generation'
  }
}

/**
 * 划词工具 Prompt 元数据定义
 */
export const SELECTION_TOOLS_METADATA = {
  [SELECTION_TOOLS_PROMPT_TYPES.EXPLAIN]: {
    title: '解释说明Prompt',
    description: '作为专家老师，用简单的术语解释内容并突出关键点',
    usage: '划词工具 - 解释选中的文本内容',
    category: 'explanation'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE]: {
    title: '智能翻译Prompt',
    description: '专业翻译，自动检测语言并翻译为目标语言',
    usage: '划词工具 - 智能翻译选中文本',
    category: 'translation'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE_TO_EN]: {
    title: '翻译为英语Prompt',
    description: '专业翻译，将文本翻译为英语',
    usage: '划词工具 - 翻译为英语',
    category: 'translation'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE_TO_ZH]: {
    title: '翻译为中文Prompt',
    description: '专业翻译，将文本翻译为中文',
    usage: '划词工具 - 翻译为中文',
    category: 'translation'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE_BIDI]: {
    title: '双向翻译Prompt',
    description: '智能双向翻译，根据文本语言自动选择翻译方向',
    usage: '划词工具 - 双向翻译',
    category: 'translation'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.IMMERSIVE_TRANSLATE]: {
    title: '沉浸式翻译Prompt',
    description: '使用沉浸式翻译功能',
    usage: '划词工具 - 沉浸式翻译',
    category: 'translation'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.SUMMARY]: {
    title: '内容总结Prompt',
    description: '专业总结，用几句话总结内容要点',
    usage: '划词工具 - 总结选中内容',
    category: 'analysis'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.POLISH]: {
    title: '文本润色Prompt',
    description: '作为熟练编辑，纠正语法和用词，改善可读性和流畅性',
    usage: '划词工具 - 润色文本',
    category: 'editing'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.SENTIMENT]: {
    title: '情感分析Prompt',
    description: '分析内容的情感倾向，提供简要的情感基调总结',
    usage: '划词工具 - 情感分析',
    category: 'analysis'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.DIVIDE]: {
    title: '段落分割Prompt',
    description: '将文本分割为清晰易读易懂的段落',
    usage: '划词工具 - 段落分割',
    category: 'editing'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.CODE]: {
    title: '代码解释Prompt',
    description: '作为高级软件工程师，逐步分解代码并解释每部分的工作原理',
    usage: '划词工具 - 代码解释',
    category: 'analysis'
  },
  [SELECTION_TOOLS_PROMPT_TYPES.ASK]: {
    title: '智能问答Prompt',
    description: '仔细分析内容并提供简洁的答案或观点',
    usage: '划词工具 - 智能问答',
    category: 'analysis'
  }
}

/**
 * 线索挖掘默认 Prompt 模板定义
 */
export const LEADS_MINING_DEFAULT_PROMPTS = {
  [LEADS_MINING_PROMPT_TYPES.CONTACT_EXTRACTION]: `你是外贸业务员，从网页提取联系人信息用于商业开发。目标：返回标准化JSON数组，无有效邮箱则返回[]。

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
- 不确定的字段留空，不填"未知"
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
}]`,

  [LEADS_MINING_PROMPT_TYPES.CONTACT_EXTRACTION_WITH_LINKS]: `你是一名外贸业务员，正在开发客户。请从网页信息中提取：
1. 联系人信息用于商业开发 
2. 公司相关的重要链接（关于我们、产品页面、联系我们等）

返回格式为包含以下字段的JSON数组：
- 联系人信息字段：
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
  twitter: Twitter/X个人资料，url格式
  youtube: YouTube频道，url格式
  tiktok: TikTok账号，url格式
  instagram: Instagram账号，url格式

- 公司链接信息字段：
  links: 数组，包含重要的公司页面链接
    - name: 链接名称（如"about us", "products", "contact us"等）
    - url: 完整的URL地址

规则：
- 不确定的字段留空，不填"未知"
- 合并重复联系人，不同公司分开
- 如果没有邮箱但有重要链接信息，可以返回包含空邮箱和links的对象
- links数组只包含真实存在的重要链接，如果没有就为空数组

示例输出：
[{
  "user_email": "john.doe@example.com",
  "user_name": "John Doe", 
  "user_function": "Marketing Director",
  "user_phone": "+1 555 123 4567",
  "user_mobile": "",
  "company_name": "Example Inc.",
  "company_website": "https://www.example.com",
  "linkedin_site": "https://www.linkedin.com/company/example-inc",
  "tag_names": ["Marketing", "SaaS"],
  "user_street": "123 Main St",
  "user_city": "New York",
  "user_state": "NY",
  "user_country": "United States",
  "twitter": "https://x.com/example_inc",
  "youtube": "https://www.youtube.com/channel/example", 
  "facebook": "https://www.facebook.com/example.inc",
  "tiktok": "",
  "instagram": "https://www.instagram.com/example_inc",
  "links": [
    {
      "name": "about us",
      "url": "https://www.example.com/about"
    },
    {
      "name": "products", 
      "url": "https://www.example.com/products"
    },
    {
      "name": "contact us",
      "url": "https://www.example.com/contact"
    }
  ]
}]`,

  [LEADS_MINING_PROMPT_TYPES.EMAIL_GENERATION]: `你的任务是根据提供的多个网页内容、网页链接和title撰写一封英语开发信，要求控制在300个英文单词内。

在撰写开发信时，请遵循以下指南：
1. 使用正式且友好的语气。
2. 在开头简要介绍自己或公司，并提及与网页相关的主题。
3. 正文中适当引用多个网页内容来吸引对方兴趣，同时给出相应网页链接方便对方查看。
4. 语言表达要简洁明了，避免复杂的句子结构和生僻词汇。
5. 结尾表达期待回复等友好的结束语。

请写下你的英语开发信。`
}

/**
 * 划词工具默认 Prompt 模板定义
 */
export const SELECTION_TOOLS_DEFAULT_PROMPTS = {
  [SELECTION_TOOLS_PROMPT_TYPES.EXPLAIN]: 'You are an expert teacher. Explain the following content in simple terms and highlight the key points:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE]: 'You are a professional translator. Translate the following text to the target language (auto-detect), preserving meaning, tone, and formatting. Only provide the translated result:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE_TO_EN]: 'You are a professional translator. Translate the following text into English, preserving meaning, tone, and formatting. Only provide the translated result:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE_TO_ZH]: 'You are a professional translator. Translate the following text into Chinese, preserving meaning, tone, and formatting. Only provide the translated result:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.TRANSLATE_BIDI]: 'You are a professional translator. Translate the following text to the target language (auto-detect), preserving meaning, tone, and formatting. If the text is already in the target language, translate it into English instead. Only provide the translated result:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.IMMERSIVE_TRANSLATE]: 'Immersive Translation (无需修改)',
  [SELECTION_TOOLS_PROMPT_TYPES.SUMMARY]: 'You are a professional summarizer. Summarize the following content in a few sentences, focusing on the key points:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.POLISH]: 'Act as a skilled editor. Correct grammar and word choice in the following text, improve readability and flow while preserving the original meaning, and return only the polished version:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.SENTIMENT]: 'You are an expert in sentiment analysis. Analyze the following content and provide a brief summary of the overall emotional tone, labeling it with a short descriptive word or phrase:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.DIVIDE]: 'You are a skilled editor. Divide the following text into clear, easy-to-read and easy-to-understand paragraphs:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.CODE]: 'You are a senior software engineer and system architect. Break down the following code step by step, explain how each part works and why it was designed that way, note any potential issues, and summarize the overall purpose:\n{{selection}}',
  [SELECTION_TOOLS_PROMPT_TYPES.ASK]: 'Analyze the following content carefully and provide a concise answer or opinion with a short explanation:\n{{selection}}'
}

/**
 * 模块配置映射
 */
export const MODULE_CONFIG = {
  [MODULES.LEADS_MINING]: {
    types: LEADS_MINING_PROMPT_TYPES,
    metadata: LEADS_MINING_METADATA,
    defaultPrompts: LEADS_MINING_DEFAULT_PROMPTS,
    configKey: 'leadsMiningPrompts'
  },
  [MODULES.SELECTION_TOOLS]: {
    types: SELECTION_TOOLS_PROMPT_TYPES,
    metadata: SELECTION_TOOLS_METADATA,
    defaultPrompts: SELECTION_TOOLS_DEFAULT_PROMPTS,
    configKey: 'selectionToolsPrompts'
  }
}

/**
 * 获取用户配置的 Prompt，如果没有则使用默认值
 * @param {string} module - 模块名称
 * @param {string} promptType - Prompt 类型
 * @returns {Promise<string>} Prompt 文本，不存在或出错返回空字符串
 */
export async function getPromptFromConfig(module, promptType) {
  try {
    const moduleConfig = MODULE_CONFIG[module]
    if (!moduleConfig) {
      return ''
    }

    const config = await getUserConfig()
    const configKey = moduleConfig.configKey
    
    // 如果用户配置存在且有对应的 Prompt，则使用用户配置
    if (config[configKey] && config[configKey][promptType]) {
      return config[configKey][promptType]
    }
    
    // 否则使用默认 Prompt
    return moduleConfig.defaultPrompts[promptType] || ''
  } catch (error) {
    // 不存在或出错直接返回空
    return ''
  }
}

/**
 * 获取指定模块的所有 Prompt 配置
 * @param {string} module - 模块名称
 * @returns {Promise<Object>} 包含该模块所有 Prompt 的配置对象
 */
export async function getModulePromptsFromConfig(module) {
  try {
    const moduleConfig = MODULE_CONFIG[module]
    if (!moduleConfig) {
      return {}
    }

    const config = await getUserConfig()
    const configKey = moduleConfig.configKey
    const result = {}
    
    // 遍历该模块的 Prompt 类型，获取用户配置或默认值
    for (const promptType of Object.values(moduleConfig.types)) {
      if (config[configKey] && config[configKey][promptType]) {
        result[promptType] = config[configKey][promptType]
      } else {
        result[promptType] = moduleConfig.defaultPrompts[promptType] || ''
      }
    }
    
    return result
  } catch (error) {
    // 出错返回空对象
    return {}
  }
}

/**
 * 获取所有模块的 Prompt 配置
 * @returns {Promise<Object>} 包含所有模块 Prompt 的配置对象
 */
export async function getAllPromptsFromConfig() {
  try {
    const result = {}
    
    for (const module of Object.keys(MODULE_CONFIG)) {
      result[module] = await getModulePromptsFromConfig(module)
    }
    
    return result
  } catch (error) {
    return {}
  }
}

/**
 * 获取 Prompt 元数据
 * @param {string} module - 模块名称
 * @param {string} promptType - Prompt 类型
 * @returns {Object} Prompt 元数据
 */
export function getPromptMetadata(module, promptType) {
  const moduleConfig = MODULE_CONFIG[module]
  if (!moduleConfig) {
    return {
      title: '未知Prompt',
      description: '未知的Prompt类型',
      usage: '未知用途',
      category: 'unknown'
    }
  }
  
  return moduleConfig.metadata[promptType] || {
    title: '未知Prompt',
    description: '未知的Prompt类型',
    usage: '未知用途',
    category: 'unknown'
  }
}

/**
 * 获取指定模块的所有 Prompt 类型和元数据
 * @param {string} module - 模块名称
 * @returns {Array} 该模块 Prompt 类型和元数据的数组
 */
export function getModulePromptTypes(module) {
  const moduleConfig = MODULE_CONFIG[module]
  if (!moduleConfig) {
    return []
  }
  
  return Object.values(moduleConfig.types).map(promptType => ({
    type: promptType,
    ...getPromptMetadata(module, promptType)
  }))
}

/**
 * 获取所有模块信息
 * @returns {Array} 模块信息数组
 */
export function getAllModules() {
  return Object.keys(MODULE_CONFIG).map(module => ({
    module,
    ...MODULE_CONFIG[module]
  }))
}

 