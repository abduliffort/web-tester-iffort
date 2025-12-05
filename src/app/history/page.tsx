"use client";

import { SpeedTestRunner } from "@/components/test/SpeedTestRunner";
import SpeedChecker from "@/components/speed-check/SpeedChecker";
import SpeedCheckLandingPage from "@/page-components/SpeedCheckLandingPage";
import { ENV_CONFIG } from "@/lib/constants";

export default function Home() {
  // You can configure the base URL here - replace with your actual API base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://dev-traiapi.mozark.ai";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <SpeedTestRunner 
        baseUrl={baseUrl}
        defaultScenarioId={ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID} // Default to DataTest Scenario
      /> */}
      {/* <SpeedChecker></SpeedChecker> */}
      <SpeedCheckLandingPage />
    </div>
  );
}
