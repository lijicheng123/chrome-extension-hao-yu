import { calcContainerStyle } from './calc-container-style.mjs'
export function createElementAtPosition(x = 0, y = 0, containerType, zIndex = 9999999) {
  const containerStyle = calcContainerStyle(containerType)

  const element = document.createElement('div')
  element.style.position = 'fixed'
  element.style.zIndex = zIndex
  if (containerStyle.width) {
    element.style.width = containerStyle.width
    element.style.left = `auto`
    element.style.right = containerStyle.right
    element.style.bottom = containerStyle.bottom
  } else {
    element.style.left = containerStyle.left ?? `${x}px`
  }
  element.style.top = containerStyle.top ?? `${y}px`
  document.documentElement.appendChild(element)
  return element
}
