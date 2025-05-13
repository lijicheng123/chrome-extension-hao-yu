import { getCleanedPageText } from './htmlCleaner'
import { matchEmailsInText, removeDuplicates, markEmails } from './emailUtils'
export function getPageText({ ai = false }) {
  if (ai === true) {
    const bodyHtml = getCleanedPageText()
    return bodyHtml
  }
  const bodyText = document.body.innerText
  return bodyText
}
export const extractAllEmails = (options) => {
  const pageText = getPageText(options)
  if (options?.ai !== true) {
    const emails = matchEmailsInText(pageText)
    const uniqueEmails = removeDuplicates(emails)
    setTimeout(() => {
      markEmails(uniqueEmails)
    }, 1000)
    return uniqueEmails
  } else {
    return pageText
  }
}
