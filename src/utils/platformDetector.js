/**
 * 平台识别工具
 * 提供统一的平台识别能力和获取平台名称等功能
 */

// 平台配置映射
export const PLATFORM_CONFIG = {
  googleMaps: {
    id: 'googleMaps',
    name: '谷歌地图',
    displayName: '好雨AI-谷歌地图',
    domains: ['google.com', 'google.co.jp', 'google.co.uk', 'google.de', 'google.fr', 'google.cn', 'google.com.hk'],
    pathPatterns: ['/maps', '/place'],
    urlPatterns: ['maps.google'],
    description: '谷歌地图平台'
  },
  googleSearch: {
    id: 'googleSearch',
    name: '谷歌搜索',
    displayName: '好雨AI-谷歌搜索',
    domains: ['google.com', 'google.co.jp', 'google.co.uk', 'google.de', 'google.fr', 'google.cn', 'google.com.hk'],
    pathPatterns: ['/search'],
    description: '谷歌搜索平台'
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    displayName: '好雨AI-LinkedIn',
    domains: ['linkedin.com', 'www.linkedin.com'],
    pathPatterns: ['/'],
    description: 'LinkedIn职业社交平台'
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    displayName: '好雨AI-Facebook',
    domains: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
    pathPatterns: ['/'],
    description: 'Facebook社交平台'
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    displayName: '好雨AI-Instagram',
    domains: ['instagram.com', 'www.instagram.com'],
    pathPatterns: ['/'],
    description: 'Instagram图片社交平台'
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    displayName: '好雨AI-Reddit',
    domains: ['reddit.com', 'www.reddit.com'],
    pathPatterns: ['/'],
    description: 'Reddit社区平台'
  }
}

/**
 * 检测当前页面所属平台
 * @returns {string|null} 平台ID，如果无法识别则返回null
 */
export const detectCurrentPlatform = () => {
  const hostname = window.location.hostname
  const pathname = window.location.pathname
  const href = window.location.href

  // 遍历所有平台配置进行匹配
  for (const [platformId, config] of Object.entries(PLATFORM_CONFIG)) {
    // 检查域名匹配
    const isDomainMatch = config.domains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    )

    if (isDomainMatch) {
      // 特殊处理谷歌相关平台，需要进一步区分
      if (platformId === 'googleMaps') {
        const isMapPath = config.pathPatterns.some(pattern => pathname.includes(pattern))
        const isMapUrl = config.urlPatterns.some(pattern => href.includes(pattern))
        if (isMapPath || isMapUrl) {
          return platformId
        }
      } else if (platformId === 'googleSearch') {
        const isSearchPath = config.pathPatterns.some(pattern => pathname.includes(pattern))
        if (isSearchPath) {
          return platformId
        }
      } else {
        // 其他平台直接根据域名匹配
        return platformId
      }
    }
  }

  return null
}

/**
 * 获取当前平台信息
 * @returns {Object|null} 平台配置对象，如果无法识别则返回null
 */
export const getCurrentPlatformInfo = () => {
  const platformId = detectCurrentPlatform()
  return platformId ? PLATFORM_CONFIG[platformId] : null
}

/**
 * 获取平台显示名称（好雨AI-{平台}格式）
 * @param {string} platformId - 平台ID，可选，默认使用当前平台
 * @returns {string} 平台显示名称
 */
export const getPlatformDisplayName = (platformId = null) => {
  const targetPlatformId = platformId || detectCurrentPlatform()
  if (!targetPlatformId) {
    return '好雨AI-未知平台'
  }
  return PLATFORM_CONFIG[targetPlatformId]?.displayName || '好雨AI-未知平台'
}

/**
 * 获取平台名称
 * @param {string} platformId - 平台ID，可选，默认使用当前平台
 * @returns {string} 平台名称
 */
export const getPlatformName = (platformId = null) => {
  const targetPlatformId = platformId || detectCurrentPlatform()
  if (!targetPlatformId) {
    return '未知平台'
  }
  return PLATFORM_CONFIG[targetPlatformId]?.name || '未知平台'
}

/**
 * 检查是否为指定平台
 * @param {string} platformId - 要检查的平台ID
 * @returns {boolean} 是否为指定平台
 */
export const isPlatform = (platformId) => {
  return detectCurrentPlatform() === platformId
}

/**
 * 检查是否为谷歌地图页面
 * @returns {boolean} 是否为谷歌地图页面
 */
export const isGoogleMapsPage = () => {
  return isPlatform('googleMaps')
}

/**
 * 检查是否为谷歌搜索页面
 * @returns {boolean} 是否为谷歌搜索页面
 */
export const isGoogleSearchPage = () => {
  return isPlatform('googleSearch')
}

/**
 * 检查是否为LinkedIn页面
 * @returns {boolean} 是否为LinkedIn页面
 */
export const isLinkedInPage = () => {
  return isPlatform('linkedin')
}

/**
 * 检查是否为Facebook页面
 * @returns {boolean} 是否为Facebook页面
 */
export const isFacebookPage = () => {
  return isPlatform('facebook')
}

/**
 * 检查是否为Instagram页面
 * @returns {boolean} 是否为Instagram页面
 */
export const isInstagramPage = () => {
  return isPlatform('instagram')
}

/**
 * 检查是否为Reddit页面
 * @returns {boolean} 是否为Reddit页面
 */
export const isRedditPage = () => {
  return isPlatform('reddit')
}

/**
 * 获取所有支持的平台列表
 * @returns {Array} 平台配置列表
 */
export const getAllPlatforms = () => {
  return Object.values(PLATFORM_CONFIG)
}

/**
 * 根据URL获取平台信息
 * @param {string} url - 要分析的URL
 * @returns {Object|null} 平台配置对象，如果无法识别则返回null
 */
export const getPlatformFromUrl = (url) => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const pathname = urlObj.pathname

    for (const [platformId, config] of Object.entries(PLATFORM_CONFIG)) {
      const isDomainMatch = config.domains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      )

      if (isDomainMatch) {
        // 特殊处理谷歌相关平台
        if (platformId === 'googleMaps') {
          const isMapPath = config.pathPatterns.some(pattern => pathname.includes(pattern))
          const isMapUrl = config.urlPatterns.some(pattern => url.includes(pattern))
          if (isMapPath || isMapUrl) {
            return config
          }
        } else if (platformId === 'googleSearch') {
          const isSearchPath = config.pathPatterns.some(pattern => pathname.includes(pattern))
          if (isSearchPath) {
            return config
          }
        } else {
          return config
        }
      }
    }

    return null
  } catch (error) {
    console.error('解析URL时出错:', error)
    return null
  }
} 