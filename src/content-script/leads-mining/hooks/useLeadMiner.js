import { useState, useCallback, useRef, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import { KEYWORD_STATUS } from '../components/KeywordManager'; // 假设 KeywordManager 导出了此常量

/**
 * 用于管理跨不同平台的线索挖掘过程的自定义 Hook
 *
 * @param {object} platformAdapter - 提供特定平台功能的适配器对象
 *                                   请参阅 IPlatformAdapter 定义了解所需方法
 * @param {object} selectedTask - 当前选中的任务对象
 * @param {function} onDataExtracted - 提取新数据时调用的回调函数
 * @param {object} keywordManagerRef - KeywordManager 组件实例的引用
 */
function useLeadMiner(platformAdapter, selectedTask, onDataExtracted, keywordManagerRef) {
  const [isMining, setIsMining] = useState(false);
  const [allExtractedData, setAllExtractedData] = useState([]);
  const isMounted = useRef(true); // 防止在未挂载组件上进行状态更新

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getPlatformStorageKeys = useCallback(() => {
    if (!platformAdapter || typeof platformAdapter.getStorageKeys !== 'function') {
      throw new Error('platformAdapter.getStorageKeys is not implemented or adapter is missing.');
    }
    const taskId = selectedTask?.id || 'default';
    return platformAdapter.getStorageKeys(taskId);
  }, [platformAdapter, selectedTask?.id]);

  const loadPersistedData = useCallback(async () => {
    if (!platformAdapter) return;
    try {
      const { extractedDataKey } = getPlatformStorageKeys();
      const result = await Browser.storage.local.get([extractedDataKey]);
      const persistedData = result[extractedDataKey] || [];
      if (isMounted.current) {
        setAllExtractedData(persistedData);
      }
      console.log(`${platformAdapter.platformId} - Loaded ${persistedData.length} items from storage.`);
    } catch (error) {
      console.error(`Error loading persisted data for ${platformAdapter.platformId}:`, error);
    }
  }, [platformAdapter, getPlatformStorageKeys]);

  const savePersistedData = useCallback(async (dataToSave) => {
    if (!platformAdapter) return;
    try {
      const { extractedDataKey } = getPlatformStorageKeys();
      await Browser.storage.local.set({ [extractedDataKey]: dataToSave });
      if (isMounted.current) {
        setAllExtractedData(dataToSave);
      }
      console.log(`${platformAdapter.platformId} - Saved ${dataToSave.length} items to storage.`);
    } catch (error) {
      console.error(`Error saving persisted data for ${platformAdapter.platformId}:`, error);
    }
  }, [platformAdapter, getPlatformStorageKeys]);

  const getMiningState = useCallback(async () => {
    if (!platformAdapter) return false;
    try {
      const { miningStateKey } = getPlatformStorageKeys();
      const result = await Browser.storage.local.get([miningStateKey]);
      const persistedState = result[miningStateKey] || false;
      if (isMounted.current) {
        setIsMining(persistedState); // 在 hook 状态中反映持久化状态
      }
      return persistedState;
    } catch (error) {
      console.error(`Error getting mining state for ${platformAdapter.platformId}:`, error);
      return false;
    }
  }, [platformAdapter, getPlatformStorageKeys]);

  const setMiningStateInStorage = useCallback(async (mining) => {
    if (!platformAdapter) return;
    try {
      const { miningStateKey } = getPlatformStorageKeys();
      await Browser.storage.local.set({ [miningStateKey]: mining });
      if (isMounted.current) {
        setIsMining(mining);
      }
      console.log(`${platformAdapter.platformId} - Mining state set to: ${mining} in storage.`);
    } catch (error) {
      console.error(`Error setting mining state for ${platformAdapter.platformId}:`, error);
    }
  }, [platformAdapter, getPlatformStorageKeys]);


  const updateKeywordUIMStatus = useCallback((keyword, status, additionalData = {}) => {
    if (keywordManagerRef.current && typeof keywordManagerRef.current.updateKeywordStatus === 'function') {
      keywordManagerRef.current.updateKeywordStatus(keyword, status, additionalData);
    } else {
      console.warn('KeywordManager ref not available or updateKeywordStatus not a function.');
    }
  }, [keywordManagerRef]);
  
  const getSelectedKeywordFromManager = useCallback(() => {
    return keywordManagerRef.current?.getSelectedKeyword?.() || null;
  }, [keywordManagerRef]);

  const setSelectedKeywordInManager = useCallback((keyword) => {
    if (keywordManagerRef.current && typeof keywordManagerRef.current.setSelectedKeyword === 'function') {
      keywordManagerRef.current.setSelectedKeyword(keyword);
    }
  },[keywordManagerRef]);


  useEffect(() => {
    // 当组件挂载或适配器更改时加载持久化数据和挖掘状态
    if (platformAdapter) {
      loadPersistedData();
      getMiningState();
    }
  }, [platformAdapter, loadPersistedData, getMiningState]);


  const startMining = useCallback(async (keywords) => {
    if (!platformAdapter || typeof platformAdapter.performSearch !== 'function' || typeof platformAdapter.extractDataFromPage !== 'function') {
      console.error('Platform adapter is missing or does not implement required search/extract functions.');
      return;
    }
    
    // 检查 keywords 参数
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      console.error('Keywords parameter is invalid or empty:', keywords);
      return;
    }
    
    await setMiningStateInStorage(true);
    let currentExtractedData = [...allExtractedData]; // 从已加载的数据开始

    const selectedKeywordInitially = getSelectedKeywordFromManager();
    const startIndex = selectedKeywordInitially 
      ? keywords.indexOf(selectedKeywordInitially)
      : 0;

    const keywordsToProcess = keywords.slice(Math.max(0, startIndex));

    for (const keyword of keywordsToProcess) {
      const currentMiningState = await getMiningState(); // 在处理每个关键词之前检查
      if (!currentMiningState) {
        console.log(`${platformAdapter.platformId} - Mining stopped by user.`);
        break;
      }

      setSelectedKeywordInManager(keyword);
      updateKeywordUIMStatus(keyword, KEYWORD_STATUS.PROCESSING);
      
      try {
        console.log(`${platformAdapter.platformId} - Processing keyword: ${keyword}`);
        const searchSuccess = await platformAdapter.performSearch(keyword);
        if (!searchSuccess) {
          console.warn(`${platformAdapter.platformId} - Search failed for keyword: ${keyword}. Skipping.`);
          updateKeywordUIMStatus(keyword, KEYWORD_STATUS.PENDING);
          continue;
        }

        const taskId = selectedTask?.id || 'default';
        // 将 hook 的 getMiningState 传递给适配器，以便在需要时允许更细粒度的停止点
        // INFO:谷歌搜索自动化中不会调用这个方法，那里是个空函数
        const extractedItems = await platformAdapter.extractDataFromPage(keyword, taskId, getMiningState);
        
        if (extractedItems && extractedItems.length > 0) {
          currentExtractedData.push(...extractedItems);
          await savePersistedData(currentExtractedData); // 每次成功处理关键词后保存
          updateKeywordUIMStatus(keyword, KEYWORD_STATUS.COMPLETED, { processedCount: extractedItems.length });
          if (onDataExtracted) {
            onDataExtracted(extractedItems); // 通知父组件有新数据提取
          }
        } else {
          // TODO: 谷歌搜索自动化中，这里是否要跳过？待研究
           updateKeywordUIMStatus(keyword, KEYWORD_STATUS.COMPLETED, { processedCount: 0 }); // 即使没有数据也标记为已完成
        }

      } catch (error) {
        console.error(`${platformAdapter.platformId} - Error processing keyword "${keyword}":`, error);
        updateKeywordUIMStatus(keyword, KEYWORD_STATUS.PENDING); // 出错时恢复到待处理状态
      }
    }

    await setMiningStateInStorage(false);
    console.log(`${platformAdapter.platformId} - Mining process completed. Total extracted: ${currentExtractedData.length}`);
    // 如果需要，可以在这里显示全局消息，例如使用 Antd message.success
  }, [
    platformAdapter, 
    allExtractedData, 
    selectedTask, 
    onDataExtracted, 
    getMiningState, 
    setMiningStateInStorage, 
    savePersistedData, 
    updateKeywordUIMStatus,
    getSelectedKeywordFromManager,
    setSelectedKeywordInManager
  ]);

  const stopMining = useCallback(async () => {
    await setMiningStateInStorage(false);
    const selectedKeyword = getSelectedKeywordFromManager();
    if (selectedKeyword) {
      // 更新正在处理的关键词的 UI
      updateKeywordUIMStatus(selectedKeyword, KEYWORD_STATUS.PENDING, { processedCount: 0 });
    }
    console.log(`${platformAdapter.platformId} - Mining process stopped by user.`);
  }, [platformAdapter, setMiningStateInStorage, getSelectedKeywordFromManager, updateKeywordUIMStatus]);

  return {
    isMining,
    allExtractedData,
    startMining,
    stopMining,
    loadPersistedData, // 暴露以供可能的手动刷新
    // getMiningState 和 setMiningStateInStorage 是内部的，通常组件不需要
  };
}

export default useLeadMiner; 