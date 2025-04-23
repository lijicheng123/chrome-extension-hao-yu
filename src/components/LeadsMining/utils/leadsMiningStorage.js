import Browser from 'webextension-polyfill'

export const LEADS_MINING_KEY = 'leadsMining'

// 设置本地缓存，key为LEADS_MINING_KEY，value为任务状态
export const setStorage = (key, value) => {
  Browser.storage.local.set({ [LEADS_MINING_KEY]: { [key]: value } })
}

// 获取本地缓存，key为LEADS_MINING_KEY，value为任务状态
export const getStorage = async (key) => {
  const storage = await Browser.storage.local.get(LEADS_MINING_KEY)
  return storage[LEADS_MINING_KEY][key]
}

// 清除缓存
export const clearStorage = () => {
  Browser.storage.local.clear()
}
