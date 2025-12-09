"use client";

import { Header } from "@/components/Header";
import { AboutPopup } from "@/components/AboutPopup";
import { useState } from "react";
import History from "@/components/history/history";

const HistoryPage = () => {
  const [showAboutPopup, setShowAboutPopup] = useState(false);

  const handleLogoClick = () => {
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 w-full">
      {/* Header */}
      <Header
        onLogoClick={handleLogoClick}
        isTestRunning={false}
        onNavigate={handleNavigate}
        onAboutClick={() => setShowAboutPopup(true)}
        extraCss="!fixed"
      />

      {/* About Popup */}
      <AboutPopup
        isOpen={showAboutPopup}
        onClose={() => setShowAboutPopup(false)}
      />

      <section
        className="relative min-h-screen bg-gradient-to-b from-blue-50/50 to-white
            dark:from-transparent dark:to-transparent
            dark:bg-[url('/images/webTestMainPageBG.png')]
            dark:bg-cover dark:bg-center dark:bg-no-repeat
            bg-fixed pt-16 w-full grid grid-cols-1 w-full h-full"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col max-md:mt-[4rem] mt-[5rem] max-sm:mt-[2rem]">
          <History />
        </div>
      </section>
    </div>
  );
};

export default HistoryPage;
