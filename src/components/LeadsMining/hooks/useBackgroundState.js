import { useState, useEffect, useCallback } from 'react'
import { LeadsMiningContentAPI } from '../../../services/messaging/leadsMining'
import { cleanupLinkMarkers } from '../utils/searchEngineUtils'
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
    const config = await getUserConfig()
    originalSetCasualMiningStatus(config.casualMiningStatus)
    setHeadless(config.headless)
    originalSetEmailList(config.emailList || [])
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
