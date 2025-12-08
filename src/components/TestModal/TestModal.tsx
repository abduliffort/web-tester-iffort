import React, { useState, useCallback, useEffect, useRef } from "react";
import type { TestModalProps } from "./TestModal.types";
import { SpeedTestEngine } from "@/lib/speed-test";
import {
  TestResults,
  Scenario,
  Server,
  EnvironmentInfo,
  NetworkInformation,
} from "@/lib/types/speed-test";
import { ENV_CONFIG, GEO_CONFIG } from "@/lib/constants";
import { GeolocationService } from "@/lib/utils/geolocation";
import { TestPreviewPanel } from "./TestPreviewPanel";
import { TestProgressList } from "./TestProgressList";
import { TestBlockerPopup } from "./TestBlockerPopup";
import { SpeedGauge } from "./SpeedGauge";
import {
  saveTestResultToStorage,
  type StoredTestResult,
} from "@/lib/utils/localStorage";
import { useTranslation } from "@/hooks/useTranslation";
import { Download, Info, RotateCw, X } from "lucide-react";
import RenderCompletedResults from "./RenderCompletedResults";
import Image from "next/image";
import speedCheckLogo from "@/assets/speed-checklogo.png";
import Tooltip from "@mui/material/Tooltip";

interface SystemInfo {
  userIP?: string;
  ispName?: string;
  location?: string;
  isAuthenticated: boolean;
  bestServer?: Server;
}

