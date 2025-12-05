/**
 * Example Component with Translation
 * 
 * This file demonstrates how to properly implement translation
 * in any component of the TRAI Speed Test application.
 */

'use client';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

export const TranslationExampleComponent = () => {
  // Method 1: Using the simple translation hook (Recommended for most cases)
  const t = useTranslation();
  
  // Method 2: Using the language context directly (for advanced features)
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Example 1: Simple text translation */}
      <h1 className="text-3xl font-bold mb-4">
        {t('Welcome to TRAI Speed Test')}
      </h1>

      {/* Example 2: Paragraph translation */}
      <p className="text-gray-600 mb-6">
        {t('Test your internet speed and help improve network quality across India.')}
      </p>

      {/* Example 3: Button text */}
      <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
        {t('Start Speed Test')}
      </button>

      {/* Example 4: List items */}
      <ul className="mt-6 space-y-2">
        <li>{t('Download Speed Test')}</li>
        <li>{t('Upload Speed Test')}</li>
        <li>{t('Latency Measurement')}</li>
        <li>{t('Video Streaming Quality')}</li>
      </ul>

      {/* Example 5: Form labels and placeholders */}
      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">
          {t('Enter your location')}
        </label>
        <input
          type="text"
          placeholder={t('City name')}
          className="border border-gray-300 rounded px-3 py-2 w-full"
        />
      </div>

      {/* Example 6: Conditional text */}
      <div className="mt-6">
        {isTranslating ? (
          <p>{t('Translating...')}</p>
        ) : (
          <p>{t('Ready to test')}</p>
        )}
      </div>

      {/* Example 7: Display current language */}
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <p className="text-sm">
          <strong>{t('Current Language')}:</strong> {currentLanguage.nativeName}
        </p>
      </div>

      {/* Example 8: Complex sentence with inline elements */}
      <p className="mt-6 text-sm text-gray-600">
        {t('By using this service, you agree to our')}{' '}
        <a href="#" className="text-blue-500 underline">
          {t('Terms of Service')}
        </a>
        {' '}{t('and')}{' '}
        <a href="#" className="text-blue-500 underline">
          {t('Privacy Policy')}
        </a>
      </p>

      {/* Example 9: Table headers */}
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">{t('Test Type')}</th>
            <th className="border p-2">{t('Speed')}</th>
            <th className="border p-2">{t('Status')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2">{t('Download')}</td>
            <td className="border p-2">50 Mbps</td>
            <td className="border p-2">{t('Good')}</td>
          </tr>
        </tbody>
      </table>

      {/* Example 10: Alert messages */}
      <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
        <p className="font-bold">{t('Warning')}</p>
        <p>{t('Please ensure stable internet connection during the test.')}</p>
      </div>

      {/* Example 11: Success message */}
      <div className="mt-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
        <p className="font-bold">{t('Test Completed')}</p>
        <p>{t('Your results have been saved successfully.')}</p>
      </div>

      {/* Example 12: Error message */}
      <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
        <p className="font-bold">{t('Error')}</p>
        <p>{t('Unable to connect to the server. Please try again.')}</p>
      </div>
    </div>
  );
};

/**
 * IMPORTANT NOTES:
 * 
 * 1. Always use complete sentences for better translation context
 * 2. Don't translate:
 *    - Numbers (50 Mbps)
 *    - Technical units (ms, Mbps, GB)
 *    - Brand names (TRAI)
 *    - URLs
 * 
 * 3. For dynamic content, translate the template:
 *    ✅ {t('Speed')}: {value} Mbps
 *    ❌ {t(`Speed: ${value} Mbps`)}
 * 
 * 4. Keep translations simple and user-friendly
 * 5. Test with multiple languages to ensure layout doesn't break
 * 6. Consider text length variations between languages
 */

export default TranslationExampleComponent;
