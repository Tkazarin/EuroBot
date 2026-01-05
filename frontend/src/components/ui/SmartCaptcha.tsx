import { useEffect, useRef } from 'react'
import { useSmartCaptcha } from '../../hooks/useSmartCaptcha'

interface SmartCaptchaProps {
  onVerify?: (token: string) => void
  onError?: () => void
  className?: string
}

export default function SmartCaptcha({ onVerify, onError, className = '' }: SmartCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isReady, isEnabled, renderCaptcha, token } = useSmartCaptcha()

  useEffect(() => {
    if (isReady && isEnabled && containerRef.current) {
      renderCaptcha(containerRef.current)
    }
  }, [isReady, isEnabled, renderCaptcha])

  useEffect(() => {
    if (token && onVerify) {
      onVerify(token)
    }
  }, [token, onVerify])

  // Don't render anything if captcha is not configured
  if (!isEnabled) {
    return null
  }

  return (
    <div className={`smart-captcha-container ${className}`}>
      <div ref={containerRef} />
      {!isReady && (
        <div className="text-sm text-gray-400">Загрузка капчи...</div>
      )}
    </div>
  )
}

