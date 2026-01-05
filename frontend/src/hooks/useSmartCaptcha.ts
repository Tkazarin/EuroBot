import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    smartCaptcha: {
      render: (container: HTMLElement | string, params: {
        sitekey: string
        callback?: (token: string) => void
        hl?: string
        invisible?: boolean
        shieldPosition?: string
        webview?: boolean
      }) => number
      getResponse: (widgetId: number) => string | undefined
      reset: (widgetId: number) => void
      destroy: (widgetId: number) => void
      execute: (widgetId: number) => void
    }
  }
}

const SMARTCAPTCHA_CLIENT_KEY = import.meta.env.VITE_SMARTCAPTCHA_CLIENT_KEY || ''

export function useSmartCaptcha() {
  const [isReady, setIsReady] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const widgetIdRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Check if SmartCaptcha is configured
    if (!SMARTCAPTCHA_CLIENT_KEY) {
      console.warn('SmartCaptcha client key not configured')
      setIsReady(true) // Allow forms to work without captcha
      return
    }

    setIsEnabled(true)

    // Check if script is already loaded
    if (window.smartCaptcha) {
      setIsReady(true)
      return
    }

    // Load SmartCaptcha script
    const script = document.createElement('script')
    script.src = 'https://smartcaptcha.yandexcloud.net/captcha.js'
    script.async = true
    script.defer = true

    script.onload = () => {
      setIsReady(true)
    }

    script.onerror = () => {
      console.error('Failed to load SmartCaptcha script')
      setIsReady(true) // Allow forms to work if script fails
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current !== null && window.smartCaptcha) {
        try {
          window.smartCaptcha.destroy(widgetIdRef.current)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  const renderCaptcha = useCallback((container: HTMLDivElement) => {
    if (!isEnabled || !SMARTCAPTCHA_CLIENT_KEY || !window.smartCaptcha) {
      return
    }

    containerRef.current = container

    // Destroy existing widget if any
    if (widgetIdRef.current !== null) {
      try {
        window.smartCaptcha.destroy(widgetIdRef.current)
      } catch (e) {
        // Ignore
      }
    }

    // Render new widget
    widgetIdRef.current = window.smartCaptcha.render(container, {
      sitekey: SMARTCAPTCHA_CLIENT_KEY,
      callback: (newToken: string) => {
        setToken(newToken)
      },
      hl: 'ru',
      invisible: false // Set to true for invisible captcha
    })
  }, [isEnabled, isReady])

  const getToken = useCallback((): string | null => {
    if (!isEnabled) return null
    
    if (widgetIdRef.current !== null && window.smartCaptcha) {
      const response = window.smartCaptcha.getResponse(widgetIdRef.current)
      return response || token
    }
    
    return token
  }, [isEnabled, token])

  const resetCaptcha = useCallback(() => {
    setToken(null)
    if (widgetIdRef.current !== null && window.smartCaptcha) {
      window.smartCaptcha.reset(widgetIdRef.current)
    }
  }, [])

  return {
    isReady,
    isEnabled,
    token,
    getToken,
    renderCaptcha,
    resetCaptcha,
    containerRef
  }
}

export default useSmartCaptcha

