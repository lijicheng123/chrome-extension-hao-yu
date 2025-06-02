/**
 * 关键词工具
 * 融合平台识别和动态关键词生成功能
 */

import { PLATFORM_CONFIG, detectCurrentPlatform } from './platformDetector'

/**
 * 解析任务中的关键词字符串
 * @param {string} keywordsStr - 关键词字符串，可能包含换行符分隔
 * @returns {Array<string>} 关键词数组
 */
export const parseKeywords = (keywordsStr) => {
  if (!keywordsStr) return []
  
  return keywordsStr
    .split(/[\n,;，；]/) // 支持换行符、逗号、分号分隔
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0)
}

/**
 * 解析排除关键词
 * @param {string} exclusionStr - 排除关键词字符串
 * @returns {Array<string>} 排除关键词数组
 */
export const parseExclusionKeywords = (exclusionStr) => {
  return parseKeywords(exclusionStr)
}

/**
 * 解析任务中的城市列表
 * @param {string} citiesStr - 城市字符串，换行符分隔
 * @returns {Array<string>} 城市数组
 */
export const parseCities = (citiesStr) => {
  if (!citiesStr) return []
  
  return citiesStr
    .split(/[\n,;，；]/) // 支持换行符、逗号、分号分隔
    .map(city => city.trim())
    .filter(city => city.length > 0)
}

/**
 * 解析任务中的国家列表
 * @param {Array} countriesInfo - 国家信息数组
 * @returns {Array<string>} 国家名称数组
 */
export const parseCountries = (countriesInfo) => {
  if (!Array.isArray(countriesInfo)) return []
  
  return countriesInfo
    .map(country => country.display_name || country.name)
    .filter(name => name && name.length > 0)
}

/**
 * 解析商业角色关键词
 * @param {string} extraKeywordsStr - 额外关键词字符串
 * @returns {Array<string>} 商业角色关键词数组
 */
export const parseBusinessRoleKeywords = (extraKeywordsStr) => {
  return parseKeywords(extraKeywordsStr)
}

/**
 * 谷歌地图关键词生成策略
 * 生成逻辑：[产品关键词] + [城市/国家] + [商业角色关键词]
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 生成的关键词数组
 */
export const generateGoogleMapsKeywords = (task) => {
  if (!task) return []
  
  const productKeywords = parseKeywords(task.keywords)
  const cities = parseCities(task.cities)
  const countries = parseCountries(task.countries_info)
  const businessRoles = parseBusinessRoleKeywords(task.extra_keywords)
  
  const keywords = []
  
  // 确定使用城市还是国家（优先城市）
  const locations = cities.length > 0 ? cities : countries
  
  // 生成关键词组合：[产品关键词] + [城市/国家] + [商业角色关键词]
  // 如果有位置就用上位置，如果没有位置就只要产品关键词+商业角色关键词
  // 如果有商业关键词就用上商业关键词，如果没有就不要商业关键词
  productKeywords.forEach(product => {
    if (locations.length > 0) {
      locations.forEach(location => {
        if (businessRoles.length > 0) {
        businessRoles.forEach(businessRole => {
          // 组合格式：产品 + 地点 + 商业角色
          keywords.push(`${product} ${location} ${businessRole}`)
        })
        } else {
          keywords.push(`${product} ${location}`)
        }
      })
    } else {
      businessRoles.forEach(businessRole => {
        keywords.push(`${product} ${businessRole}`)
      })
    }
  })
  
  return [...new Set(keywords)] // 去重
}

/**
 * 谷歌搜索关键词生成策略
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 生成的关键词数组
 */
export const generateGoogleSearchKeywords = (task) => {
  if (!task) return []
  
  // TODO: 待实现具体业务逻辑
  return []
}

/**
 * LinkedIn关键词生成策略
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 生成的关键词数组
 */
export const generateLinkedInKeywords = (task) => {
  if (!task) return []
  
  // TODO: 待实现具体业务逻辑
  return []
}

/**
 * Reddit关键词生成策略
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 生成的关键词数组
 */
export const generateRedditKeywords = (task) => {
  if (!task) return []
  
  // TODO: 待实现具体业务逻辑
  return []
}

/**
 * Facebook关键词生成策略
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 生成的关键词数组
 */
export const generateFacebookKeywords = (task) => {
  if (!task) return []
  
  // TODO: 待实现具体业务逻辑
  return []
}

/**
 * Instagram关键词生成策略
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 生成的关键词数组
 */
