'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import FontSizeButtons from './FontSizeButtons';

const Header = () => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const languages = ['English', 'French', 'Spanish', 'German'];
  const handleLanguageSelect = (lang: string) => {
    setSelectedLanguage(lang);
    setIsLangMenuOpen(false); // Close the menu after selection
  };
  return (
    <header className="bg-white py-4 px-6 md:px-12 flex justify-between items-center shadow-md">
      <div className="flex items-center space-x-4">
        <Image src="/images/speed-check-logo.png" alt="Speed Check Logo" width={150} height={40} />
        <div className="h-15 w-[4px] bg-[#d9d9db] rounded-full"></div>
        <div className="flex items-center space-x-2">
          <Image src="/images/trai-full-logo.png" alt="TRAI Logo" width={500} height={30} className="w-full h-auto" />
          {/* <Image src="/gov-india-logo.png" alt="Government of India Logo" width={30} height={30} /> */}
        </div>
      </div>
      {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          {/* <button className="text-[rgba(86,97,255,1)] hover:opacity-80" style={{
            boxSizing: "border-box",
            width: "18px",
            height: "18px",
            borderRadius: "833.25px",
            flex: "none",
            order: "0",
            flexGrow: "0",
        }}>
            ⦿
          </button> */}
        <button
            className="relative flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm"
            aria-label="Toggle theme"
            >
            {/* Half gradient overlay */}
            <div className="absolute left-0 top-0 h-full w-1/2 rounded-l-full bg-gradient-to-b from-[#7B61FF] to-[#5A8BFF]" />
        </button>

          {/* Divider */}
          <div className="h-6 w-[2px] bg-[rgba(63,65,77,1)] rounded-full"></div>

          {/* Font Size Controls */}
          <div className="flex items-center gap-1 text-[rgba(86,97,255,1)]">
            {/* <span className="text-xs">A</span>
            <span className="text-sm">A</span>
            <span className="text-base">A</span> */}
            <FontSizeButtons />
          </div>

          {/* Divider */}
          <div className="h-6 w-[2px] bg-[rgba(63,65,77,1)] rounded-full"></div>

          {/* Language Selector */}
          {/* <div className="flex items-center gap-1">
            <div className="flex items-center justify-center rounded-md bg-[rgba(63,65,77,1)] px-2 py-[2px] text-xs font-semibold text-white">
              Aa
            </div>
            <span className="text-sm text-[rgba(63,65,77,1)]">English</span>
            <ChevronDownIcon className="h-4 w-4 text-[rgba(63,65,77,1)]" />
          </div> */}

          {/* Right Side: Language Dropdown, Start Test, Login */}
          <div className="flex items-center space-x-4">
            
            {/* Language Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium">{selectedLanguage}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isLangMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
              </button>

              {/* Dropdown Panel */}
              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="language-menu-button">
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageSelect(lang)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>

          {/* Buttons */}
          <button className="rounded-full bg-gradient-to-r from-[rgba(151,103,255,1)] to-[rgba(86,97,255,1)] px-5 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Start a Test
          </button>

          <button className="rounded-full border border-[rgba(151,103,255,1)] px-5 py-1.5 text-sm font-medium text-[rgba(86,97,255,1)] hover:bg-[rgba(151,103,255,0.1)]">
            Login
          </button>
        </div>
    </header>
  );
};

export default Header;