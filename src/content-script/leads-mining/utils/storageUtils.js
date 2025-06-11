// 这里写一个方法，用于获取当前平台，然后设置到storage里，key为CURRENT_PLATFORM
import { AUTOMATION_STORAGE_KEYS } from '../constants/automationConfig'
import { detectCurrentPlatform } from '../../../utils/platformDetector'
import Browser from 'webextension-polyfill'

export const setCurrentPlatform = (inputPlatform) => {
  const platform = typeof inputPlatform === 'string' ? inputPlatform : detectCurrentPlatform()
  Browser.storage.local.set({ [AUTOMATION_STORAGE_KEYS.CURRENT_PLATFORM]: platform })
}

export const getCurrentPlatform = async () => { 
  const platform = await Browser.storage.local.get(AUTOMATION_STORAGE_KEYS.CURRENT_PLATFORM)
  return platform[AUTOMATION_STORAGE_KEYS.CURRENT_PLATFORM]
}