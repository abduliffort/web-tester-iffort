"use client";
import { Fragment, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import traiLogo from "@/assets/trai-logo-1.png";
import ashokPiller from "@/assets/ashoka_pillar.png";
import { TestBlockerPopup } from "../TestModal/TestBlockerPopup";
import { LanguageSelector } from "../LanguageSelector";
import { useTranslation } from "@/hooks/useTranslation";
import { X } from "lucide-react";
import { useDeviceType } from "@/hooks/useDeviceDetect";
import MySpeedGauge from "@/assets/MySpeedGauge.png";

// App store badge SVGs / PNGs (you can replace with your actual assets)
import AppStoreBadge from "@/assets/applestor.png";
import GooglePlayBadge from "@/assets/playstore.png";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { StopTestConfirmation } from "../TestModal/StopTestConfirmation";

interface HeaderProps {
  onLogoClick?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  isTestRunning?: boolean;
  onNavigate?: (section: "history" | "map" | "features") => void;
  onRunTest?: (scenarioId: number) => void;
  onAboutClick?: () => void;
  extraCss?: string;
  upLiftStore?: (showAppStrip: boolean) => void;
  onStopFromHeader?: (callback?: () => void) => void;
}

const Logo = ({ handleLogoClick }: { handleLogoClick: () => void }) => (
  <Link
    href="/"
    className={cn(
      "flex items-center justify-start gap-2 sm:px-2 cursor-pointer"
    )}
    onClick={handleLogoClick}
  >
    <Image src={ashokPiller} alt="TRAI" className="h-8 w-auto" priority />
    <Image src={traiLogo} alt="TRAI" className="h-8 w-auto" priority />
    <div className="flex flex-col justify-center leading-tight">
      <div className="text-[11px] font-semibold">
        भारतीय दूरसंचार विनियामक प्राधिकरण
      </div>
      <div className="text-[11px] font-semibold">
        Telecom Regulatory Authority Of India
      </div>
      <div className="text-[9px]">
        (IS/ISO 9001:2015 Certified Organisation)
      </div>
    </div>
  </Link>
);

export const Header: React.FC<HeaderProps> = ({
  onLogoClick,
  showBackButton = false,
  isTestRunning = false,
  onAboutClick,
  extraCss,
  upLiftStore, onStopFromHeader
}) => {
  const { deviceType } = useDeviceType();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBlockerPopup, setShowBlockerPopup] = useState(false);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [onStopFromHeaderCallback, setOnStopFromHeaderCallback] = useState<(() => void) | undefined>(undefined);

  const t = useTranslation();

  const handleLogoClick = () => {
    if (isTestRunning) {
      setShowStopConfirmation(true);
      setOnStopFromHeaderCallback(() => onLogoClick);
      return;
    }
    onLogoClick?.();
  };

  const onHistoryNavigate = () => {
    router.push("/history");
  };

  const handleHistoryNavigate = () => {
    if (isTestRunning) {
      setShowStopConfirmation(true);
      setOnStopFromHeaderCallback(() => onHistoryNavigate);
      return;
    }

    onHistoryNavigate();
  };

  return (
    <Fragment>
      {/* === ORIGINAL HEADER (unchanged) === */}
      <header
        className={`bg-white dark:bg-darkPrimary border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 w-full transition-colors ${extraCss}`}
      >
        {/* === NEW APP STORE / GOOGLE PLAY STRIP === */}
        <AppDownloadPopup upLiftStore={upLiftStore} />
        {/* ... all your existing header code ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-16 py-4 sm:py-12">
            <div className="flex items-center justify-between w-full">
              {/* Your original desktop code here */}
              <Logo handleLogoClick={handleLogoClick} />

              <div className="flex justify-end items-center gap-4">
                {/* <span className="text-[13px] font-medium text-gray-100 flex items-center gap-1">
                  <Rocket size={16} fill="white" />
                  {t("279401 Tests Done")}
                </span> */}
                <div className="sm:block hidden">
                  <LanguageSelector />
                </div>
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
          {!showBackButton && (
            <Fragment>
              {/* Dark Overlay */}
              <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isMobileMenuOpen
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
                ${isMobileMenuOpen
                    ? "max-md:translate-y-0 md:translate-x-0 h-full"
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
                <div className="max-sm:block hidden max-sm:px-5 max-sm:py-3 max-sm:flex items-center max-sm:justify-start gap-2 border-y border-white/40">
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
                    <div className="text-[11px] font-semibold">
                      Telecom Regulatory Authority Of India
                    </div>
                    <div className="text-[9px]">
                      (IS/ISO 9001:2015 Certified Organisation)
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-between">
                  {/* Menu Items – Centered */}

                  <div className="w-full flex flex-col items-center mt-5 gap-5 text-md font-medium mt-[22%]">
                    <Link
                      href={"/"}
                      onClick={handleLogoClick}
                      className="hover:text-gray-400 transition text-size2 text-white/80"
                    >
                      {t("Home")}
                    </Link>
                    <div className="w-32 border-t border-white/20" />

                    <button
                      onClick={() => {
                        onAboutClick?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className="hover:text-gray-400 transition text-size2 text-white/80"
                    >
                      {t("About")}
                    </button>

                    <div className="w-32 border-t border-white/20" />

                    <span
                      onClick={handleHistoryNavigate}
                      className="hover:text-gray-400 transition text-size2 text-white/80 cursor-pointer"
                    >
                      {t("Test History")}
                    </span>

                    <div className="w-32 border-t border-white/20" />

                    <button className="hover:text-gray-400 transition text-size2 text-white/80">
                      {t("FAQs")}
                    </button>
                  </div>

                  {/* TRAI MySpeed App Section */}

                  {/* Footer */}
                  <div className="p-6 text-center text-[10px] text-white">
                    <div className="border border-gray-600 rounded-lg p-4 m-6 mb-10 ">
                      <div className="flex justify-between gap-4 items-center">
                        <span className="items-center font-semibold text-[18px] max-sm:text-[16px] mb-2 text-white/80">
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
                                className="w-[7rem]"
                              />
                            </a>
                          )}

                          {(deviceType === "android" ||
                            deviceType === "other") && (
                              <a
                                href="https://play.google.com/store/apps/details?id=com.rma.myspeed&hl=en"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Image
                                  src={GooglePlayBadge}
                                  alt="Google Play"
                                  className="w-[7rem]"
                                />
                              </a>
                            )}
                        </div>
                      </div>

                      <p className="text-size4 text-white/80 text-center mt-4">
                        {t(
                          "Make the most of your internet and network coverage."
                        )}
                      </p>
                    </div>
                    <div className="flex gap-4 justify-center items-center">
                      <a
                        href="https://trai.gov.in/terms-conditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white transition"
                      >
                        Terms & Conditions
                      </a>
                      <a
                        href="https://www.trai.gov.in/portals-apps/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white transition"
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
            </Fragment>
          )}
        </div>

        {/* Stop confirmation popup */}
        <StopTestConfirmation
          isOpen={showStopConfirmation}
          onConfirm={() => {
            onStopFromHeader?.()

            setShowStopConfirmation(false)

            onStopFromHeaderCallback?.()
          }}
          onCancel={() => setShowStopConfirmation(false)}
        />

        {/* Stop confirmation popup */}
        <TestBlockerPopup
          isOpen={showBlockerPopup}
          onClose={() => setShowBlockerPopup(false)}
        />
      </header>
    </Fragment>
  );
};

const AppDownloadPopup = ({
  upLiftStore,
}: {
  upLiftStore?: (showAppStrip: boolean) => void;
}) => {
  const t = useTranslation();

  const [showAppStrip, setShowAppStrip] = useState(false);

  const { deviceType } = useDeviceType();

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

  const openUrl =
    deviceType === "android" || deviceType === "other"
      ? "https://play.google.com/store/apps/details?id=com.rma.myspeed&hl=en"
      : deviceType === "ios" || deviceType === "other"
        ? "https://apps.apple.com/in/app/trai-myspeed/id1129080754"
        : null;

  useEffect(() => {
    upLiftStore?.(showAppStrip);
  }, [showAppStrip]);

  if (!showAppStrip) {
    return null;
  }

  return (
    <div
      className={`relative top-0 left-0 right-0 z-99 transition-all duration-500 ease-in-out ${showAppStrip
        ? "translate-y-0 opacity-100"
        : "-translate-y-full opacity-0"
        }`}
    >
      <div className="bg-darkSecondary text-white py-3 px-4 flex items-center justify-between gap-3 shadow-lg lg:hidden">
        {/* Badges Container */}
        <div className="flex gap-2">
          <Image
            src={MySpeedGauge}
            alt="TRAI"
            className="h-full w-[2rem] filter brightness-0 invert mt-2"
            priority
          />
          <div className="flex flex-col">
            <p className="text-sm font-semibold line-clamp-1 m-0 p-0">
              {t("Download MySpeed for Faster, Smarter Testing")}
            </p>
            <p className="text-[11px] m-0 line-clamp-1 p-0">
              {t(
                "Run trusted tests and understand your internet performance in seconds."
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {openUrl ? (
            <Link
              href={openUrl}
              className="block border py-1 px-3 rounded-full"
              target="_blank"
            >
              Open
            </Link>
          ) : null}

          {/* Close Button */}
          <button
            onClick={onStripClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close app promotion banner"
          >
            <X size={20} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
};
