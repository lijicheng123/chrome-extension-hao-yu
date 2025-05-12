import { useState, useEffect, useCallback } from 'react'
import { LeadsMiningContentAPI } from '../../../services/messaging/leadsMining'
import { cleanupLinkMarkers } from '../utils/searchEngineUtils'
import { getStorage, setStorage } from '../utils/leadsMiningStorage'
import { getUserConfig, setUserConfig } from '../../../config/index.mjs'
/**
 * 叫storageState似乎更合适
 * 用于管理任务状态
 */
export const useBackgroundState = (selectedTask) => {
  const [casualMiningStatus, originalSetCasualMiningStatus] = useState('cRunning') // 闲时挖掘状态: cRunning 运行中, cStopped 停止

  const [headless, setHeadless] = useState(false)
  const [emailList, originalSetEmailList] = useState([])

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { casualMiningStatus  } = await getStorage(['casualMiningStatus'])
    originalSetCasualMiningStatus(casualMiningStatus)
    const { headless, emailList = [] } = await getUserConfig()
    setHeadless(headless)
    originalSetEmailList(emailList)
  }

  const setEmailList = (emailList) => {
    setUserConfig({ emailList })
    originalSetEmailList(emailList)
  }

  return {
    emailList,
    setEmailList,
    casualMiningStatus,
    headless,
    setHeadless,
  }
}
