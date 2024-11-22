import twpConfig from '../lib/config.mjs'

export function resetBrowserAction(forceShow = false) {
  if (twpConfig.get('translateClickingOnce') === 'yes' && !forceShow) {
    chrome.action.setPopup({
      popup: null,
    })
  } else {
    chrome.action.setPopup({
      popup: 'popup/old-popup.html',
    })
  }
}
