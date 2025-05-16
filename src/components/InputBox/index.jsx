import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { isFirefox, isMobile, isSafari } from '../../utils'
import { useTranslation } from 'react-i18next'
import { getUserConfig } from '../../config/index.mjs'
import styles from './styles.module.scss'
import { Input } from 'antd'
const { TextArea } = Input

export function InputBox({ onSubmit, enabled, postMessage, reverseResizeDir }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const reverseDivRef = useRef(null)
  const inputRef = useRef(null)
  const textAreaDomRef = useRef(null)
  const textAreaWrapperRef = useRef(null)
  const resizedRef = useRef(false)
  const [internalReverseResizeDir, setInternalReverseResizeDir] = useState(reverseResizeDir)

  useEffect(() => {
    setInternalReverseResizeDir(
      !isSafari() && !isFirefox() && !isMobile() ? reverseResizeDir : false,
    )
  }, [reverseResizeDir])

  const virtualInputRef = internalReverseResizeDir ? reverseDivRef : textAreaWrapperRef

  useEffect(() => {
    if (inputRef.current && inputRef.current.resizableTextArea) {
      textAreaDomRef.current = inputRef.current.resizableTextArea.textArea
    }

    // 组件卸载时清理
    return () => {
      textAreaDomRef.current = null
    }
  }, [])

  useEffect(() => {
    if (textAreaDomRef.current) {
      textAreaDomRef.current.focus()
    }

    const onResizeY = () => {
      if (virtualInputRef.current && virtualInputRef.current.offsetHeight) {
        if (virtualInputRef.current.h !== virtualInputRef.current.offsetHeight) {
          virtualInputRef.current.h = virtualInputRef.current.offsetHeight
          if (!resizedRef.current) {
            resizedRef.current = true
            virtualInputRef.current.style.maxHeight = ''
          }
        }
      }
    }

    if (virtualInputRef.current) {
      virtualInputRef.current.h = virtualInputRef.current.offsetHeight
      virtualInputRef.current.addEventListener('mousemove', onResizeY)

      // 清理事件监听器
      return () => {
        if (virtualInputRef.current) {
          virtualInputRef.current.removeEventListener('mousemove', onResizeY)
        }
      }
    }
  }, [internalReverseResizeDir])

  useEffect(() => {
    if (!resizedRef.current) {
      if (!internalReverseResizeDir && textAreaWrapperRef.current) {
        if (textAreaDomRef.current) {
          textAreaDomRef.current.style.height = 'auto'
          const height = textAreaDomRef.current.scrollHeight
          textAreaDomRef.current.style.height = `${height}px`
        }

        if (virtualInputRef.current) {
          virtualInputRef.current.h = virtualInputRef.current.offsetHeight
          virtualInputRef.current.style.maxHeight = '160px'
        }
      }
    }
  })

  useEffect(() => {
    if (enabled && textAreaDomRef.current) {
      getUserConfig().then((config) => {
        if (config.focusAfterAnswer) textAreaDomRef.current.focus()
      })
    }
  }, [enabled])

  const handleKeyDownOrClick = (e) => {
    e.stopPropagation()
    if (e.type === 'click' || (e.keyCode === 13 && e.shiftKey === false)) {
      e.preventDefault()
      if (enabled) {
        if (!value) return
        onSubmit(value)
        setValue('')
        setTimeout(() => {
          if (textAreaDomRef.current) {
            textAreaDomRef.current.focus()
          }
        }, 0)
      } else {
        postMessage({ stop: true })
      }
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  return (
    <div className={`${styles.inputBox} ${isFocused ? styles.inputFocused : ''}`}>
      <div
        ref={reverseDivRef}
        className={styles.inputContainer}
        style={
          internalReverseResizeDir && {
            transform: 'rotateX(180deg)',
            resize: 'vertical',
            overflow: 'hidden',
            minHeight: '160px',
          }
        }
      >
        <div ref={textAreaWrapperRef} className={styles.textAreaWrapper}>
          <TextArea
            dir="auto"
            ref={inputRef}
            disabled={false}
            className={styles.interactInput}
            style={
              internalReverseResizeDir
                ? { transform: 'rotateX(180deg)', resize: 'none' }
                : { resize: 'vertical', minHeight: '70px' }
            }
            placeholder={
              enabled
                ? t('Type your question here\nEnter to send, shift + enter to break line')
                : t(
                    'Type your question here\nEnter to stop generating\nShift + enter to break line',
                  )
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDownOrClick}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoSize={false}
            variant="borderless"
            showCount={false}
          />
        </div>
      </div>
      <button
        className={styles.submitButton}
        style={{
          backgroundColor: enabled ? '#1677ff' : '#ff4d4f',
        }}
        onClick={handleKeyDownOrClick}
      >
        {enabled ? (
          <span className={styles.buttonText}>
            <svg
              viewBox="0 0 1024 1024"
              width="16"
              height="16"
              fill="currentColor"
              style={{ marginRight: '4px' }}
            >
              <path d="M931.4 498.9L94.9 79.5c-3.4-1.7-7.3-2.1-11-1.2-8.5 2.1-13.8 10.7-11.7 19.3l86.2 352.2c1.3 5.3 5.2 9.6 10.4 11.3l147.7 50.7-147.6 50.7c-5.2 1.8-9.1 6-10.3 11.3L72.2 926.5c-0.9 3.7-0.5 7.6 1.2 10.9 3.9 7.9 13.5 11.1 21.5 7.2l836.5-417c3.1-1.5 5.6-4.1 7.2-7.1 3.9-8 0.7-17.6-7.2-21.6zM170.8 826.3l50.3-205.6 295.2-101.3c2.3-0.8 4.2-2.6 5-5 1.4-4.2-0.8-8.7-5-10.2L221.1 403 171 198.2l628 314.9-628.2 313.2z" />
            </svg>
            {t('Ask')}
          </span>
        ) : (
          <span className={styles.buttonText}>
            <svg
              viewBox="0 0 1024 1024"
              width="16"
              height="16"
              fill="currentColor"
              style={{ marginRight: '4px' }}
            >
              <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" />
              <path d="M512 140c-205.4 0-372 166.6-372 372s166.6 372 372 372 372-166.6 372-372-166.6-372-372-372zm171.8 527.1c1.2 1.5 1.9 3.3 1.9 5.2 0 4.5-3.6 8-8 8l-66-.3-99.3-118.4-99.3 118.5-66.1.3c-4.4 0-8-3.6-8-8 0-1.9.7-3.7 1.9-5.2L471.6 512 340.8 346.8c-1.2-1.5-1.9-3.3-1.9-5.2 0-4.4 3.6-8 8-8l66.1.3 99.3 118.4 99.3-118.5 66-.3c4.4 0 8 3.6 8 8 0 1.9-.6 3.8-1.8 5.2L553.6 512l130.2 155.1z" />
            </svg>
            {t('Stop')}
          </span>
        )}
      </button>
      {value && (
        <button
          className={styles.clearButton}
          onClick={() => setValue('')}
          aria-label="Clear input"
        >
          <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3-99.4-118.4-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359c-1.2-1.5-1.9-3.3-1.9-5.2 0-4.4 3.6-8 8-8l66.1.3 99.3 118.4 99.4-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z" />
          </svg>
        </button>
      )}
    </div>
  )
}

InputBox.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  enabled: PropTypes.bool.isRequired,
  reverseResizeDir: PropTypes.bool,
  postMessage: PropTypes.func.isRequired,
}

export default InputBox
