/**
 * 搜索引擎配置
 * 定义不同搜索引擎的域名和路径模式
 */

export const SEARCH_ENGINES = {
  // Google 搜索引擎配置
  GOOGLE: {
    domains: [
      'google.com',
      'mail.google.com',
      'google.co.jp',
      'google.co.uk',
      'google.de',
      'google.fr',
      'google.cn',
      'google.com.hk',
      'www.google.com.hk',
    ],
    searchPath: '/search',
    searchParam: 'q',
  },

  // 后续可以添加其他搜索引擎配置
  BING: {
    domains: ['bing.com'],
    searchPath: '/search',
    searchParam: 'q',
  },

  BAIDU: {
    domains: ['baidu.com'],
    searchPath: '/s',
    searchParam: 'wd',
  },
}

/**
 * 判断当前页面是否为搜索引擎结果页
 * @returns {Object|null} 匹配的搜索引擎配置，如果不匹配则返回null
 */
export function getMatchedSearchEngine() {
  const currentHostname = window.location.hostname
  const currentPath = window.location.pathname

  // 遍历所有搜索引擎配置
  for (const [engineName, engineConfig] of Object.entries(SEARCH_ENGINES)) {
    // 检查域名是否匹配
    const isDomainMatch = engineConfig.domains.some(
      (domain) => currentHostname === domain || currentHostname.endsWith('.' + domain),
    )

    // 检查路径是否匹配
    const isPathMatch = currentPath.startsWith(engineConfig.searchPath)
    // 如果域名和路径都匹配，返回搜索引擎配置
    if (isDomainMatch && isPathMatch) {
      return {
        name: engineName,
        ...engineConfig,
      }
    }
  }

  // 如果没有匹配的搜索引擎，返回null
  return null
}

/**
 * 判断当前页面是否为搜索结果页
 * @returns {boolean} 是否为搜索结果页
 */
export function isSearchResultPage() {
  return getMatchedSearchEngine() !== null
}
