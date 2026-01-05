import { useEffect, useRef, useState } from 'react'
import { MapPinIcon } from '@heroicons/react/24/outline'

declare global {
  interface Window {
    ymaps: any
  }
}

interface YandexMapProps {
  center?: [number, number] // [lat, lng]
  zoom?: number
  markers?: Array<{
    coordinates: [number, number]
    title?: string
    description?: string
  }>
  height?: string
  className?: string
  useEmbed?: boolean // Use iframe embed (no API key needed)
}

const YANDEX_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''
const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Moscow
const DEFAULT_ZOOM = 14

export default function YandexMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  height = '400px',
  className = '',
  useEmbed = true // Default to embed mode (works without API key)
}: YandexMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use embed iframe (no API key required)
  if (useEmbed || !YANDEX_API_KEY) {
    const marker = markers[0]
    const lat = marker?.coordinates[0] || center[0]
    const lng = marker?.coordinates[1] || center[1]
    const markerText = marker?.title || 'Евробот Россия'
    
    // Generate embed URL with marker
    const embedUrl = `https://yandex.ru/map-widget/v1/?ll=${lng},${lat}&z=${zoom}&pt=${lng},${lat},pm2rdm~${lng},${lat},pm2rdl`
    
    return (
      <div className={`relative ${className}`} style={{ height }}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          style={{ position: 'relative' }}
          title="Яндекс Карта"
        />
        {/* Overlay with info */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <MapPinIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900">{markerText}</h3>
              {marker?.description && (
                <p className="text-sm text-gray-600 mt-1">{marker.description}</p>
              )}
              <a
                href={`https://yandex.ru/maps/?pt=${lng},${lat}&z=${zoom}&l=map`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-eurobot-blue hover:underline"
              >
                Открыть в Яндекс.Картах →
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full API mode (requires API key)
  useEffect(() => {
    if (!YANDEX_API_KEY) {
      setError('API ключ Яндекс.Карт не настроен')
      return
    }

    if (window.ymaps) {
      initMap()
      return
    }

    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=ru_RU`
    script.async = true

    script.onload = () => {
      window.ymaps.ready(() => {
        setIsLoaded(true)
        initMap()
      })
    }

    script.onerror = () => {
      setError('Не удалось загрузить Яндекс.Карты')
    }

    document.head.appendChild(script)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
      }
    }
  }, [])

  const initMap = () => {
    if (!mapContainerRef.current || !window.ymaps) return

    try {
      const map = new window.ymaps.Map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        controls: ['zoomControl', 'fullscreenControl']
      })

      mapInstanceRef.current = map

      if (markers.length > 0) {
        markers.forEach(marker => {
          const placemark = new window.ymaps.Placemark(
            marker.coordinates,
            {
              hintContent: marker.title,
              balloonContentHeader: marker.title,
              balloonContentBody: marker.description
            },
            {
              preset: 'islands#redDotIcon'
            }
          )
          map.geoObjects.add(placemark)
        })

        if (markers.length > 1) {
          map.setBounds(map.geoObjects.getBounds(), {
            checkZoomRange: true,
            zoomMargin: 50
          })
        }
      }

      setIsLoaded(true)
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setError('Ошибка инициализации карты')
    }
  }

  if (error) {
    return (
      <div 
        className={`bg-gray-100 flex flex-col items-center justify-center ${className}`}
        style={{ height }}
      >
        <MapPinIcon className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-500 text-center px-4">{error}</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eurobot-blue" />
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
}

