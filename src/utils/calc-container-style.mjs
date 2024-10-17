export function calcContainerStyle(containerType = '') {
  if (containerType === 'sideWindow') {
    return {
      position: 'fixed',
      top: 0,
      right: 0,
      width: '450px',
      bottom: 0,
    }
  }
  return {}
}
