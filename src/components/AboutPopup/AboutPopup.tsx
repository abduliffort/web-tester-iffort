'use client';
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface AboutPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutPopup: React.FC<AboutPopupProps> = ({ isOpen, onClose }) => {
  const t = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="md:text-3xl text-xl md:font-bold font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('About MySpeed')}
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
          </div>

          {/* Main Description */}
          <div className="space-y-6 text-gray-700 dark:text-gray-300">
            <p className="text-base leading-relaxed">
              {t('MySpeed is an app by the')} <strong>{t('Telecom Regulatory Authority of India (TRAI)')}</strong>.
              {t('It lets users check how their internet is working and share results to help improve networks across the country.')}
            </p>

            {/* Our Goals Section */}
            <div>
              <h3 className="md:text-xl text-lg md:font-bold font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('Our Goals')}:
              </h3>
              <ul className="space-y-2 ml-7">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{t('Give people a simple way to test their internet speed.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{t('Collect real, anonymous test data from across India.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{t('Share insights with service providers so they can improve coverage and quality.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{t('Empower users with transparent information about their connection.')}</span>
                </li>
              </ul>
            </div>

            {/* Why it Matters Section */}
            <div>
              <h3 className="md:text-xl text-lg md:font-bold font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('Why it matters')}:
              </h3>
              <p className="ml-7 leading-relaxed">
                {t('Every test helps build a bigger picture of internet performance in India. Your results, combined with others, show where networks are strong and where they need to improve.')}
              </p>
            </div>

            {/* Note Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 dark:border-blue-400 p-4 rounded-r-lg">
              <p className="text-sm">
                <strong className="text-blue-900 dark:text-blue-300">{t('Note')}:</strong>{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  {t('MySpeed only measures and reports internet performance. It does not fix network issues directly.')}
                </span>
              </p>
            </div>
          </div>

          {/* Footer Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
            >
              {t('Got it!')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