export const TestModal: React.FC<TestModalProps> = ({
  isOpen,
  onClose,
  testType,
  testStatus,
  currentMetric,
  estimatedTime,
  testId,
  dateTime,
  connection,
  technology,
  operator,
  location,
  testResult,
  progressMetrics = [],
  onCancelTest,
  onTestAgain,
  onExportResults,
  onTestComplete,
  onTestRunningChange, // NEW: Callback to notify parent
  baseUrl,
  defaultScenarioId = ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID,
  currentScenarioId = undefined,
  masterId = undefined,
  masterUuid = undefined,
  isLastTest = false, // NEW: Indicates if this is the last test in continuous mode
  setCurrentScenarioId,
}) => {
  const t = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [stepProgress, setStepProgress] = useState(0);
  // Individual progress tracking for each test
  const [progressByTest, setProgressByTest] = useState<{
    latency: number;
    download: number;
    upload: number;
    web: number;
    streaming: number;
  }>({
    latency: 0,
    download: 0,
    upload: 0,
    web: 0,
    streaming: 0,
  });
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableScenarios, setAvailableScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number>(
    typeof currentScenarioId === "number"
      ? currentScenarioId
      : typeof defaultScenarioId === "number"
      ? defaultScenarioId
      : ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    isAuthenticated: false,
  });
  const [geoipResponse, setGeoipResponse] = useState<any>(null);
  const [testEngine, setTestEngine] = useState<SpeedTestEngine | null>(null);
  const testEngineRef = useRef<SpeedTestEngine | null>(null); // Ref to always access latest engine
  const [liveResults, setLiveResults] = useState<{
    download?: number;
    upload?: number;
    latency?: number;
    web?: number;
    streaming?: number;
  }>({});
  const [internalTestId, setInternalTestId] = useState<string>("");
  const [webTestResults, setWebTestResults] = useState<number[]>([]); // Track all web test results
  const [locationInfo, setLocationInfo] = useState<{
    address: string;
    isp: string;
    source: string;
  } | null>(null);
  const [userIP, setUserIP] = useState<string>("Fetching...");
  const [showBlockerPopup, setShowBlockerPopup] = useState(false);

  // Use refs for duplicate prevention (more reliable than state for sync checks)
  const isTestRunningRef = useRef<boolean>(false); // Changed from state to ref
  const savedResultTimestampRef = useRef<number | null>(null); // Track saved result timestamp
  const hasInitializedRef = useRef<boolean>(false); // Track if initialization has been done
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null); // For smooth progress animation
  const testWasCancelledRef = useRef<boolean>(false); // Track if test was cancelled

  if (!isOpen) return null;
  const [displayScenarioId, setDisplayScenarioId] =
    useState<number>(selectedScenarioId);

  // Determine active steps for the progress bar based on the DISPLAY scenario ID
  const activeTestSteps = React.useMemo(() => {
    const allSteps = [
      { key: "latency", label: t("Latency") },
      { key: "download", label: t("Download") },
      { key: "upload", label: t("Upload") },
      { key: "web", label: t("Web Browsing") },
      { key: "streaming", label: t("Video Streaming") },
    ];

    const isFullTestDisplay =
      displayScenarioId === ENV_CONFIG.SCENARIOS.FULL_TEST_ID;
    const isQuickTestDisplay =
      displayScenarioId === ENV_CONFIG.SCENARIOS.QUICK_TEST_ID;

    // If the DISPLAY is the Full Test, show only Web and Streaming (2 steps)
    if (isFullTestDisplay) {
      return allSteps.filter(
        (step) => step.key === "web" || step.key === "streaming"
      );
    }

    // If the DISPLAY is the Quick Test, show Latency, Download, Upload (3 steps)
    if (isQuickTestDisplay || !displayScenarioId) {
      return allSteps.filter(
        (step) => step.key !== "web" && step.key !== "streaming"
      );
    }

    // Default: return all steps if scenario is unknown
    return allSteps;
  }, [displayScenarioId, t]);

  // Add beforeunload handler to prevent page refresh during test
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTestRunningRef.current) {
        // Prevent page refresh/close and show custom popup
        e.preventDefault();
        e.returnValue = ""; // Modern browsers ignore custom messages
        setShowBlockerPopup(true);
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Fetch location and ISP info when component mounts
  useEffect(() => {
    const fetchLocationAndISP = async () => {
      try {
        // console.log("🌍 Requesting precise device location...");

        // Try browser geolocation first
        const position: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });

        const { latitude, longitude, accuracy } = position.coords;
        // console.log(
        //   "📍 Device location found:",
        //   latitude,
        //   longitude,
        //   `±${Math.round(accuracy)}m`
        // );

        // Reverse geocode via OpenStreetMap
        const reverseRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        );
        const reverseData = await reverseRes.json();

        // Get ISP / IP info
        const ipinfoRes = await fetch(
          `https://ipinfo.io/json?token=f69fce66bd0d29`
        );
        const ipinfoData = await ipinfoRes.json();

        setLocationInfo({
          address: reverseData.display_name || "Address not available",
          isp:
            ipinfoData.org ||
            ipinfoData.asn?.name ||
            ipinfoData.company?.name ||
            "Unknown ISP",
          source: "device",
        });

        // Store IP address
        setUserIP(ipinfoData.ip || "Unknown");
      } catch (error: unknown) {
        // console.warn(
        //   "⚠️ Device geolocation failed, falling back to IP-based lookup:",
        //   error instanceof Error ? error.message : String(error)
        // );
        try {
          // Fallback using IPinfo approximate data
          const ipinfoRes = await fetch(
            `https://ipinfo.io/json?token=f69fce66bd0d29`
          );
          const ipinfoData = await ipinfoRes.json();

          setLocationInfo({
            address: `${ipinfoData.city}, ${ipinfoData.region}, ${ipinfoData.country}`,
            isp:
              ipinfoData.org ||
              ipinfoData.asn?.name ||
              ipinfoData.company?.name ||
              "Unknown ISP",
            source: "ipinfo",
          });

          // Store IP address
          setUserIP(ipinfoData.ip || "Unknown");
        } catch (fallbackError) {
          // console.error("Failed to get location info:", fallbackError);
          setLocationInfo({
            address: "Unknown",
            isp: "Unknown",
            source: "none",
          });
        }
      }
    };

    fetchLocationAndISP();
  }, []);

  // Smooth progress animation for all tests
  useEffect(() => {
    // Progress is now driven by actual test progress from the engine
    // No need for artificial smooth animation
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Notify parent when test running state changes
  useEffect(() => {
    if (onTestRunningChange) {
      onTestRunningChange(isRunning || isInitializing);
    }
  }, [isRunning, isInitializing, onTestRunningChange]);

  // Prevent page refresh during test - WARNING: Do NOT use window.history.pushState as it causes SecurityError in Firefox/Safari
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning || isInitializing) {
        e.preventDefault();
        e.returnValue = t(
          "Test in progress. Results will be lost if you leave this page."
        );
        return e.returnValue;
      }
    };

    // Only add beforeunload listener - no history manipulation to avoid SecurityError
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRunning, isInitializing, t]);

  // Use internal test ID or prop test ID
  const displayTestId = testId || internalTestId || "Generating...";

  // Copy to clipboard function

  const getTestTitle = () => {
    const typeKey = displayScenarioId || defaultScenarioId;
    let typeTitle = "";
    switch (typeKey) {
      case ENV_CONFIG.SCENARIOS.QUICK_TEST_ID:
        typeTitle = t("Speed Test");
        break;
      case ENV_CONFIG.SCENARIOS.FULL_TEST_ID:
        typeTitle = t("Video & Browser Test");
        break;
      case ENV_CONFIG.SCENARIOS.CONTINUOUS_TEST_ID:
        typeTitle = t("Continuous Test");
        break;
      default:
        typeTitle = t("Speed Test");
    }

    if (isRunning) return `${typeTitle}: ${t("On Going")}`;
    if (results) return `${typeTitle} ${t("Results")}`;
    return typeTitle;
  };

  const initializeSystem = async (scenarioIdOverride?: number) => {
    setIsInitializing(true);

    try {
      // Determine which ID to use: Override -> State -> Default
      // This fixes the issue where the button click didn't update fast enough
      const targetScenarioId = scenarioIdOverride ?? selectedScenarioId;

      const isContinuousTest =
        masterId !== undefined && masterUuid !== undefined;
      let engine: SpeedTestEngine;

      if (isContinuousTest && testEngineRef.current) {
        engine = testEngineRef.current;
      } else {
        if (isContinuousTest) {
          engine = new SpeedTestEngine(baseUrl, masterId, masterUuid);
        } else {
          engine = new SpeedTestEngine(baseUrl);
        }
        testEngineRef.current = engine;
        setTestEngine(engine);
      }

      await engine.getAPIClient().authenticate();

      const scenarios = await engine.getAvailableScenarios();
      setAvailableScenarios(scenarios);

      // IMPORTANT: Load the scenario based on the TARGET ID, not the old props
      const loadScenario =
        scenarios.find((s) => s.id === targetScenarioId) || scenarios[0];

      if (loadScenario) {
        engine.setSelectedScenario(loadScenario);
      }

      const geoipRes = await engine
        .getAPIClient()
        .getGeoIP()
        .catch(() => null);

      const gpsResult = await GeolocationService.getLocation({
        enableHighAccuracy: true,
        timeout: GEO_CONFIG.OPTIONS.timeout,
        maximumAge: GEO_CONFIG.OPTIONS.maximumAge,
      });

      const operatorName =
        geoipRes?.meta.code === 200 ? geoipRes.content.data.isp : undefined;
      const geoipLocation =
        geoipRes?.meta.code === 200
          ? {
              latitude: geoipRes.content.data.latitude,
              longitude: geoipRes.content.data.longitude,
            }
          : undefined;

      const standardizedLocation = GeolocationService.getStandardizedLocation(
        gpsResult.location,
        geoipLocation
      );

      const geolocation = {
        latitude: standardizedLocation.latitude,
        longitude: standardizedLocation.longitude,
        accuracy: standardizedLocation.accuracy,
      };

      const environment: EnvironmentInfo = {
        geolocation,
        isp: geoipRes?.content?.data || null,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection || null,
        timestamp: Date.now(),
      };

      const bestServer =
        engine.getSelectedServer() ||
        (await engine
          .selectOptimalServer(geolocation, environment)
          .then(() => engine.getSelectedServer()));

      setGeoipResponse(geoipRes);

      const systemInfo: SystemInfo = {
        isAuthenticated: true,
        bestServer: bestServer || undefined,
      };

      if (geoipRes && geoipRes.meta.code === 200) {
        const geoData = geoipRes.content.data;
        systemInfo.userIP = geoipRes.content.ip;
        systemInfo.ispName = geoData.isp;
        systemInfo.location =
          geoData.city && geoData.country_name
            ? `${geoData.city}, ${geoData.country_name}`
            : geoData.country_name || "Unknown";
      }

      setSystemInfo(systemInfo);
      setIsInitializing(false);

      return { testEngine: engine, systemInfo };
    } catch (error) {
      setError(
        `Initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsInitializing(false);
      return null;
    }
  };

  const handleStartTest = useCallback(
    async (engine: SpeedTestEngine, sysInfo: SystemInfo) => {
      // console.log(
      //   "🔵 INSIDE HANDLE START TEST",
      //   engine,
      //   sysInfo,
      //   selectedScenarioId
      // );
      // console.log("🔵 isTestRunningRef.current:", isTestRunningRef.current);

      // Prevent duplicate test runs - using ref for immediate synchronous check
      if (isTestRunningRef.current) {
        // console.log(
        //   "⚠️ Test already running, ignoring duplicate start request"
        // );
        return;
      }

      if (!engine || !sysInfo.isAuthenticated) {
        setError(
          "System not ready. Please wait for initialization to complete."
        );
        return;
      }

      let pollInterval: NodeJS.Timeout | undefined;

      try {
        // console.log(
        //   "🔒 LOCKING test execution - setting isTestRunningRef to true"
        // );
        isTestRunningRef.current = true; // Set ref immediately for sync check
        setIsRunning(true);
        setError(null);
        setResults(null);
        setCurrentStep("Starting test...");
        setStepProgress(0);
        // Reset individual test progress
        setProgressByTest({
          latency: 0,
          download: 0,
          upload: 0,
          web: 0,
          streaming: 0,
        });
        // Reset live results when starting new test
        setLiveResults({
          latency: 0,
          download: 0,
          upload: 0,
          web: 0,
          streaming: 0,
        });
        setWebTestResults([]); // Reset web test accumulator

        // console.log("=== STARTING SPEED TEST (USING INITIALIZED SYSTEM) ===");
        // console.log(
        //   "Using pre-authenticated engine with",
        //   availableScenarios.length,
        //   "scenarios"
        // );
        // console.log("Selected scenario ID:", selectedScenarioId);
        // console.log("Best server:", sysInfo.bestServer);

        // Clear test ID - will be set from backend response
        setInternalTestId("Generating...");

        // Start polling for intermediate results from engine
        pollInterval = setInterval(() => {
          if (engine.intermediateResults) {
            const newLatency = engine.intermediateResults.latency;
            const oldLatency = liveResults.latency;

            // Debug: Log when latency changes
            if (
              currentStep === "latency" &&
              newLatency !== undefined &&
              newLatency !== oldLatency
            ) {
              // console.log(
              //   `🟢 TestModal: Latency updated from ${oldLatency?.toFixed(
              //     2
              //   )} to ${newLatency?.toFixed(2)}`
              // );
            }

            setLiveResults((prev) => {
              const newResults = {
                ...prev,
                latency:
                  newLatency !== undefined ? newLatency : prev.latency || 0,
                download:
                  engine.intermediateResults.download !== undefined
                    ? engine.intermediateResults.download
                    : prev.download || 0,
                upload:
                  engine.intermediateResults.upload !== undefined
                    ? engine.intermediateResults.upload
                    : prev.upload || 0,
                web:
                  engine.intermediateResults.web !== undefined
                    ? engine.intermediateResults.web
                    : prev.web || 0,
                streaming:
                  engine.intermediateResults.streaming !== undefined
                    ? engine.intermediateResults.streaming
                    : prev.streaming || 0,
              };

              return newResults;
            });
          }
        }, 100); // Poll every 100ms for live updates

        // Create environment object with existing GeoIP data to avoid duplicate API calls
        const environment: EnvironmentInfo = {
          userAgent: navigator.userAgent,
          connection:
            (
              navigator as typeof navigator & {
                connection?: NetworkInformation;
              }
            ).connection || null,
          geolocation: null, // Will be fetched by GPS in result submitter if needed
          isp: geoipResponse?.content.data || null, // Use existing GeoIP data
          timestamp: Date.now(),
        };

        // console.log(
        //   "Using existing GeoIP data for test environment:",
        //   environment.isp ? "Available" : "Not available"
        // );

        // Check if this is continuous test mode
        const isContinuousTest =
          masterId !== undefined && masterUuid !== undefined;
        // console.log("🔍 Is Continuous Test Mode?", isContinuousTest);
        // console.log("🔍 Master ID:", masterId, "| Master UUID:", masterUuid);

        const testResults = await engine.runCompleteTest(
          selectedScenarioId,
          (step: string, progress: number) => {
            setCurrentStep(step);

            // Update individual test progress
            const testKey = step.startsWith("web")
              ? "web"
              : (step as keyof typeof progressByTest);
            if (testKey in progressByTest) {
              setProgressByTest((prev) => ({
                ...prev,
                [testKey]: Math.max(
                  prev[testKey as keyof typeof progressByTest],
                  progress
                ),
              }));
            }

            // Keep legacy stepProgress for backward compatibility
            setStepProgress((prev) => Math.max(prev, progress));

            // Update live results during the test based on progress
            // This shows real-time intermediate values while tests are running
            if (step === "download" || step === "upload") {
              // For download/upload, we can estimate speed based on progress and time
              // Get the test engine's current speed if available
              const engineResults = (engine as any)._lastResults;
              if (engineResults) {
                if (step === "download" && engineResults.download?.speed) {
                  setLiveResults((prev) => ({
                    ...prev,
                    download: engineResults.download.speed,
                  }));
                } else if (step === "upload" && engineResults.upload?.speed) {
                  setLiveResults((prev) => ({
                    ...prev,
                    upload: engineResults.upload.speed,
                  }));
                }
              }
            }
          },
          (step: string, stepResults: any) => {
            // console.log(`${step} completed:`, stepResults);

            // Mark individual test as 100% complete
            const testKey = step.startsWith("web")
              ? "web"
              : (step as keyof typeof progressByTest);
            if (testKey in progressByTest) {
              setProgressByTest((prev) => ({
                ...prev,
                [testKey]: 100,
              }));
            }

            // Update liveResults as each test completes
            if (step === "latency") {
              // Latency returns { average, packetLoss, jitter }
              const latencyValue =
                stepResults?.average || stepResults?.latency || 0;
              // console.log("✅ Latency completed - full result:", stepResults);
              // console.log("✅ Setting latency value to:", latencyValue);
              setLiveResults((prev) => {
                const newResults = { ...prev, latency: latencyValue };
                // console.log("✅ Updated liveResults:", newResults);
                return newResults;
              });
            } else if (
              step === "download" &&
              stepResults?.speed !== undefined
            ) {
              // console.log("✅ Download completed:", stepResults.speed, "Mbps");
              setLiveResults((prev) => ({
                ...prev,
                download: stepResults.speed,
              }));
            } else if (step === "upload" && stepResults?.speed !== undefined) {
              // console.log("✅ Upload completed:", stepResults.speed, "Mbps");
              setLiveResults((prev) => ({
                ...prev,
                upload: stepResults.speed,
              }));
            } else if (step === "web" || step.startsWith("web")) {
              // Web test returns { browsingDelay, duration, ... }
              const webValue =
                stepResults?.browsingDelay ||
                stepResults?.duration ||
                stepResults?.loadTime ||
                stepResults?.total ||
                0;
              // console.log(
              //   "✅ Web test completed:",
              //   step,
              //   "value:",
              //   webValue,
              //   "ms"
              // );

              // Add to web test results array and calculate average
              setWebTestResults((prev) => {
                const newResults = [...prev, webValue];
                const average =
                  newResults.reduce((sum, val) => sum + val, 0) /
                  newResults.length;
                // console.log(
                //   "✅ Web tests so far:",
                //   newResults.length,
                //   "Average:",
                //   average.toFixed(0),
                //   "ms"
                // );
                setLiveResults((prevLive) => ({ ...prevLive, web: average }));
                return newResults;
              });
            } else if (step === "streaming") {
              const streamingValue =
                stepResults?.totalDelay || stepResults?.totalDuration || 0;
              // console.log(
              //   "✅ Streaming completed - value:",
              //   streamingValue,
              //   "ms"
              // );
              setLiveResults((prev) => ({
                ...prev,
                streaming: streamingValue,
              }));
            }
          },
          environment, // Pass existing environment data
          isContinuousTest // Pass continuous test flag
        );
        // console.log("testResults:", testResults);

        // Extract cycle ID from results
        const cycleId = (testResults as any).cycleId;
        // console.log("🔍 Checking for cycleId in testResults...");
        // console.log("   - testResults.cycleId:", cycleId);
        // console.log("   - Type:", typeof cycleId);

        if (cycleId) {
          // console.log("✅ Received Cycle ID from backend:", cycleId);
          setInternalTestId(cycleId);
        } else {
          // console.warn("⚠️ No Cycle ID received from backend");
          // console.warn("⚠️ Full testResults:", testResults);
          setInternalTestId("N/A");
        }

        setResults(testResults);
        setCurrentStep("Complete");
        setStepProgress(100);

        // Clear the polling interval
        clearInterval(pollInterval);

        // Call onTestComplete callback if provided (for continuous testing)
        // BUT only if test was NOT cancelled
        if (onTestComplete && cycleId && !testWasCancelledRef.current) {
          // console.log("✅ Calling onTestComplete with cycleId:", cycleId);
          onTestComplete(cycleId);
        } else if (testWasCancelledRef.current) {
          // console.log("⚠️ Test was cancelled - skipping cycle API call");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Test failed";
        setError(errorMessage);
        // console.error("Test error:", error);
        // Clear the polling interval on error too
        if (typeof pollInterval !== "undefined") {
          clearInterval(pollInterval);
        }
      } finally {
        setIsRunning(false);
        isTestRunningRef.current = false; // Reset ref when test completes
      }
    },
    [selectedScenarioId, availableScenarios.length, geoipResponse]
  );

  const handleStopTest = useCallback(() => {
    if (testEngine) {
      testEngine.stopTest();
      setIsRunning(false);
      isTestRunningRef.current = false; // Reset ref when stopping test
      setCurrentStep("Stopped");
      testEngineRef.current = null; // Clear ref
      setTestEngine(null);
    }
  }, [testEngine]);

  const handleStopTestWithConfirmation = useCallback(() => {
    // Block stopping test - show popup instead
    if (isTestRunningRef.current) {
      setShowBlockerPopup(true);
      return;
    }

    // Clear Master ID cache when cancelling continuous test
    if (
      testEngine &&
      selectedScenarioId === ENV_CONFIG.SCENARIOS.CONTINUOUS_TEST_ID
    ) {
      // console.log("🧹 Continuous test cancelled - clearing Master ID cache");
      testEngine.clearMasterIdCache();
    }

    // Only allow stopping if test is not running
    handleStopTest();
    if (onCancelTest) {
      testWasCancelledRef.current = true; // Mark as cancelled
      onCancelTest();
    }
  }, [handleStopTest, onCancelTest, testEngine, selectedScenarioId]);

  const handleReset = useCallback(
    async (newScenarioId?: number) => {
      // Determine the scenario ID to RUN:
      // - If caller passed a newScenarioId (e.g. Suggest button), use it.
      // - If results exist (i.e. user clicked "Test Again"), re-run the same test that was displayed.
      // - Otherwise (first-time run) use the currently selectedScenarioId.
      let scenarioToRun: number | undefined = undefined;

      if (typeof newScenarioId === "number") {
        scenarioToRun = newScenarioId;
      } else if (results) {
        // Re-run the SAME displayed scenario
        scenarioToRun = displayScenarioId ?? selectedScenarioId;
      } else {
        // First run or fallback
        scenarioToRun = selectedScenarioId;
      }

      // Defensive fallback:
      if (!scenarioToRun) {
        scenarioToRun = defaultScenarioId ?? ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID;
      }

      // If parent wants to handle "test again/suggest", notify parent and return.
      // Parent can call loadSpeedTest(scenarioId) / reopen modal / etc.
      if (onTestAgain) {
        try {
          onTestAgain(scenarioToRun);
          return; // parent will handle re-running; stop internal re-init
        } catch (e) {
          // If parent handler throws or doesn't re-open modal, proceed with internal restart
          // (this keeps behavior robust if parent doesn't implement handler properly)
          // console.warn("onTestAgain handler failed, falling back to internal restart", e);
        }
      }

      // Update the DISPLAY scenario (so progress UI shows correct steps)
      setDisplayScenarioId(scenarioToRun);

      // Update the ID that determines what the engine RUNS
      setSelectedScenarioId(scenarioToRun);

      // Reset all UI/test state
      setResults(null);
      setError(null);
      setCurrentStep("");
      setStepProgress(0);
      setLiveResults({
        latency: 0,
        download: 0,
        upload: 0,
        web: 0,
        streaming: 0,
      });
      setWebTestResults([]);
      savedResultTimestampRef.current = null;
      hasInitializedRef.current = false;

      // Reinitialize & restart the test using the SCENARIO TO RUN
      try {
        const result = await initializeSystem(scenarioToRun); // Pass the ID to run
        if (result) {
          // slight delay to allow UI to settle before starting
          setTimeout(() => {
            handleStartTest(result.testEngine, result.systemInfo);
          }, 500);
        }
      } catch (error) {
        setError("Failed to restart test. Please try again.");
      }
    },
    [
      initializeSystem,
      handleStartTest,
      selectedScenarioId,
      results,
      defaultScenarioId,
      onTestAgain,
      displayScenarioId,
    ]
  );

  // Single useEffect for initialization and test start
  useEffect(() => {
    // Prevent multiple initializations using ref
    if (hasInitializedRef.current) {
      // console.log(
      //   "⚠️ Already initialized, skipping duplicate useEffect call..."
      // );
      return;
    }

    // console.log("🔵 useEffect triggered - Initializing system...");

    const initialize = async () => {
      try {
        // Check again before starting async work (race condition prevention)
        if (hasInitializedRef.current) {
          // console.log(
          //   "⚠️ Race condition detected - another initialization already in progress"
          // );
          return;
        }

        hasInitializedRef.current = true; // Mark as initialized immediately
        // console.log("🔒 LOCKED initialization - hasInitializedRef set to true");

        const result = await initializeSystem();
        if (result) {
          // Only start test if we still have the initialized flag (not reset by another call)
          if (hasInitializedRef.current) {
            setTimeout(() => {
              handleStartTest(result.testEngine, result.systemInfo);
            }, 500);
          } else {
            // console.warn("⚠️ Initialization flag was reset, not starting test");
          }
        }
      } catch (error) {
        // console.error("Initialization failed:", error);
        hasInitializedRef.current = false; // Reset on error so user can retry
      }
    };

    initialize();

    // Cleanup function to prevent duplicate calls
    return () => {
      // console.log(
      //   "🧹 useEffect cleanup called - NOT resetting hasInitializedRef"
      // );
      // Don't reset hasInitializedRef here because we want it to persist
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save results to localStorage ONLY when results are displayed (result page shown)
  useEffect(() => {
    if (!results || !results.timestamp) return;

    // If we already saved this exact result, skip (MUST check before anything else)
    if (
      results.timestamp &&
      savedResultTimestampRef.current === results.timestamp
    ) {
      // console.log(
      //   "✓ SKIPPING: This result was already processed for save:",
      //   results.timestamp
      // );
      return;
    }

    // Mark this result as "being saved" IMMEDIATELY to prevent duplicate useEffect calls
    // console.log(
    //   "🔒 LOCKING timestamp to prevent duplicate saves:",
    //   results.timestamp
    // );
    savedResultTimestampRef.current = results.timestamp;

    // console.log(
    //   "📋 Result page displayed, preparing to save after 3 seconds..."
    // );
    // console.log("📊 Full results object:", results);
    // console.log("📊 Results.latency structure:", results.latency);
    // console.log("📊 Results.latency type:", typeof results.latency);

    // Extract latency value - handle both object and number formats
    let latencyValue = null;
    if (results.latency) {
      if (typeof results.latency === "object" && results.latency !== null) {
        // If it's an object, get the average property
        latencyValue = results.latency.average || 0;
      } else if (typeof results.latency === "number") {
        // If it's already a number, use it directly
        latencyValue = results.latency;
      }
    }
    // console.log("📊 Extracted latency value:", latencyValue);

    // console.log("📊 Other result data:", {
    //   download: results.download?.speed,
    //   upload: results.upload?.speed,
    //   web: results.web,
    //   webKeys: Object.keys(results).filter((k) => k.startsWith("web")),
    // });

    // Calculate web browsing delay (same logic as display)
    let webBrowsingDelay = null;
    if (results.web) {
      webBrowsingDelay =
        (results.web.browsingDelay || results.web.duration || 0) / 1000;
    } else {
      // Check for web1, web2, web3, etc.
      const webResults = Object.keys(results)
        .filter((key) => key.startsWith("web") && key !== "web")
        .map((key) => (results as any)[key]);

      if (webResults.length > 0) {
        const totalDelay = webResults.reduce((sum: number, result: any) => {
          return sum + (result?.browsingDelay || result?.duration || 0);
        }, 0);
        webBrowsingDelay = totalDelay / webResults.length / 1000;
      }
    }

    const testTypeLabel =
      selectedScenarioId === ENV_CONFIG.SCENARIOS.QUICK_TEST_ID
        ? "Quick Test"
        : selectedScenarioId === ENV_CONFIG.SCENARIOS.FULL_TEST_ID
        ? "Full Test"
        : selectedScenarioId === ENV_CONFIG.SCENARIOS.CONTINUOUS_TEST_ID
        ? "Continuous Test"
        : "Speed Test";

    // Use cycle ID from backend instead of generating random ID
    const cycleId = (results as any).cycleId || internalTestId || "N/A";

    // Save Master ID only for Continuous Test (when masterId prop is present)
    const isContinuousTest = masterId !== undefined;

    const storedResult: StoredTestResult = {
      testId: cycleId,
      masterId:
        isContinuousTest && results.masterId
          ? String(results.masterId)
          : undefined,
      masterUuid: isContinuousTest ? results.masterUuid : undefined,
      dateTime: new Date(results.timestamp).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      networkType: results.environment?.connection?.effectiveType || "Unknown",
      testType: testTypeLabel,
      latency: latencyValue,
      download: results.download?.speed || null,
      upload: results.upload?.speed || null,
      webBrowsing: webBrowsingDelay,
      videoStreaming: results.streaming?.totalDelay
        ? results.streaming.totalDelay / 1000
        : null,
    };

    // console.log("💾 Prepared result for saving:", storedResult);
    // console.log("💾 Is Continuous Test:", isContinuousTest);
    // console.log(
    //   "💾 Master ID:",
    //   storedResult.masterId,
    //   isContinuousTest ? "(included)" : "(excluded for Quick/Full test)"
    // );
    // console.log(
    //   "💾 Master UUID:",
    //   storedResult.masterUuid,
    //   isContinuousTest ? "(included)" : "(excluded for Quick/Full test)"
    // );
    // console.log("💾 Latency value being saved:", storedResult.latency);

    // Save to localStorage (has 3 second delay built in)
    saveTestResultToStorage(storedResult);
  }, [results, selectedScenarioId]);

  interface TestItem {
    label: string;
    value: string;
    unit: string;
    status: "completed" | "in-progress" | "pending";
    progress?: number;
  }

  const progressListTests: TestItem[] = activeTestSteps.map((step) => {
    const key = step.key as keyof typeof progressByTest;
    const progress = progressByTest[key];
    const liveValue = liveResults[key] || 0;

    // Determine status based on progress and currentStep
    let status: TestItem["status"] = "pending";
    // The key check for 'web' needs to handle web1, web2, etc., which currentStep does.
    const isStepInProgress =
      key === currentStep || (key === "web" && currentStep.startsWith("web"));

    if (progress >= 100) {
      status = "completed";
    } else if (isStepInProgress) {
      status = "in-progress";
    }

    // Set units for display
    let unit = "";
    let formattedValue: string | number = "-";

    if (key === "latency") {
      unit = "ms";
      // Show average latency (often small whole numbers)
      formattedValue = liveValue > 0 ? liveValue.toFixed(0) : "-";
    } else if (key === "download" || key === "upload") {
      unit = "Mbps";
      // Show speed with one decimal place
      formattedValue = liveValue > 0 ? liveValue.toFixed(1) : "-";
    } else if (key === "web" || key === "streaming") {
      unit = "Second";
      // Show delay with no decimal places
      formattedValue = liveValue > 0 ? liveValue.toFixed(0) : "-";
    }

    return {
      label: step.label,
      value: formattedValue,
      unit: unit,
      status: status,
      progress: progress,
    };
  });

  const activeActionsList: TestItem[] = [];
  // console.log("🔍 DEBUG - Building activeActionsList:", {
  //   currentScenarioId,
  //   availableScenariosCount: availableScenarios.length,
  // });
  // console.log(
  //   "🔍 DEBUG - Available scenario IDs:",
  //   availableScenarios.map((s) => ({ id: s.id, name: s.name }))
  // );
  if (availableScenarios.length > 0) {
    // Try to find matching scenario by ID, fallback to first scenario if not found
    const matchedScenario =
      (selectedScenarioId
        ? availableScenarios.find((s) => s.id === selectedScenarioId)
        : null) || availableScenarios[0];

    // console.log(
    //   "🔍 DEBUG - Matched scenario:",
    //   matchedScenario
    //     ? { id: matchedScenario.id, name: matchedScenario.name }
    //     : "NONE - Empty scenarios!"
    // );
    if (matchedScenario) {
      // Track which action types exist in the scenario
      const actionTypes = new Set(matchedScenario.actions.map((a) => a.type));

      // Build list in desired display order: LATENCY → DOWNLOAD → UPLOAD → WEB → STREAMING
      const displayOrder: Array<
        "LATENCY" | "DOWNLOAD" | "UPLOAD_GENERATED" | "WEB" | "STREAMING"
      > = ["LATENCY", "DOWNLOAD", "UPLOAD_GENERATED", "WEB", "STREAMING"];

      displayOrder.forEach((actionType) => {
        if (!actionTypes.has(actionType)) return;

        switch (actionType) {
          case "LATENCY":
            activeActionsList.push({
              label: t("Latency"),
              value: liveResults.latency ? liveResults.latency.toFixed(2) : "-",
              unit: "ms",
              status:
                currentStep === "latency"
                  ? "in-progress"
                  : liveResults.latency && liveResults.latency > 0
                  ? "completed"
                  : "pending",
              progress:
                currentStep === "latency"
                  ? progressByTest.latency
                  : liveResults.latency && liveResults.latency > 0
                  ? 100
                  : undefined,
            });
            break;
          case "DOWNLOAD":
            activeActionsList.push({
              label: t("Download"),
              value: liveResults.download
                ? liveResults.download.toFixed(2)
                : "-",
              unit: "Mbps",
              status:
                currentStep === "download"
                  ? "in-progress"
                  : liveResults.download && liveResults.download > 0
                  ? "completed"
                  : "pending",
              progress:
                currentStep === "download"
                  ? progressByTest.download
                  : liveResults.download && liveResults.download > 0
                  ? 100
                  : undefined,
            });
            break;
          case "UPLOAD_GENERATED":
            activeActionsList.push({
              label: t("Upload"),
              value: liveResults.upload ? liveResults.upload.toFixed(2) : "-",
              unit: "Mbps",
              status:
                currentStep === "upload"
                  ? "in-progress"
                  : liveResults.upload && liveResults.upload > 0
                  ? "completed"
                  : "pending",
              progress:
                currentStep === "upload"
                  ? progressByTest.upload
                  : liveResults.upload && liveResults.upload > 0
                  ? 100
                  : undefined,
            });
            break;
          case "WEB":
            activeActionsList.push({
              label: t("Web Page Load Time"),
              value: liveResults.web ? liveResults.web.toFixed(3) : "0.000",
              unit: "Second",
              status:
                currentStep === "web" || currentStep?.startsWith("web")
                  ? "in-progress"
                  : liveResults.web && liveResults.web > 0
                  ? "completed"
                  : "pending",
              progress:
                currentStep === "web" || currentStep?.startsWith("web")
                  ? progressByTest.web
                  : liveResults.web && liveResults.web > 0
                  ? 100
                  : undefined,
            });
            break;
          case "STREAMING":
            activeActionsList.push({
              label: t("Video Streaming"),
              value: liveResults.streaming
                ? liveResults.streaming.toFixed(3)
                : "0.000",
              unit: "Second",
              status:
                currentStep === "streaming"
                  ? "in-progress"
                  : liveResults.streaming && liveResults.streaming > 0
                  ? "completed"
                  : "pending",
              progress:
                currentStep === "streaming"
                  ? progressByTest.streaming
                  : liveResults.streaming && liveResults.streaming > 0
                  ? 100
                  : undefined,
            });
            break;
        }
      });
    }
  }

  // console.log(
  //   "🔍 DEBUG - Final activeActionsList count:",
  //   activeActionsList.length,
  //   activeActionsList
  // );
  const getOppositeScenarioId = () => {
    const currentId = displayScenarioId ?? selectedScenarioId;

    // FULL → QUICK, QUICK → FULL
    if (currentId === ENV_CONFIG.SCENARIOS.FULL_TEST_ID) {
      return ENV_CONFIG.SCENARIOS.QUICK_TEST_ID;
    }
    if (currentId === ENV_CONFIG.SCENARIOS.QUICK_TEST_ID) {
      return ENV_CONFIG.SCENARIOS.FULL_TEST_ID;
    }

    // Default: assume Quick → Full
    return ENV_CONFIG.SCENARIOS.FULL_TEST_ID;
  };
  const handleSuggest = useCallback(() => {
    const oppositeId = getOppositeScenarioId();

    // Close current modal first to force unmount
    try {
      onClose?.();
    } catch (e) {
      // ignore
    }

    // After unmount, trigger parent to start the opposite test
    setTimeout(() => {
      if (onTestAgain) {
        onTestAgain(oppositeId);
      } else {
        handleReset(oppositeId);
      }
    }, 200); // give React time to unmount before reopen
  }, [getOppositeScenarioId, onClose, onTestAgain, handleReset]);

  const currentDisplay = displayScenarioId ?? selectedScenarioId;

  const gotoHomepage = () => {
    setCurrentScenarioId?.(undefined);
  };
  return (
    <div className="w-full">
      <div className="w-full">
        <div className="">
          {/* Close button */}

          {/* Modal content */}
          <div className="flex flex-col items-center w-full max-sm:mb-[3rem] mb-[3rem]">
            {/* Header with Loader */}
            <div className="flex flex-col w-full text-center relative">
              {/* Close button aligned right */}
              <div className="hidden lg:block">
                {!results && isRunning && (
                  <button
                    onClick={
                      results && !isRunning
                        ? onExportResults
                        : handleStopTestWithConfirmation
                    }
                    className="absolute w-[12rem] justify-center text-[0.9rem] gap-2 px-6 font-semibold flex border border-darkYellow right-2 top-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                    aria-label={
                      results && !isRunning ? "Export Result" : "Stop Test"
                    }
                  >
                    {results && !isRunning
                      ? t("Export Result")
                      : t("Stop Test")}
                    {results && !isRunning ? (
                      <Download color="white" size={20} />
                    ) : (
                      <X color="white" size={20} />
                    )}
                  </button>
                )}
                {results && (
                  <>
                    {onTestAgain && (!masterId || isLastTest) && (
                      <button
                        onClick={() => {
                          handleReset();
                        }}
                        className="absolute w-[12rem] justify-center text-[0.9rem] gap-2 px-6 font-semibold flex border border-white right-2 top-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                      >
                        {t("Test Again")}

                        <RotateCw size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleSuggest();
                      }}
                      className="absolute w-[12rem] justify-center text-[0.9rem] gap-2 px-6 font-semibold flex border border-darkYellow right-2 top-20 dark:hover:text-gray-300 transition-colors p-2 dark:hover:bg-gray-800 rounded-full"
                    >
                      {currentDisplay === ENV_CONFIG.SCENARIOS.FULL_TEST_ID
                        ? t("Run a Speed Test")
                        : t("Run a Video & Browser Test")}
                    </button>
                    <button
                      onClick={gotoHomepage}
                      className="absolute w-[12rem] justify-center text-[0.9rem] gap-2 px-6 font-semibold flex border border-white right-2 top-40 dark:hover:text-gray-300 transition-colors p-2 dark:hover:bg-gray-800 rounded-full"
                    >
                      {t("Go to Home")}
                    </button>
                  </>
                )}
              </div>

              {/* Title + Info icon */}
              <div className="flex justify-center mb-[2rem] max-sm:mt-[3rem] max-sm:mb-[1rem] block max-sm:hidden">
                <Image
                  src={speedCheckLogo}
                  alt="MySpeed"
                  className="w-[200px] max-sm:hidden"
                  priority
                />
              </div>
              <h2 className="text-[1.4rem] font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2 max-sm:mb-[1rem] max-sm:mt-[3rem]">
                {getTestTitle().split(":")[0]}

                <Tooltip
                  title={t(
                    currentDisplay === ENV_CONFIG.SCENARIOS.FULL_TEST_ID
                      ? "The speed test checks your download speed, upload speed, latency, packet loss, and jitter. These numbers help you understand how fast and stable your internet connection is."
                      : "Download speed tells you how fast you receive data (videos, websites, apps). Upload speed tells you how fast you send data (photos, emails, video calls). Both are important for smooth internet use."
                  )}
                >
                  <Info />
                </Tooltip>
              </h2>

              {/* Status line */}
              {isRunning || isInitializing || results ? (
                <div className="flex items-center justify-center gap-2 mt-2">
                  {(isInitializing || isRunning) && (
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  )}
                  <span
                    className={`text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300`}
                  >
                    {isInitializing && t("Initializing")}
                    {isRunning && !isInitializing && t("Test in-progress")}
                    {results && !isRunning && !isInitializing && t("")}
                  </span>
                </div>
              ) : (
                <>
                  <div className="h-[375px]">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-[360px] w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Progress Section - 50:50 split */}
            {(isRunning || isInitializing) && (
              <div className="w-full">
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                    currentDisplay === ENV_CONFIG.SCENARIOS.FULL_TEST_ID
                      ? `items-center gap-[5rem] ${!isInitializing && "mt-12"}`
                      : ""
                  }`}
                >
                  {/* Left: Live Speedometer for active test OR iframe for web/video - 50% */}
                  <div className="w-full flex items-center justify-center">
                    {/* Show Latency Speedometer */}
                    {currentStep === "latency" && (
                      <SpeedGauge
                        currentSpeed={liveResults.latency || 0}
                        maxSpeed={50}
                        label={t("Latency & Jitter")}
                        description={t("Network response time")}
                      />
                    )}

                    {/* Show Download Speedometer */}
                    {currentStep === "download" && (
                      <SpeedGauge
                        currentSpeed={liveResults.download || 0}
                        maxSpeed={400}
                        label={t("Download Speed")}
                        description={t("Data receiving rate")}
                      />
                    )}

                    {/* Show Upload Speedometer */}
                    {currentStep === "upload" && (
                      <SpeedGauge
                        currentSpeed={liveResults.upload || 0}
                        maxSpeed={400}
                        label={t("Upload Speed")}
                        description={t("Data sending rate")}
                      />
                    )}

                    {/* Show Web Test iframe */}
                    {(currentStep === "web" ||
                      currentStep?.startsWith("web")) && (
                      <div className="w-full bg-gray-50 bg-gray-800 rounded-lg overflow-hidden relative aspect-video min-h-[288px] mx-[2rem] max-sm:mx-4">
                        <div
                          id="web-test-container"
                          className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"
                        >
                          <div className="text-center text-gray-500 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                            <p className="text-sm font-medium">
                              {t("Loading web page...")}
                            </p>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/80 to-transparent p-4">
                          <div className="text-white">
                            <p className="text-sm font-semibold mb-2">
                              Web Browsing Test
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-white rounded-full transition-all duration-300"
                                  style={{ width: `${stepProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show Streaming Test iframe */}
                    {currentStep === "streaming" && (
                      <div className="w-full bg-gray-900 bg-gray-950 rounded-lg overflow-hidden relative aspect-video min-h-[288px] mx-0 max-sm:mx-4">
                        <div
                          id="streaming-test-container"
                          className="w-full h-full bg-gray-900 dark:bg-gray-950 flex items-center justify-center"
                        >
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
                            <p className="text-sm font-medium">
                              Loading video stream...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Initializing placeholder */}
                    {isInitializing && (
                      <div className="flex justify-center items-center h-[360px]"></div>
                    )}
                  </div>

                  {/* Right: Test Progress Cards - 50% */}
                  <div className="w-full flex flex-col-reverse">
                    {/* Test Progress List */}
                    {isRunning && (
                      <div className="progress-section mx-3">
                        <TestProgressList
                          tests={progressListTests} // <--- MUST use the filtered list here
                          currentStep={currentStep}
                        />
                      </div>
                    )}

                    {estimatedTime && (
                      <div className="mt-3 sm:mt-4 text-center">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                          Estimated Time Left in Test:{" "}
                          <strong className="font-semibold text-gray-900 dark:text-gray-100">
                            ~ {estimatedTime}
                          </strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Error Display */}
            {error && (
              <div className="w-full px-2 sm:px-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-red-700 text-xs sm:text-sm">{error}</p>
                </div>
              </div>
            )}
            {/* Completed results */}
            <RenderCompletedResults
              testResults={results}
              selectedScenarioId={displayScenarioId}
              displayTestId={displayTestId}
              masterId={masterId}
              dateTime={dateTime}
              locationInfo={locationInfo}
              userIP={userIP}
            />
            {/* Action buttons */}
          </div>
        </div>
      </div>

      <div className="block lg:hidden flex flex-col gap-4 mb-[2rem] mx-3">
        {/* Top two buttons in a row */}
        <div className="flex justify-between gap-2">
          {!results && isRunning && (
            <button
              onClick={
                results && !isRunning
                  ? onExportResults
                  : handleStopTestWithConfirmation
              }
              className="flex-1 justify-center text-[0.9rem] gap-2 px-4 font-semibold flex border border-darkYellow hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              aria-label={results && !isRunning ? "Export Result" : "Stop Test"}
            >
              {results && !isRunning ? t("Export Result") : t("Stop Test")}
              {results && !isRunning ? (
                <Download color="white" size={20} />
              ) : (
                <X color="white" size={20} />
              )}
            </button>
          )}

          {results && onTestAgain && (!masterId || isLastTest) && (
            <>
              <button
                onClick={() => {
                  handleReset();
                }}
                className="justify-center w-full text-[0.9rem] gap-2 px-4 font-semibold flex border border-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                {t("Test Again")}
                <RotateCw size={20} />
              </button>
              <button
                onClick={gotoHomepage}
                className="justify-center w-full text-[0.9rem] gap-2 px-4 font-semibold flex border border-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                {t("Go to Home")}
                <RotateCw size={20} />
              </button>
            </>
          )}
        </div>

        {/* Third button full width */}
        {results && (
          <button
            onClick={handleSuggest}
            className="justify-center w-full text-[0.9rem] gap-2 px-4 font-semibold flex border border-darkYellow dark:hover:text-gray-300 transition-colors p-2 dark:hover:bg-gray-800 rounded-full"
          >
            {currentDisplay === ENV_CONFIG.SCENARIOS.FULL_TEST_ID
              ? t("Run a Speed Test")
              : t("Run a Video & Browser Test")}
          </button>
        )}
      </div>

      {/* Test Blocker Popup */}
      <TestBlockerPopup
        isOpen={showBlockerPopup}
        onClose={() => setShowBlockerPopup(false)}
      />
    </div>
  );
};
