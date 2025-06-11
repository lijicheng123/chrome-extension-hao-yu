import {
  getPlatformConfig,
  getTaskKeywords
} from '../../../utils/keywords'
import {
  clearSearchInput,
  inputSearchKeyword,
  performSearch,
  extractDataFromLandingPage
} from '../utils/googleSearchAutomation'

// 获取谷歌搜索平台关键词配置
const GOOGLE_SEARCH_CONFIG = getPlatformConfig('googleSearch')

const googleSearchAdapter = {
  platformId: 'googleSearch',
  platformName: GOOGLE_SEARCH_CONFIG.name,
  displayName: GOOGLE_SEARCH_CONFIG.displayName,
  description: GOOGLE_SEARCH_CONFIG.description,
  
  // 从任务中动态获取关键词
  getKeywords: (selectedTask) => getTaskKeywords(selectedTask),

  // 获取存储键（兼容useLeadMiner hook）
  getStorageKeys: (taskId) => ({
    extractedDataKey: `googleSearch_extractedData_${taskId}`,
    miningStateKey: `googleSearch_miningState_${taskId}`,
    searchStateKey: `googleSearch_searchState_${taskId}`,
    statisticsKey: `googleSearch_statistics_${taskId}`
  }),

  // 执行搜索
  performSearch: async (keyword) => {
    try {
      const success = await performSearch(keyword)
      if (success) {
        console.log(`GoogleSearchAdapter: Search performed for keyword "${keyword}"`)
      }
      return success
    } catch (error) {
      console.error(`GoogleSearchAdapter: Error performing search for keyword "${keyword}":`, error)
      return false
    }
  },

  // 从页面提取数据
  // eslint-disable-next-line no-unused-vars
  extractDataFromPage: async (keyword, _taskId, _getMiningState) => {
    try {
      // 对于Google搜索，这个方法主要用于提取目标页面的信息
      const extractedData = await extractDataFromLandingPage()
      console.log(`GoogleSearchAdapter: Extracted ${extractedData.length} items for keyword "${keyword}"`)
      return extractedData
    } catch (error) {
      console.error(`GoogleSearchAdapter: Error extracting data for keyword "${keyword}":`, error)
      return []
    }
  },

  // 基础搜索操作
  clearSearchInput: async () => {
    try {
      clearSearchInput()
      return true
    } catch (error) {
      console.error('GoogleSearchAdapter: Error clearing search input:', error)
      return false
    }
  },

  inputKeyword: async (keyword) => {
    try {
      const success = await inputSearchKeyword(keyword)
      console.log('GoogleSearchAdapter: Keyword inputted:', keyword)
      return success
    } catch (error) {
      console.error('GoogleSearchAdapter: Error inputting keyword:', error)
      return false
    }
  },
}

export default googleSearchAdapter 