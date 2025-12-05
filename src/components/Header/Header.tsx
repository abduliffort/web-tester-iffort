"use client";
import { Fragment, useState, useEffect } from "react";
import Image from "next/image";
import speedCheckLogo from "@/assets/speed-checklogo.png";
import traiLogo from "@/assets/trai-logo-1.png";
import ashokPiller from "@/assets/ashoka_pillar.png";
import traiw from "@/assets/trai-w.svg";
import { TestBlockerPopup } from "../TestModal/TestBlockerPopup";
import { LanguageSelector } from "../LanguageSelector";
import { ThemeToggle } from "../ThemeToggle";
import { useTranslation } from "@/hooks/useTranslation";
import { Rocket, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeviceType } from "@/hooks/useDeviceDetect";

// App store badge SVGs / PNGs (you can replace with your actual assets)
import AppStoreBadge from "@/assets/applestor.png";
import GooglePlayBadge from "@/assets/playstore.png";
import Link from "next/link";

interface HeaderProps {
  onLogoClick?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  isTestRunning?: boolean;
  onNavigate?: (section: "history" | "map" | "features") => void;
  onRunTest?: (scenarioId: number) => void;
  onAboutClick?: () => void;
  extraCss?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onLogoClick,
  showBackButton = false,
  onBackClick,
  isTestRunning = false,
  onNavigate,
  onRunTest,
  onAboutClick,
  extraCss,
}) => {
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBlockerPopup, setShowBlockerPopup] = useState(false);
  const [showTestDropdown, setShowTestDropdown] = useState(false);

  const t = useTranslation();

  const handleLogoClick = () => {
    if (isTestRunning) {
      setShowBlockerPopup(true);
      return;
    }
    router.push("/");
  };

  const handleBackClick = () => {
    if (isTestRunning) {
      setShowBlockerPopup(true);
      return;
    }
    onBackClick?.();
  };
  const { deviceType } = useDeviceType();

  return (
    <Fragment>
      {/* === ORIGINAL HEADER (unchanged) === */}
      <header
        className={`bg-white dark:bg-darkPrimary border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 w-full transition-colors ${extraCss}`}
      >
        {/* ... all your existing header code ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-16 py-4 sm:py-12">
            {/* ---------- MOBILE VIEW ---------- */}
            <div className="flex flex-col w-full sm:hidden">
              {/* Top Row: Tests + Language + Toggle */}
              <div className="flex items-center justify-between px-2">
                {/* Left: Tests */}
                {/* <span className="text-[13px] font-medium text-gray-100 flex items-center gap-1">
                  <Rocket size={14} fill="white" />
                  {t("279401 Tests Done")}
                </span> */}
                <LanguageSelector />

                {/* Right: Language + Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Toggle menu"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {isMobileMenuOpen ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Divider Line */}
              <div className="border-t border-gray-500 my-2 w-full"></div>

              {/* Logos and Text */}
              <div
                className="flex items-center justify-start gap-3 px-2 cursor-pointer"
                onClick={handleLogoClick}
              >
                <Image
                  src={ashokPiller}
                  alt="TRAI"
                  className="h-8 w-auto"
                  priority
                />
                <Image
                  src={traiLogo}
                  alt="TRAI"
                  className="h-8 w-auto"
                  priority
                />
                <div className="flex flex-col justify-center leading-tight">
                  <div className="text-[11px] font-semibold">
                    भारतीय दूरसंचार विनियामक प्राधिकरण
                  </div>
                  <div className="text-[12px] font-semibold">
                    Telecom Regulatory Authority Of India
                  </div>
                  <div className="text-[9px]">
                    (IS/ISO 9001:2015 Certified Organisation)
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- DESKTOP VIEW (unchanged) ---------- */}
            <div className="hidden sm:flex items-center justify-between w-full">
              {/* Your original desktop code here */}
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={handleLogoClick}
              >
                <Image
                  src={ashokPiller}
                  alt="TRAI"
                  className="h-8 sm:h-11 w-auto"
                  priority
                />
                <Image
                  src={traiLogo}
                  alt="TRAI"
                  className="h-8 sm:h-11 w-auto"
                  priority
                />
                <div className="pr-4">
                  <div className="text-[12px] font-semibold">
                    भारतीय दूरसंचार विनियामक प्राधिकरण
                  </div>
                  <div className="text-sm font-semibold">
                    Telecom Regulatory Authority Of India
                  </div>
                  <div className="text-[10px]">
                    (IS/ISO 9001:2015 Certified Organisation)
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4">
                {/* <span className="text-[13px] font-medium text-gray-100 flex items-center gap-1">
                  <Rocket size={16} fill="white" />
                  {t("279401 Tests Done")}
                </span> */}
                <LanguageSelector />
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isMobileMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu sidebar - unchanged */}
          {/* === MOBILE SIDEBAR – Responsive: Right (30%) on large, Top (70%) on small === */}
          {/* === FINAL SIDEBAR – Simple Right-to-Left Slide + Language Dropdown === */}
          {!showBackButton && (
            <>
              {/* Dark Overlay */}
              <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
                  isMobileMenuOpen
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Sidebar – Slides in from Right */}
              <div
                className={`
                fixed top-0 right-0 md:bottom-0 w-full md:w-[30%] bg-darkPrimary text-white z-50
                flex flex-col
                transition-transform duration-300 ease-out
                ${
                  isMobileMenuOpen
                    ? "max-md:translate-y-0 md:translate-x-0"
                    : "max-md:-translate-y-full md:translate-x-full"
                }
              `}
              >
                {/* Header: Language + Close */}
                <div className="flex items-center justify-between md:justify-end p-5">
                  {/* Language Selector – Exactly like in your screenshot */}
                  <div className="md:hidden">
                    <LanguageSelector />{" "}
                  </div>
                  {/* Your existing LanguageSelector component */}
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-between">
                  {/* Menu Items – Centered */}
                  <div className="w-full flex flex-col items-center justify-start mt-5 gap-5 text-md font-medium">
                    <button
                      onClick={() => {
                        onAboutClick?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className="hover:text-gray-400 transition"
                    >
                      {t("About")}
                    </button>

                    <div className="w-32 border-t border-white/20" />

                    <Link
                      href={"/history"}
                      className="hover:text-gray-400 transition"
                    >
                      {t("Test History")}
                    </Link>

                    <div className="w-32 border-t border-white/20" />

                    <button className="hover:text-gray-400 transition">
                      {t("FAQs")}
                    </button>
                  </div>

                  {/* TRAI MySpeed App Section */}
                  <div className="border border-gray-600 rounded-lg p-4 m-6 mb-10 md:mb-auto mt-10 md:mt-auto">
                    <div className="flex justify-between gap-4 items-center">
                      <span className="text-lg max-sm:text-md items-center font-semibold mb-2">
                        {t("Download")}{" "}
                        <span className="text-darkYellow">
                          {t("TRAI MySpeed App")}
                        </span>
                      </span>
                      <div className="gap-4 flex flex-col">
                        {(deviceType === "ios" || deviceType === "other") && (
                          <a
                            href="https://apps.apple.com/in/app/trai-myspeed/id1129080754"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Image
                              src={AppStoreBadge}
                              alt="App Store"
                              className="w-22"
                            />
                          </a>
                        )}

                        {(deviceType === "android" ||
                          deviceType === "other") && (
                          <>
                            <a
                              href="https://play.google.com/store/apps/details?id=com.rma.myspeed&hl=en"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Image
                                src={GooglePlayBadge}
                                alt="Google Play"
                                className="w-22"
                              />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-[0.8rem] text-white text-center mt-4">
                      {t(
                        "Make the most of your internet and network coverage."
                      )}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="p-6 text-center text-[0.8rem] text-white">
                    <div className="flex gap-4 justify-center items-center">
                      <a
                        href="https://trai.gov.in/terms-conditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-white/80 transition"
                      >
                        Terms & Conditions
                      </a>
                      <a
                        href="https://www.trai.gov.in/portals-apps/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-white/80 transition"
                      >
                        Privacy Policy
                      </a>
                    </div>
                    <hr className="my-2 border-white/20" />
                    <p className="text-white/50">
                      &copy; {new Date().getFullYear()} TRAI. All Rights
                      Reserved.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <TestBlockerPopup
          isOpen={showBlockerPopup}
          onClose={() => setShowBlockerPopup(false)}
        />
      </header>

      {/* === NEW APP STORE / GOOGLE PLAY STRIP === */}
      {/* <AppDownloadPopup /> */}
    </Fragment>
  );
};

const AppDownloadPopup = () => {
  const t = useTranslation();

  const [deviceType, setDeviceType] = useState<
    "android" | "ios" | "other" | null
  >(null);
  const [showAppStrip, setShowAppStrip] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("android") > -1) {
      setDeviceType("android");
    } else if (
      ua.indexOf("iphone") > -1 ||
      ua.indexOf("ipad") > -1 ||
      ua.indexOf("ipod") > -1
    ) {
      setDeviceType("ios");
    } else {
      setDeviceType("other");
    }
  }, []);

  useEffect(() => {
    const showAppStripSession = sessionStorage?.getItem("showAppStrip");
    if (showAppStripSession === "false") {
      setShowAppStrip(false);
    } else {
      setShowAppStrip(true);
    }
  }, []);

  const onStripClose = () => {
    sessionStorage?.setItem("showAppStrip", "false");
    setShowAppStrip(false);
  };

  return (
    <div
      className={`fixed top-[8rem] left-0 right-0 z-40 transition-all duration-500 ease-in-out ${
        showAppStrip
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      <div className="bg-darkSecondary text-white py-3 px-4 flex items-center justify-between gap-6 shadow-lg sm:hidden block">
        <span className="text-sm font-medium">{t("Available on:")}</span>

        {/* Badges Container */}
        <div className="flex gap-4">
          {/* App Store Badge - Show if iOS or Other */}
          {(deviceType === "ios" || deviceType === "other") && (
            <a
              href="https://apps.apple.com/in/app/trai-myspeed/id1129080754"
              target="_blank"
              rel="noopener noreferrer"
              className="transform transition-transform hover:scale-105"
            >
              <Image src={AppStoreBadge} alt="Download on the App Store" />
            </a>
          )}

          {/* Google Play Badge - Show if Android or Other */}
          {(deviceType === "android" || deviceType === "other") && (
            <a
              href="https://play.google.com/store/apps/details?id=com.rma.myspeed&hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="transform transition-transform hover:scale-105"
            >
              <Image src={GooglePlayBadge} alt="Get it on Google Play" />
            </a>
          )}
        </div>

        {/* Close Button */}
        <div>
          <button
            onClick={onStripClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close app promotion banner"
          >
            <X size={20} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
};
