import {
  getPlatformConfig,
  getTaskKeywords
} from '../../../utils/keywords';
import {
  performGoogleMapsSearch,
  processAllResultsForKeyword,
  clearSearchInput,
  inputSearchKeyword,
} from '../utils/googleMapsAutomation';

// 获取谷歌地图平台关键词配置
const GOOGLE_MAPS_CONFIG = getPlatformConfig('googleMaps');

const googleMapsAdapter = {
  platformId: 'googleMaps',
  platformName: GOOGLE_MAPS_CONFIG.name,
  description: GOOGLE_MAPS_CONFIG.description,
  
  // 从任务中动态获取关键词
  getKeywords: (selectedTask) => getTaskKeywords(selectedTask),

  getStorageKeys: (taskId) => ({
    extractedDataKey: `googleMaps_extractedData_${taskId}`,
    miningStateKey: `googleMaps_miningState_${taskId}`,
  }),

  // 自动化操作
  clearSearchInput: async () => {
    // 对应原始的 clearSearchInput() 方法
    try {
      clearSearchInput(); // 假设这是同步操作，如果变成异步可能需要加 await
      return true;
    } catch (error) {
      console.error('GoogleMapsAdapter: Error clearing search input:', error);
      return false;
    }
  },

  inputKeyword: async (keyword) => {
    // 对应原始的 inputSearchKeyword(keyword) 方法
    try {
      const success = inputSearchKeyword(keyword);
      if (success) {
        console.log(`GoogleMapsAdapter: Keyword "${keyword}" entered into search box.`);
      }
      return success;
    } catch (error) {
      console.error('GoogleMapsAdapter: Error inputting keyword:', error);
      return false;
    }
  },

  performSearch: async (keyword) => {
    // 此方法结合了关键词输入和搜索启动功能，用于谷歌地图
    // 对应原始的 performGoogleMapsSearch(keyword) 方法
    // 该方法内部处理输入和搜索操作
    try {
      // 原始的 GoogleMapsControl 中的 performGoogleMapsSearch 隐式调用了
      // clearSearchInput 和 inputSearchKeyword 在实际搜索操作之前
      // 如果 utils 中的 performGoogleMapsSearch 没有处理这些步骤，我们可能需要在这里明确这些步骤
      // 或者确保 util 函数是全面的
      // 目前假设 performGoogleMapsSearch 是主要的搜索触发器
      await clearSearchInput(); // 确保状态清洁
      const inputSuccess = inputSearchKeyword(keyword);
      if(!inputSuccess) {
        console.error('GoogleMapsAdapter: Failed to input keyword before search.');
        return false;
      }
      const searchSuccess = await performGoogleMapsSearch(keyword); // 这是实际的搜索触发器
      return searchSuccess;
    } catch (error) {
      console.error(`GoogleMapsAdapter: Error performing search for keyword "${keyword}":`, error);
      return false;
    }
  },

  extractDataFromPage: async (keyword, taskId, getMiningState) => {
    // 对应原始的 processAllResultsForKeyword(keyword, taskId) 方法
    // getMiningState 函数从 hook 传递，允许在长时间提取过程中检查
    // 停止信号，如果此函数内需要的话
    try {
      // utils 中的 processAllResultsForKeyword 可能需要适配以接受和使用 getMiningState
      const extractedContacts = await processAllResultsForKeyword(keyword, taskId, getMiningState);
      return extractedContacts;
    } catch (error) {
      console.error(`GoogleMapsAdapter: Error extracting data for keyword "${keyword}":`, error);
      // 可选地，重新抛出或处理特定错误类型，如果 hook 需要不同的反应
      throw error; // 重新抛出允许 hook 捕获和管理关键词状态
    }
  },

  // 目前谷歌地图没有超出标准挖掘控制的自定义操作
  // customActions: <SomeGoogleMapsSpecificButton />,
};

export default googleMapsAdapter; 