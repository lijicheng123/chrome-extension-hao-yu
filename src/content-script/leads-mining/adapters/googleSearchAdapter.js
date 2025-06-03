import {
  getPlatformConfig,
  getTaskKeywords
} from '../../../utils/keywords'
import {
  clearSearchInput,
  inputSearchKeyword,
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