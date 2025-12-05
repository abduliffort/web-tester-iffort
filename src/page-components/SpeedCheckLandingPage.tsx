"use client";

import { TestModal } from "@/components/TestModal";
import { Header } from "@/components/Header";
import { AboutPopup } from "@/components/AboutPopup";
import { useState, useEffect } from "react";
import { ENV_CONFIG } from "@/lib/constants";
import { useTranslation } from "@/hooks/useTranslation";
import { Info, Video, Wifi, Zap } from "lucide-react";
import Image from "next/image";
import speedCheckLogo from "@/assets/speed-checklogo.png";
import FlagWave from "@/components/Footer/Flag";
import Tooltip from "@mui/material/Tooltip";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://dev-traiapi.mozark.ai";

const SpeedCheckLandingPage = () => {
  const [currentScenarioId, setCurrentScenarioId] = useState<
    number | undefined
  >(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showAboutPopup, setShowAboutPopup] = useState(false);
  const [showFlag, setShowFlag] = useState(false);

  const [selectedTest, setSelectedTest] = useState<"internet" | "video">(
    "internet"
  );
  const [ip, setIp] = useState("");
  const [isp, setIsp] = useState("");
  const [location, setLocation] = useState("");
  const t = useTranslation();

  // Fetch IP info
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        setIp(data.ip || "");
        setIsp(data.org || "Unknown ISP");
        setLocation(`${data.city || ""}, ${data.region || ""}`);
      })
      .catch(() => {
        setIp("180.151.26.26");
        setIsp("Shyam Spectra Pvt. Ltd.");
        setLocation("Noida, Uttar Pradesh");
      });
  }, []);

  // Scroll handler for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
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
    setIsModalOpen(false);
    setCurrentScenarioId(undefined);
  };

  const handleTestAgain = (scenarioId?: number) => {
    console.log("scenarioId", scenarioId);

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
    setIsModalOpen(false);
    setCurrentScenarioId(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    // Normal path: just set the scenario id (mounts modal)
    setCurrentScenarioId(scenarioId);
  }

  const handleStartTest = () => {
    const scenarioId =
      selectedTest === "internet"
        ? ENV_CONFIG.SCENARIOS.QUICK_TEST_ID
        : ENV_CONFIG.SCENARIOS.FULL_TEST_ID;
    loadSpeedTest(scenarioId);
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
      />

      {/* About Popup */}
      <AboutPopup
        isOpen={showAboutPopup}
        onClose={() => setShowAboutPopup(false)}
      />

      <>
        <section
          className="relative min-h-screen bg-gradient-to-b from-blue-50/50 to-white
            dark:from-transparent dark:to-transparent
            dark:bg-[url('/images/webTestMainPageBG.png')]
            dark:bg-cover dark:bg-center dark:bg-no-repeat
            bg-fixed pt-16 w-full grid grid-cols-1 w-full h-full"
        >
          <div className="max-w-7xl mx-auto w-full flex flex-col max-md:mt-[4rem] mt-[5rem] max-sm:mt-[5rem]">
            {currentScenarioId ? (
              <TestModal
                isOpen={true}
                onClose={handleClose}
                onCancelTest={handleCancelTest}
                onTestAgain={handleTestAgain}
                onExportResults={handleExportResults}
                onTestRunningChange={setIsTestRunning}
                baseUrl={baseUrl}
                defaultScenarioId={ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID}
                currentScenarioId={currentScenarioId}
              />
            ) : (
              <>
                <div className="text-center">
                  {/* Mobile heading larger & better line-height */}
                  <div className="flex justify-center mb-[8rem] max-sm:my-[4rem] max-md:mb-[6rem] max-xl:mb-[7rem]">
                    <Image src={speedCheckLogo} alt="SPEED CHECK" priority />
                  </div>
                  {/* Test Type Buttons – stacked on mobile */}
                  <div className="flex flex-row justify-between sm:justify-center sm:gap-3 gap-2 sm:gap-4 mb-12 sm:mb-16 px-6 sm:px-4">
                    <button
                      onClick={() => setSelectedTest("internet")}
                      className={`flex-1 sm:flex-none px-14 max-sm:px-0 py-3 rounded-full font-semibold transition-all shadow-lg flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base ${
                        selectedTest === "internet"
                          ? "bg-darkYellow text-darkBlue"
                          : "bg-gray-200 dark:bg-black/50 text-gray-700 dark:text-white/50 hover:bg-gray-300 dark:hover:bg-white/20"
                      }`}
                    >
                      <span className="hidden sm:inline">
                        <Zap className="w-5 h-5" />
                      </span>

                      {t("Speed Test")}

                      <Tooltip title={t("The speed test checks your download speed, upload speed, latency, packet loss, and jitter. These numbers help you understand how fast and stable your internet connection is.")}>
                        <span className="hidden sm:inline">
                          <Info className="w-5 h-5" />
                        </span>
                      </Tooltip>
                    </button>

                    <button
                      onClick={() => setSelectedTest("video")}
                      className={`flex-1 sm:flex-none px-0 sm:px-6 py-3 rounded-full font-semibold transition-all shadow-lg flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base ${
                        selectedTest === "video"
                          ? "bg-darkPink text-white"
                          : "bg-gray-200 dark:bg-black/50 text-gray-700 dark:text-white/50 hover:bg-gray-300 dark:hover:bg-white/20"
                      }`}
                    >
                      <span className="hidden sm:inline">
                        <Video className="w-5 h-5" />
                      </span>
                      {t("Video & Browser Test")}

                      <Tooltip title={t("Download speed tells you how fast you receive data (videos, websites, apps). Upload speed tells you how fast you send data (photos, emails, video calls). Both are important for smooth internet use.")}>
                        <span className="hidden sm:inline">
                          <Info className="w-5 h-5" />
                        </span>
                      </Tooltip>
                    </button>
                  </div>
                </div>

                {/* Middle: START Button – bigger tap target on mobile */}
                <div className="flex items-center justify-center max-md:mb-[3rem] mb-[10rem] max-sm:mt-[4rem]">
                  <div className="relative cursor-pointer group">
                    <div
                      className={`absolute inset-0 rounded-full ${
                        selectedTest === "video"
                          ? "bg-darkPink"
                          : "bg-darkYellow"
                      } animate-[ping_2s_ease-out_infinite]`}
                    ></div>
                    <div
                      className={`absolute inset-0 rounded-full ${
                        selectedTest === "video"
                          ? "bg-darkPink"
                          : "bg-darkYellow"
                      } animate-[ping_2s_ease-out_infinite_1.5s]`}
                    ></div>
                    <div className="absolute inset-0 rounded-full bg-white/10 group-hover:opacity-30 transition-opacity"></div>
                    <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse"></div>
                    <div
                      onClick={handleStartTest}
                      className="relative w-32 h-32 sm:w-[8.3rem] sm:h-[8.3rem] rounded-full bg-white flex flex-col items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-300 border-4 border-white/20"
                    >
                      <span className="text-2xl sm:text-[1.5rem] font-bold text-[#204D9C]">
                        {t("START")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom: ISP, IP, Location – better mobile layout */}
              </>
            )}
          </div>
          <footer className="flex flex-row sm:grid sm:grid-cols-3 justify-between text-center gap-3 sm:gap-0 mx-auto w-full text-xs sm:text-sm mt-auto max-w-7xl mb-[6rem] max-sm:mb-[4rem]">
            <div className="flex-1">
              <div className="font-normal text-gray-600 dark:text-white/80">
                {t("ISP Name")}
              </div>
              <div className="mt-1 px-1 sm:px-2">{t(isp)} </div>
            </div>
            <div className="flex-1">
              <div className="font-normal text-gray-600 dark:text-white/80">
                {t("IP Address")}
              </div>
              <div className="mt-1 px-1 sm:px-2">{ip}</div>
            </div>
            <div className="flex-1">
              <div className="font-normal text-gray-600 dark:text-white/80">
                {t("Location")}
              </div>
              <div className="mt-1 px-1 sm:px-2">{t(location)}</div>
            </div>
          </footer>
        </section>
      </>

      {showFlag && <FlagWave />}
    </div>
  );
};

export default SpeedCheckLandingPage;
