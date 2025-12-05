import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TestBlockerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * TestBlockerPopup - A minimal themed popup that prevents test cancellation
 * Shows when user tries to close/stop a running test
 */
export const TestBlockerPopup: React.FC<TestBlockerPopupProps> = ({ isOpen, onClose }) => {
  const t = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-gray-900/50 max-w-md w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header - Minimal */}
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Test in Progress')}</h3>
          </div>
        </div>
        
        {/* Content - Minimal */}
        <div className="px-6 py-5">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
            {t('The network test is currently running and')} <span className="font-semibold text-gray-900 dark:text-gray-100">{t('cannot be stopped or cancelled')}</span>.
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5 mb-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1.5">{t('Please wait for the test to complete')}:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1 text-gray-600 dark:text-gray-400">
                  <li>{t('Closing the window is disabled')}</li>
                  <li>{t('Page refresh is prevented')}</li>
                  <li>{t('Navigation is blocked')}</li>
                </ul>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t('This ensures accurate test results and prevents data loss. The test will complete automatically.')}
          </p>
        </div>
        
        {/* Footer - Minimal */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-800 dark:bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
          >
            {t('I Understand')}
          </button>
        </div>
      </div>
    </div>
  );
};
