import Browser from 'webextension-polyfill'

export const LEADS_MINING_KEY = 'leadsMining'

// 设置本地缓存，key为LEADS_MINING_KEY，value为任务状态
export const setStorage = async (key, value) => {
  const storage = await Browser.storage.local.get(LEADS_MINING_KEY)
  const data = storage[LEADS_MINING_KEY] || {}
  Browser.storage.local.set({ 
    [LEADS_MINING_KEY]: { 
      ...data, 
      [key]: value 
    } 
  })
}

// 获取本地缓存，可以传入单个key或key数组
export const getStorage = async (keys) => {
  const storage = await Browser.storage.local.get(LEADS_MINING_KEY)
  const data = storage[LEADS_MINING_KEY] || {}
  
  if (Array.isArray(keys)) {
    return keys.reduce((result, key) => {
      result[key] = data[key]
      return result
    }, {})
  }
  
  return data[keys]
}

// 清除缓存
export const clearStorage = () => {
  Browser.storage.local.clear()
}
