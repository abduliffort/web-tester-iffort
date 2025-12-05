import React, { useState, useEffect, useRef } from "react";
import { TestModal } from "../components/TestModal";
import { Header } from "@/components/Header";
import { ENV_CONFIG } from "../lib/constants";
import speedCheckLogo from "@/assets/speed-checklogo.svg";
import traiLogo from "@/assets/TRAI telecom.svg";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";

interface ContinuousTestPageProps {
  onBackToHome?: () => void;
}

const ContinuousTestPage: React.FC<ContinuousTestPageProps> = ({
  onBackToHome,
}) => {
  const [showSetup, setShowSetup] = useState(true);
  const [testType, setTestType] = useState<"quick" | "full">("quick");
  const [testCount, setTestCount] = useState(5);
  const [gapBetweenTests, setGapBetweenTests] = useState(30);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTestNumber, setCurrentTestNumber] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [masterId, setMasterId] = useState<number | null>(null);
  const [masterUuid, setMasterUuid] = useState<string | null>(null);
  const [isActualTestRunning, setIsActualTestRunning] = useState(false); // Track if actual test is running
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const autoProgressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const t = useTranslation();

  const getScenarioId = (): number => {
    // Dynamic scenario based on test type selection
    // Quick Test: 1444 (Latency + Download + Upload)
    // Full Test: 1453 (All tests including streaming and web)
    return testType === "quick"
      ? ENV_CONFIG.SCENARIOS.QUICK_TEST_ID
      : ENV_CONFIG.SCENARIOS.FULL_TEST_ID;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const clearTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoProgressTimerRef.current) {
      clearTimeout(autoProgressTimerRef.current);
      autoProgressTimerRef.current = null;
    }
  };

  const startCountdown = (seconds: number) => {
    clearTimer();
    setTimeRemaining(seconds);
    setShowTimer(true);
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, seconds - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearTimer();
        setShowTimer(false);
        setIsModalOpen(true);
      }
    }, 100);
  };

  const startContinuousTesting = async () => {
    if (testCount < 2 || testCount > 1000) {
      alert("Number of tests must be between 2 and 1000");
      return;
    }
    if (gapBetweenTests < 10 || gapBetweenTests > 300) {
      alert("Gap between tests must be between 10 and 300 seconds");
      return;
    }

    // console.log("🚀 Starting Continuous Test...");
    // console.log("📝 Step 1: Authenticating...");

    try {
      // Step 1: Import APIClient and authenticate first
      const { APIClient } = await import("@/lib/auth/api-client");
      const apiClient = new APIClient(ENV_CONFIG.API.BASE_URL);

      // Authenticate to get token
      await apiClient.authenticate();
      // console.log("✅ Authentication successful");

      // // Step 2: Call Master ID API (now authenticated)
      // console.log("📝 Step 2: Calling Master ID API...");
      const masterIdResponse = await apiClient.getMasterId();
      const fetchedMasterId = masterIdResponse.master_id;
      const fetchedMasterUuid = masterIdResponse.uuid;

      // console.log("✅ Master ID obtained:", fetchedMasterId);
      // console.log("✅ Master UUID:", fetchedMasterUuid);

      // Store Master ID and UUID in state
      setMasterId(fetchedMasterId);
      setMasterUuid(fetchedMasterUuid);

      // Start the test
      setShowSetup(false);
      setIsTestRunning(true);
      setCurrentTestNumber(0);
      setIsModalOpen(true);
    } catch (error) {
      // console.error("❌ Failed to initialize continuous test:", error);
      alert("Failed to initialize continuous test. Please try again.");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    const nextTestNumber = currentTestNumber + 1;

    if (nextTestNumber < testCount && isTestRunning) {
      // Don't automatically proceed - let onTestAgain handle it
      // This allows result to be shown first
    } else {
      // All tests completed
      setIsTestRunning(false);
      alert(`Continuous test completed! Total ${testCount} tests performed.`);
      setShowSetup(true);
      setCurrentTestNumber(0);
      setCycleId(null);
      setTestCompleted(false);
      clearTimer();
      setShowTimer(false);
    }
  };

  const handleTestAgain = () => {
    // This is called when user wants to see next test
    // Or automatically after result is shown
    const nextTestNumber = currentTestNumber + 1;

    if (nextTestNumber < testCount && isTestRunning) {
      setCurrentTestNumber(nextTestNumber);
      setTestCompleted(false);
      setIsModalOpen(false);
      startCountdown(gapBetweenTests);
    }
  };

  const handleTestComplete = () => {
    // Called when test finishes and result is displayed
    setTestCompleted(true);

    const nextTestNumber = currentTestNumber + 1;
    if (nextTestNumber < testCount && isTestRunning) {
      // Auto-progress to timer after 3 seconds
      // console.log(
      //   "✅ Test completed, will auto-progress to timer in 3 seconds..."
      // );
      autoProgressTimerRef.current = setTimeout(() => {
        // console.log("⏱️ Auto-progressing to timer...");
        handleTestAgain();
      }, 3000);
    }
  };

  const handleTestCompleteWithId = (receivedCycleId: string) => {
    // Store the cycle ID from test
    // console.log('📝 Received Cycle ID from test:', receivedCycleId);
    setCycleId(receivedCycleId);
    handleTestComplete();
  };

  const handleCancel = () => {
    clearTimer();
    setIsModalOpen(false);
    setShowTimer(false);
    setIsTestRunning(false);
    setShowSetup(true);
    setCurrentTestNumber(0);
    setCycleId(null);
    setTestCompleted(false);
  };

  const handleBackToHome = () => {
    handleCancel();
    if (onBackToHome) {
      onBackToHome();
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  if (showSetup) {
    return (
      <div className="min-h-screen bg-white">
        <Header
          showBackButton={true}
          onBackClick={handleBackToHome}
          onLogoClick={handleBackToHome}
          isTestRunning={isActualTestRunning}
        />

        <div className="bg-gradient-to-b from-blue-50/50 to-white py-12 min-h-[calc(100vh-64px)]">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {t("Continuous Network Test")}
              </h1>
              <p className="text-lg text-gray-600">
                {t(
                  "Run multiple tests automatically to monitor network performance"
                )}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-8">
                <label className="block text-base font-semibold text-gray-900 mb-4">
                  {t("Select Test Type")}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTestType("quick")}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      testType === "quick"
                        ? "border-[#6C63FF] bg-purple-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <h3
                      className={`text-lg font-semibold ${
                        testType === "quick"
                          ? "text-[#6C63FF]"
                          : "text-gray-900"
                      }`}
                    >
                      {t("Quick Test")}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("~3 min per test")}
                    </p>
                  </button>
                  <button
                    onClick={() => setTestType("full")}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      testType === "full"
                        ? "border-[#6C63FF] bg-purple-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <h3
                      className={`text-lg font-semibold ${
                        testType === "full" ? "text-[#6C63FF]" : "text-gray-900"
                      }`}
                    >
                      {t("Full Test")}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("~8 min per test")}
                    </p>
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-base font-semibold text-gray-900 mb-4">
                  {t("Number of Tests")}
                </label>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setTestCount(Math.max(2, testCount - 5))}
                    className="w-14 h-14 rounded-full bg-[#6C63FF] text-white text-2xl font-bold hover:bg-[#5B52E8]"
                  >
                    −
                  </button>
                  <div className="text-center min-w-[120px]">
                    <div className="text-5xl font-bold text-gray-900">
                      {testCount}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {t("tests")}
                    </div>
                  </div>
                  <button
                    onClick={() => setTestCount(Math.min(1000, testCount + 5))}
                    className="w-14 h-14 rounded-full bg-[#6C63FF] text-white text-2xl font-bold hover:bg-[#5B52E8]"
                  >
                    +
                  </button>
                </div>
                <p className="text-center text-sm text-gray-500 mt-3">
                  {t("Range: 2-1000 tests")}
                </p>
              </div>

              <div className="mb-8">
                <label className="block text-base font-semibold text-gray-900 mb-4">
                  {t("Gap Between Tests")}
                </label>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() =>
                      setGapBetweenTests(Math.max(10, gapBetweenTests - 10))
                    }
                    className="w-14 h-14 rounded-full bg-[#6C63FF] text-white text-2xl font-bold hover:bg-[#5B52E8]"
                  >
                    −
                  </button>
                  <div className="text-center min-w-[120px]">
                    <div className="text-5xl font-bold text-gray-900">
                      {gapBetweenTests}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {t("seconds")}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setGapBetweenTests(Math.min(300, gapBetweenTests + 10))
                    }
                    className="w-14 h-14 rounded-full bg-[#6C63FF] text-white text-2xl font-bold hover:bg-[#5B52E8]"
                  >
                    +
                  </button>
                </div>
                <p className="text-center text-sm text-gray-500 mt-3">
                  {t("Range: 10-300 seconds")}
                </p>
              </div>

              <button
                onClick={startContinuousTesting}
                className="w-full py-4 bg-[#6C63FF] text-white text-lg font-semibold rounded-lg hover:bg-[#5B52E8]"
              >
                {t("Start Continuous Test")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showTimer) {
    const progress = (currentTestNumber / testCount) * 100;

    return (
      <div className="min-h-screen bg-white">
        <Header
          showBackButton={true}
          onBackClick={handleBackToHome}
          onLogoClick={handleBackToHome}
          isTestRunning={isTestRunning || isActualTestRunning}
        />

        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t("Continuous Test in Progress")}
              </h2>

              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>
                    {t("Test")} {currentTestNumber + 1} {t("of")} {testCount}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[#6C63FF] h-3 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mb-8">
                <p className="text-gray-600 mb-4">
                  {t("Next test starts in:")}
                </p>
                <div className="text-7xl font-bold text-[#6C63FF]">
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {t("minutes:seconds")}
                </p>
              </div>

              <button
                onClick={handleCancel}
                className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
              >
                {t("Stop Continuous Test")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentTestNumber + 1) / testCount) * 100;

  return (
    <div className="min-h-screen bg-white">
      <Header
        onLogoClick={handleBackToHome}
        isTestRunning={isTestRunning || isActualTestRunning}
      />

      <div className="bg-white border-b px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
            <span>
              {t("Test")} {currentTestNumber + 1} {t("of")} {testCount}
            </span>
            <span>
              {t("Overall Progress")}: {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#6C63FF] h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <TestModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        testType={testType}
        testId={cycleId || undefined}
        dateTime={new Date().toLocaleString()}
        connection="Mobile Data"
        technology="4G"
        operator="Airtel"
        location="Testing Location"
        onCancelTest={handleCancel}
        onTestAgain={handleTestAgain}
        onTestComplete={handleTestCompleteWithId}
        onTestRunningChange={setIsActualTestRunning}
        baseUrl={ENV_CONFIG.API.BASE_URL}
        currentScenarioId={getScenarioId()}
        masterId={masterId || undefined}
        masterUuid={masterUuid || undefined}
        isLastTest={currentTestNumber + 1 === testCount} // Check if this is the last test
      />
    </div>
  );
};

export default ContinuousTestPage;
