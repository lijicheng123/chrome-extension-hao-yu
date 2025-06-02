import { useState, useEffect } from 'react'
import { getUserConfig, setUserConfig } from '../../../config/index.mjs'
/**
 * 叫storageState似乎更合适
 * 用于管理任务状态
 */
export const useBackgroundState = () => {
  const [casualMiningStatus, originalSetCasualMiningStatus] = useState('cRunning') // 闲时挖掘状态: cRunning 运行中, cStopped 停止

  const [headless, setHeadless] = useState(false)
  const [aiFirst, setAiFirst] = useState(false)
  const [emailList, originalSetEmailList] = useState([])

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const config = await getUserConfig()
    originalSetCasualMiningStatus(config.casualMiningStatus)
    setHeadless(config.headless)
    setAiFirst(config.aiFirst || false)
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
    aiFirst,
    setAiFirst,
  }
}