export const generateInstagramKeywords = (task) => {
  if (!task) return []
  
  // TODO: 待实现具体业务逻辑
  return []
}

/**
 * 平台关键词生成策略映射
 */
const PLATFORM_KEYWORD_GENERATORS = {
  googleMaps: generateGoogleMapsKeywords,
  googleSearch: generateGoogleSearchKeywords,
  linkedin: generateLinkedInKeywords,
  reddit: generateRedditKeywords,
  facebook: generateFacebookKeywords,
  instagram: generateInstagramKeywords
}

/**
 * 根据当前平台生成关键词
 * @param {Object} task - 任务对象
 * @param {string} platformId - 平台ID，可选，默认使用当前平台
 * @returns {Array<string>} 生成的关键词数组
 */
export const generatePlatformKeywords = (task, platformId = null) => {
  const targetPlatformId = platformId || detectCurrentPlatform()
  
  if (!targetPlatformId || !task) {
    return []
  }
  
  const generator = PLATFORM_KEYWORD_GENERATORS[targetPlatformId]
  if (!generator) {
    console.warn(`未找到平台 ${targetPlatformId} 的关键词生成器，使用默认策略`)
    return parseKeywords(task.keywords)
  }
  
  return generator(task)
}

/**
 * 过滤排除的关键词
 * @param {Array<string>} keywords - 关键词数组
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 过滤后的关键词数组
 */
export const filterExcludedKeywords = (keywords, task) => {
  if (!task?.exclusion_keywords) {
    return keywords
  }
  
  const exclusionKeywords = parseExclusionKeywords(task.exclusion_keywords)
  if (exclusionKeywords.length === 0) {
    return keywords
  }
  
  return keywords.filter(keyword => {
    const lowerKeyword = keyword.toLowerCase()
    return !exclusionKeywords.some(exclusion => 
      lowerKeyword.includes(exclusion.toLowerCase())
    )
  })
}

/**
 * 获取指定平台的关键词配置（向后兼容）
 * @param {string} platform - 平台名称
 * @returns {Object|null} 平台配置
 */
export const getPlatformConfig = (platform) => {
  return PLATFORM_CONFIG[platform] || null
}

/**
 * 获取指定平台的关键词（向后兼容，现在返回空数组）
 * @param {string} _platform - 平台名称（已废弃）
 * @returns {Array<string>} 关键词数组
 */
// eslint-disable-next-line no-unused-vars
export const getPlatformKeywords = (_platform) => {
  console.warn('getPlatformKeywords is deprecated, use generatePlatformKeywords instead')
  return []
}

/**
 * 获取所有可用平台
 * @returns {Array<string>} 平台ID数组
 */
export const getAvailablePlatforms = () => {
  return Object.keys(PLATFORM_CONFIG)
}

/**
 * 主要导出函数：获取当前平台的任务关键词
 * @param {Object} task - 任务对象
 * @returns {Array<string>} 处理后的关键词数组
 */
export const getTaskKeywords = (task) => {
  if (!task) {
    return []
  }
  
  // 1. 根据当前平台生成关键词
  const platformKeywords = generatePlatformKeywords(task)
  
  // 2. 过滤排除的关键词
  const filteredKeywords = filterExcludedKeywords(platformKeywords, task)
  
  // 3. 限制关键词数量，避免过多
  const maxKeywords = 50
  return filteredKeywords.slice(0, maxKeywords)
}

// 向后兼容：导出一些原有的关键词数组（现在为空，建议使用新的动态生成方式）
export const WATER_BOTTLE_KEYWORDS = []
export const B2B_SOFTWARE_KEYWORDS = []
export const ECOMMERCE_KEYWORDS = []
export const LINKEDIN_KEYWORDS = []
export const FACEBOOK_KEYWORDS = []
export const REDDIT_KEYWORDS = []
export const GOOGLE_SEARCH_KEYWORDS = []

// 平台关键词配置（向后兼容）
export const PLATFORM_KEYWORDS = {
  googleMaps: {
    name: '谷歌地图',
    keywords: [],
    description: '根据任务动态生成关键词',
  },
  linkedin: {
    name: 'LinkedIn',
    keywords: [],
    description: '根据任务动态生成关键词',
  },
  facebook: {
    name: 'Facebook',
    keywords: [],
    description: '根据任务动态生成关键词',
  },
  reddit: {
    name: 'Reddit',
    keywords: [],
    description: '根据任务动态生成关键词',
  },
  googleSearch: {
    name: '谷歌搜索',
    keywords: [],
    description: '根据任务动态生成关键词',
  },
} 