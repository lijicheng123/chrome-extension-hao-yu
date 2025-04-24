import { WINDOW_TYPE } from '../constants'

export function calcContainerStyle(containerType = '') {
  if (containerType === WINDOW_TYPE.LEADS_MINING) {
    return {
      position: 'fixed',
      top: 0,
      right: 0,
      width: '450px',
      bottom: 0,
    }
  }
  if (containerType === WINDOW_TYPE.LEADS_MINING_MINI_SIDE_WINDOW) {
    return {
      position: 'fixed',
      top: '80px',
      right: 0,
      width: '50px',
      height: '30px',
      bottom: 'auto',
    }
  }
  return {}
}
