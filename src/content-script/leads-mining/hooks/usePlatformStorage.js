import { useEffect } from 'react'
import { getPageMarker } from '../utils/googleSearchAutomation'
import Browser from 'webextension-polyfill'
import { isGoogleSearchPage } from '../../../utils/platformDetector'
export const usePlatformStorageInit = ({ setContactList = () => {} }) => {
  useEffect(() => {
    console.log('进入usePlatformStorageInit useEffect')
    if (!isGoogleSearchPage()) {
      return
    }

    console.log('进入usePlatformStorageInit isGoogleSearchPage')

    // 定义一个内部 async 函数来处理异步操作
    const init = async () => {
      const pageMarker = await getPageMarker() // 使用 await 获取平台 ID
      const platformId = pageMarker?.platform || 'default'

      const storageKey = `${platformId}_contact_list`
      console.log('storageKey=====>', storageKey)

      // 监听storage变化
      const handleStorageChange = (changes, area) => {
        if (area === 'local' && changes[storageKey]) {
          const newContacts = changes[storageKey].newValue || []
          console.log('检测到联系方式列表变化，同步到emailList', {
            platform: platformId,
            contactsCount: newContacts.length,
          })
          setContactList(newContacts)
        }
      }

      // 添加监听器
      Browser.storage.onChanged.addListener(handleStorageChange)

      // 初始同步一次
      const syncInitialContacts = async () => {
        try {
          const result = await Browser.storage.local.get([storageKey])
          const contacts = result[storageKey] || []
          console.log('进入usePlatformStorageInit syncInitialContacts', contacts)

          if (contacts.length > 0) {
            console.log('初始同步联系方式列表contacts===>', {
              platform: platformId,
              contacts,
            })
            setContactList(contacts)
          }
        } catch (error) {
          console.error('初始同步联系方式失败:', error)
        }
      }

      setTimeout(syncInitialContacts, 3000)

      // 清理监听器
      return () => {
        Browser.storage.onChanged.removeListener(handleStorageChange)
      }
    }

    init() // 调用内部的 async 函数
  }, [])
}

/**
 * 将联系方式添加到storage存储
 * @param {Array} contacts - 联系方式数组
 */
export const addContactsToStorage = async (contacts) => {
  try {
    const pageMarker = await getPageMarker()
    const platformId = pageMarker?.platform || 'default'

    console.log('addContactsToStorage contacts ===>', contacts)

    const storageKey = `${platformId}_contact_list`
    // 获取现有联系方式
    const result = await Browser.storage.local.get([storageKey])
    const existingContacts = result[storageKey] || []

    // 合并新联系方式
    const allContacts = [...existingContacts, ...contacts]
    const contactsAfterUnique = uniqueContacts(allContacts)
    // 保存到storage
    await Browser.storage.local.set({
      [storageKey]: contactsAfterUnique,
    })

    console.log(`已将联系方式保存到storage`, {
      platform: platformId,
      storageKey,
      newContactsCount: contacts.length,
      totalContactsCount: uniqueContacts.length,
    })
  } catch (error) {
    console.error('保存联系方式到storage失败:', error)
  }
}

// 去重逻辑：基于user_email和user_name去重
const uniqueContacts = (allContacts = []) => {
  return allContacts.reduce((unique, contact) => {
    if (
      (contact.user_email ||
      contact.user_name) &&
        !unique.find(
          (c) => c.user_email === contact.user_email && c.user_name === contact.user_name,
        )
    ) {
      unique.push(contact)
    }
    return unique
  }, [])
}
