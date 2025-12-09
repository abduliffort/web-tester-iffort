"use client";


import { TestModal } from "@/components/TestModal";
import { TestModalHandle } from "@/components/TestModal/TestModal.types";
import { Header } from "@/components/Header";
import { AboutPopup } from "@/components/AboutPopup";
import { useState, useEffect, useRef } from "react";
import { ENV_CONFIG } from "@/lib/constants";
import { useTranslation } from "@/hooks/useTranslation";
import { Info, Video, Wifi, Zap } from "lucide-react";
import Image from "next/image";
import speedCheckLogo from "@/assets/speed-checklogo.png";
import FlagWave from "@/components/Footer/Flag";
import Tooltip from "@mui/material/Tooltip";
import { cn } from "@/lib/utils";
import IpDetails from "./IpDetails";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://dev-traiapi.mozark.ai";

const SpeedCheckLandingPage = () => {
  const [currentScenarioId, setCurrentScenarioId] = useState<
    number | undefined
  >(undefined);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  // const [showBackToTop, setShowBackToTop] = useState(false);
  const [showAboutPopup, setShowAboutPopup] = useState(false);
  const [showFlag, setShowFlag] = useState(false);

  const testModalRef = useRef<TestModalHandle>(null);

  const [selectedTest, setSelectedTest] = useState<"internet" | "video">(
    "internet"
  );

  const [isVisibleDownload, setIsVisibleDownload] = useState(false);
  const t = useTranslation();

  // Fetch IP info

  // Scroll handler for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      // setShowBackToTop(window.scrollY > 300);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (!currentScenarioId) {
      timer = setTimeout(() => {
        setShowFlag(true);
      }, 1000);
    } else {
      setShowFlag(false);
    }
    return () => clearTimeout(timer);
  }, [currentScenarioId]);

  const handleClose = () => {
    // setIsModalOpen(false);
    setCurrentScenarioId(undefined);
  };

  const handleTestAgain = (scenarioId?: number) => {
    // If modal asks parent to run a specific scenario, use loadSpeedTest
    if (typeof scenarioId === "number") {
      loadSpeedTest(scenarioId);
    } else {
      // fallback: re-open same modal (use currentScenarioId or default)
      loadSpeedTest(currentScenarioId ?? ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID);
    }
  };

  const handleCancelTest = () => {
    handleClose();
  };

  const handleExportResults = () => {
    // console.log("Exporting results...");
    alert("Export functionality would be implemented here");
  };

  const handleLogoClick = () => {
    if (isTestRunning) return;
    // setIsModalOpen(false);
    setCurrentScenarioId(undefined);
  };

  const handleNavigate = (section: "history" | "map" | "features") => {
    const sectionIds = {
      history: "history-section",
      map: "map-section",
      features: "features-section",
    };
    const element = document.getElementById(sectionIds[section]);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  function loadSpeedTest(scenarioId?: number) {
    window.scrollTo({ top: 0, behavior: "smooth" });

    // If same scenario is already active, force a remount so TestModal re-initializes.
    if (typeof scenarioId === "number" && scenarioId === currentScenarioId) {
      // Unmount
      setCurrentScenarioId(undefined);

      // Small delay to allow unmount; then remount with the same id
      setTimeout(() => {
        setCurrentScenarioId(scenarioId);
      }, 60);

      return;
    }

    setCurrentScenarioId(scenarioId);
  }

  const handleStartTest = () => {
    const scenarioId =
      selectedTest === "internet"
        ? ENV_CONFIG.SCENARIOS.QUICK_TEST_ID
        : ENV_CONFIG.SCENARIOS.FULL_TEST_ID;
    loadSpeedTest(scenarioId);
  };

  const upLiftStore = (showAppStrip: boolean) => {
    setIsVisibleDownload(showAppStrip);
  };

  const onStopFromHeader = () => {
    // handleClose();
    if (testModalRef.current) {
      testModalRef.current.triggerStop();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 w-full">
      {/* Header */}
      <Header
        onLogoClick={handleLogoClick}
        isTestRunning={isTestRunning}
        onNavigate={handleNavigate}
        onAboutClick={() => setShowAboutPopup(true)}
        extraCss="!fixed"
        upLiftStore={upLiftStore}
        onStopFromHeader={onStopFromHeader}
      />

      {/* About Popup */}
      <AboutPopup
        isOpen={showAboutPopup}
        onClose={() => setShowAboutPopup(false)}
      />

      <section
        className={cn(
          "relative min-h-screen bg-gradient-to-b from-blue-50/50 to-white dark:from-transparent dark:to-transparent dark:bg-[url('/images/webTestMainPageBG.png')] dark:bg-cover dark:bg-center dark:bg-no-repeat bg-fixed w-full grid grid-cols-1 h-full",
          isVisibleDownload
            ? currentScenarioId
              ? "pt-[8rem] max-sm:pt-32"
              : "pt-[10rem] max-sm:pt-32"
            : "lg:pt-32 max-lg:pt-16"
        )}
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col max-md:mt-[4rem] max-lg:mt-[5rem] max-sm:mt-[0rem]">
          {currentScenarioId ? (
            <TestModal
              ref={testModalRef}
              isOpen={true}
              onClose={handleClose}
              onCancelTest={handleCancelTest}
              onTestAgain={handleTestAgain}
              onExportResults={handleExportResults}
              onTestRunningChange={setIsTestRunning}
              baseUrl={baseUrl}
              defaultScenarioId={ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID}
              currentScenarioId={currentScenarioId}
              setCurrentScenarioId={setCurrentScenarioId}
            />
          ) : (
            <>
              <div className="text-center">
                {/* Mobile heading larger & better line-height */}
                <div className="flex justify-center mb-[4rem] max-sm:my-[3rem] max-md:mb-[4rem] max-xl:mb-[7rem]">
                  <Image
                    src={speedCheckLogo}
                    alt="SPEED CHECK"
                    priority
                    className="max-sm:w-[10rem] w-[16.2rem] h-auto"
                  />
                </div>
                {/* Test Type Buttons – stacked on mobile */}
                <div className="flex flex-row justify-between sm:justify-center sm:gap-3 gap-2 sm:gap-4 max-sm:mb-0 mb-24 px-6 sm:px-4 max-sm:flex-col max-sm:items-center max-sm:gap-4">
                  {[
                    {
                      id: "internet",
                      label: "Speed Test",
                      icon: <Zap className="w-5 h-5" />,
                      tooltip:
                        "The speed test checks your download speed, upload speed, latency, packet loss, and jitter. These numbers help you understand how fast and stable your internet connection is.",
                      className: "bg-darkYellow text-darkBlue ",
                    },
                    {
                      id: "video",
                      label: "Video & Browser Test",
                      icon: <Video className="w-5 h-5" />,
                      tooltip:
                        "Download speed tells you how fast you receive data (videos, websites, apps). Upload speed tells you how fast you send data (photos, emails, video calls). Both are important for smooth internet use.",
                      className: "bg-darkPink text-white",
                    },
                  ]?.map((btn) => (
                    <button
                      key={btn?.id}
                      onClick={() =>
                        setSelectedTest(btn?.id as "internet" | "video")
                      }
                      className={`flex-1 sm:flex-none ${btn?.id === "internet"
                        ? "px-14 max-sm:px-20"
                        : "px-6 max-sm:px-12"
                        } py-3 rounded-full font-semibold transition-all shadow-lg flex items-center justify-center gap-2 sm:gap-3 text-size2 ${selectedTest === btn?.id
                          ? btn?.className
                          : "bg-gray-200 dark:bg-black/50 text-gray-700 dark:text-white/50 hover:bg-gray-300 dark:hover:bg-white/20"
                        }`}
                    >
                      <span className="inline">{btn?.icon}</span>

                      {t(btn?.label)}

                      <Tooltip title={t(btn?.tooltip)} enterTouchDelay={0}>
                        <span className="inline">
                          <Info className="w-5 h-5" />
                        </span>
                      </Tooltip>
                    </button>
                  ))}
                </div>
              </div>

              {/* Middle: START Button – bigger tap target on mobile */}
              <div className="flex items-center justify-center max-md:mb-[0rem] mb-[3rem] max-sm:my-[4rem]">
                <div className="relative cursor-pointer group">
                  <div
                    className={`absolute inset-0 rounded-full ${selectedTest === "video" ? "bg-darkPink" : "bg-darkYellow"
                      } animate-[ping_2s_ease-out_infinite]`}
                  ></div>
                  <div
                    className={`absolute inset-0 rounded-full ${selectedTest === "video" ? "bg-darkPink" : "bg-darkYellow"
                      } animate-[ping_2s_ease-out_infinite_1.5s]`}
                  ></div>
                  <div className="absolute inset-0 rounded-full bg-white/10 group-hover:opacity-30 transition-opacity"></div>
                  <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse"></div>
                  <div
                    onClick={handleStartTest}
                    className="relative w-32 h-32 sm:w-[8.3rem] sm:h-[8.3rem] rounded-full bg-white flex flex-col items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-300 border-4 border-white/20"
                  >
                    <span className="text-size2 font-bold text-[#204D9C]">
                      {t("START")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom: ISP, IP, Location – better mobile layout */}
            </>
          )}
        </div>
        {!currentScenarioId && (
          <>
            <IpDetails />
          </>
        )}
      </section>

      {showFlag && <FlagWave />}
    </div>
  );
};

export default SpeedCheckLandingPage;
