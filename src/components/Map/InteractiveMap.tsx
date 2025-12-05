'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface InteractiveMapProps {
  apiUrl?: string;
}

export const InteractiveMap = ({ apiUrl = 'https://dev-traidashboard.mozark.ai/map/' }: InteractiveMapProps) => {
  const t = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMap = () => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = apiUrl; // Reload the iframe by resetting its src
      setIsLoading(true);
      setError(null);
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      setIsLoading(false);
      setError(t('Failed to load map. Please try again later.'));
    };

    // Set a timeout to stop loading after 10 seconds
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError(t('Map is taking too long to load. Please check your internet connection.'));
      }
    }, 10000);

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      clearTimeout(timeout);
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [isLoading, t]);

  useEffect(() => {
    if (error) {
      const autoRefreshTimeout = setTimeout(() => {
        refreshMap();
      }, 5000); // Auto-refresh after 5 seconds

      return () => clearTimeout(autoRefreshTimeout);
    }
  }, [error]);

  return (
    <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-lg overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('Loading interactive map...')}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center text-red-600 dark:text-red-400">
            <svg
              className="w-12 h-12 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium">{error}</p>
            <button
              onClick={refreshMap}
              className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              {t('Retry Loading Map')}
            </button>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={apiUrl}
        className="w-full h-full border-0"
        title={t('India Internet Speed Map')}
        allow="geolocation"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />

      {/* Map Controls Info */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">
        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
          🖱️ {t('Interactive Map: Zoom and pan to explore')}
        </p>
      </div>
    </div>
  );
};
