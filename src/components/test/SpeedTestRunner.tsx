"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { ProgressIndicator } from "./ProgressIndicator";
import { ResultsDisplay } from "./ResultsDisplay";
import { TestControls } from "./TestControls";
import { ComplianceChecker } from "./ComplianceChecker";

interface SpeedTestRunnerProps {
  baseUrl: string;
  defaultScenarioId?: number;
  currentScenarioId?: number;
}

interface SystemInfo {
  userIP?: string;
  ispName?: string;
  location?: string;
  isAuthenticated: boolean;
  bestServer?: Server;
}

export function SpeedTestRunner({
  baseUrl,
  defaultScenarioId = ENV_CONFIG.DEV.DEFAULT_SCENARIO_ID,
  currentScenarioId,
}: SpeedTestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [stepProgress, setStepProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableScenarios, setAvailableScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState(defaultScenarioId);
  const [isCompliant, setIsCompliant] = useState(false);
  const [showCompliance, setShowCompliance] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    isAuthenticated: false,
  });
  const [geoipResponse, setGeoipResponse] = useState<any>(null);

  const [testEngine, setTestEngine] = useState<SpeedTestEngine | null>(null);
  const previousStepRef = useRef<string>(""); // Track previous step to detect changes

  const BeakerIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 mr-2 text-gray-500"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7 2a1 1 0 00-1 1v1a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H7zM7 7v10a1 1 0 001 1h4a1 1 0 001-1V7H7z"
        clipRule="evenodd"
      />
    </svg>
  );

  const ServerIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 mr-2 text-gray-500"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  );

  const WarningIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 mr-3 text-amber-500"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-gray-400"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );

  // Background initialization on page load
  useEffect(() => {
    initializeSystem().then((isSuccess) => {
      if (isSuccess) {
        // setSelectedScenarioId(currentScenarioId);
        setTimeout(() => {
          handleStartTest();
        }, 2000);
      }
    });
  }, []);

  const initializeSystem = async () => {
    // console.log('=== BACKGROUND SYSTEM INITIALIZATION ===');
    setIsInitializing(true);

    try {
      const engine = new SpeedTestEngine(baseUrl);
      setTestEngine(engine);

      // Step 1: Authenticate in background
      // console.log('Background authentication...');
      await engine.getAPIClient().authenticate();
      // console.log('Background authentication completed');

      // Step 2: Load scenarios
      // console.log('Loading scenarios...');
      const scenarios = await engine.getAvailableScenarios();
      setAvailableScenarios(scenarios);
      // console.log('Loaded', scenarios.length, 'scenarios');

      // Pre-select the default scenario
      const defaultScenario =
        scenarios.find((s) => s.id === defaultScenarioId) || scenarios[0];
      if (defaultScenario) {
        engine.setSelectedScenario(defaultScenario);
        // console.log('Pre-selected scenario:', defaultScenario.name);
      }

      // Step 3: Get system info (IP, ISP, best server)
      // console.log('Getting system info...');

      // First get GeoIP data for operator name and fallback location
      const geoipRes = await engine
        .getAPIClient()
        .getGeoIP()
        .catch((err) => {
          // console.warn('GeoIP failed:', err);
          return null;
        });

      // Get GPS location using unified service
      const gpsResult = await GeolocationService.getLocation({
        enableHighAccuracy: true,
        timeout: GEO_CONFIG.OPTIONS.timeout,
        maximumAge: GEO_CONFIG.OPTIONS.maximumAge,
      });

      // Extract operator name from GeoIP
      const operatorName =
        geoipRes?.meta.code === 200 ? geoipRes.content.data.isp : undefined;
      const geoipLocation =
        geoipRes?.meta.code === 200
          ? {
              latitude: geoipRes.content.data.latitude,
              longitude: geoipRes.content.data.longitude,
            }
          : undefined;

      // Get standardized location with fallback priority
      const standardizedLocation = GeolocationService.getStandardizedLocation(
        gpsResult.location,
        geoipLocation
      );

      // console.log(
      //   `Location source: ${standardizedLocation.source}`,
      //   standardizedLocation
      // );
      // console.log("Server selection parameters:", {
      //   latitude: standardizedLocation.latitude,
      //   longitude: standardizedLocation.longitude,
      //   operatorName,
      // });

      // Create objects for server selection
      const geolocation = {
        latitude: standardizedLocation.latitude,
        longitude: standardizedLocation.longitude,
        accuracy: standardizedLocation.accuracy,
      };

      // *** FIX STARTS HERE ***
      // The 'environment' object now includes all properties required by the EnvironmentInfo type.
      const environment: EnvironmentInfo = {
        geolocation,
        isp: geoipRes?.content?.data || null,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection || null,
        timestamp: Date.now(),
      };

      // Select optimal server with standardized data
      const bestServer =
        engine.getSelectedServer() ||
        (await engine
          .selectOptimalServer(geolocation, environment)
          .then(() => engine.getSelectedServer()));

      // Store GeoIP response for later use in test execution
      setGeoipResponse(geoipRes);

      const systemInfo: SystemInfo = {
        isAuthenticated: true,
        bestServer: bestServer || undefined,
      };

      if (geoipRes && geoipRes.meta.code === 200) {
        const geoData = geoipRes.content.data;
        const userIP = geoipRes.content.ip;

        systemInfo.userIP = userIP;
        systemInfo.ispName = geoData.isp;
        systemInfo.location =
          geoData.city && geoData.country_name
            ? `${geoData.city}, ${geoData.country_name}`
            : geoData.country_name || "Unknown";
      }

      setSystemInfo(systemInfo);
      // console.log("System info obtained:", systemInfo);
      // console.log("=== BACKGROUND INITIALIZATION COMPLETE ===");

      return new Promise((resolve) => {
        // console.log(
        //   "==============================RESOLVING=============================="
        // );
        resolve(true);
      });
    } catch (error) {
      // console.error("Background initialization failed:", error);
      setError(
        `Initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStartTest = useCallback(async () => {
    if (!testEngine || !systemInfo.isAuthenticated) {
      setError("System not ready. Please wait for initialization to complete.");
      return;
    }

    try {
      setIsRunning(true);
      setError(null);
      setResults(null);
      setCurrentStep("Starting test...");
      setStepProgress(0);
      setCompletedSteps([]); // Reset completed steps when starting new test
      previousStepRef.current = ""; // Reset previous step tracking

      // console.log("=== STARTING SPEED TEST (USING INITIALIZED SYSTEM) ===");
      // console.log(
      //   "Using pre-authenticated engine with",
      //   availableScenarios.length,
      //   "scenarios"
      // );
      // console.log("Selected scenario ID:", selectedScenarioId);
      // console.log("Best server:", systemInfo.bestServer);

      // Create environment object with existing GeoIP data to avoid duplicate API calls
      const environment: EnvironmentInfo = {
        userAgent: navigator.userAgent,
        connection:
          (navigator as typeof navigator & { connection?: NetworkInformation })
            .connection || null,
        geolocation: null, // Will be fetched by GPS in result submitter if needed
        isp: geoipResponse?.content.data || null, // Use existing GeoIP data
        timestamp: Date.now(),
      };

      // console.log(
      //   "Using existing GeoIP data for test environment:",
      //   environment.isp ? "Available" : "Not available"
      // );

      const testResults = await testEngine.runCompleteTest(
        selectedScenarioId,
        (step, progress) => {
          // Reset progress to 0 when step changes
          if (previousStepRef.current !== step) {
            // console.log(
            //   `Step changed from "${previousStepRef.current}" to "${step}" - resetting progress to 0`
            // );
            previousStepRef.current = step;
            setStepProgress(0);
          }

          setCurrentStep(step);
          setStepProgress(progress);

          // Web test will use the regular container
          // Dynamic iframe disabled to keep existing structure
        },
        (step, stepResults) => {
          // console.log(`${step} completed:`, stepResults);
          // Mark step as completed when it finishes
          setCompletedSteps((prev) => [...prev, step]);
          // Set progress to 100% when step completes
          setStepProgress(100);
        },
        environment // Pass existing environment data
      );

      setResults(testResults);
      setCurrentStep("Complete");
      setStepProgress(100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Test failed";
      setError(errorMessage);
      // console.error("Test error:", error);
    } finally {
      setIsRunning(false);
    }
  }, [
    testEngine,
    systemInfo.isAuthenticated,
    selectedScenarioId,
    availableScenarios.length,
    systemInfo.bestServer,
    geoipResponse,
  ]);

  const handleStopTest = useCallback(() => {
    if (testEngine) {
      testEngine.stopTest();
      setIsRunning(false);
      setCurrentStep("Stopped");
      setTestEngine(null);
    }
  }, [testEngine]);

  const handleReset = useCallback(() => {
    setResults(null);
    setError(null);
    setCurrentStep("");
    setStepProgress(0);
  }, []);

  const handleComplianceComplete = useCallback((compliant: boolean) => {
    setIsCompliant(compliant);
    if (compliant) {
      setShowCompliance(false);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Network Speed Test
        </h1>
        <p className="text-gray-600">
          TRAI MySpeed compliant network performance testing
        </p>
      </div>

      {/* System Information - speedtest.net style */}
      {isInitializing ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Initializing system...</span>
          </div>
          <div className="mt-4 text-sm text-gray-500 text-center">
            Authenticating • Loading scenarios • Getting network info
          </div>
        </div>
      ) : systemInfo.isAuthenticated ? (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500 mb-1">Your IP</div>
              <div className="font-mono text-sm font-semibold text-blue-600">
                {systemInfo.userIP || "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">ISP</div>
              <div className="font-medium text-sm text-gray-900 truncate">
                {systemInfo.ispName || "Unknown Provider"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Location</div>
              <div className="font-medium text-sm text-gray-900 truncate">
                {systemInfo.location || "Unknown"}
              </div>
            </div>
          </div>
          {systemInfo.bestServer && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Test Server</div>
                <div className="font-medium text-sm text-gray-900">
                  {systemInfo.bestServer.name} ({systemInfo.bestServer.ip})
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">
            System initialization failed
          </div>
          <div className="text-red-600 text-sm mt-1">
            Please refresh the page to try again
          </div>
        </div>
      )}

      {showCompliance && (
        <ComplianceChecker onComplianceComplete={handleComplianceComplete} />
      )}

      {/* Scenario Selection */}
      {availableScenarios.length > 0 && !isRunning && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Test Configuration
              </h3>
              <p className="text-sm text-gray-500">
                Select your test parameters below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Test Scenario Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <BeakerIcon />
                Test Scenario
              </label>
              <div className="relative">
                <select
                  value={selectedScenarioId}
                  onChange={(e) =>
                    setSelectedScenarioId(parseInt(e.target.value))
                  }
                  disabled={!isCompliant}
                  className={`appearance-none block w-full pl-3 pr-10 py-3 text-sm rounded-md shadow-sm transition min-h-[52px] ${
                    isCompliant
                      ? "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      : "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {availableScenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            {/* Test Server Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <ServerIcon />
                Test Server
              </label>
              <div className="flex items-center justify-between px-3 py-3 border border-gray-200 rounded-md bg-gray-50 min-h-[52px]">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {systemInfo.bestServer?.name || "stable-test-server"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {systemInfo.bestServer?.ip ||
                      ENV_CONFIG.DEV.FALLBACK_SERVER_IP}
                  </div>
                </div>
                <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Recommended
                </span>
              </div>
            </div>
          </div>

          {/* Compliance Warning Message */}
          {!isCompliant && (
            <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <WarningIcon />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-800">
                    Complete the compliance check to enable test configuration.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isCompliant && (
        <TestControls
          isRunning={isRunning}
          onStart={handleStartTest}
          onStop={handleStopTest}
          onReset={results ? handleReset : undefined}
        />
      )}

      {isRunning && (
        <>
          <ProgressIndicator
            currentStep={currentStep}
            progress={stepProgress}
            completedSteps={completedSteps}
          />

          {(currentStep === "web" || currentStep?.startsWith("web")) && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Title Bar */}
              <div className="bg-orange-500 text-white px-4 py-3">
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                    />
                  </svg>
                  <span className="font-semibold">WEB TEST</span>
                  <span className="text-orange-100">•</span>
                  <span className="text-orange-100 text-sm">
                    Loading web page and measuring performance...
                  </span>
                </div>
              </div>

              {/* Web Test Container */}
              <div className="p-4">
                <div
                  id="web-test-container"
                  className="min-h-[300px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
                >
                  <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                    <p className="text-sm">Preparing to load test page...</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Web page will appear here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === "streaming" && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Title Bar */}
              <div className="bg-purple-500 text-white px-4 py-3">
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5V15a1.5 1.5 0 01-1.5 1.5H9m4.5-5H15a1.5 1.5 0 011.5 1.5V15A1.5 1.5 0 0115 16.5h-1.5m-1-5H9m0 0V9a1.5 1.5 0 011.5-1.5H12A1.5 1.5 0 0113.5 9v1.5"
                    />
                  </svg>
                  <span className="font-semibold">STREAMING TEST</span>
                  <span className="text-purple-100">•</span>
                  <span className="text-purple-100 text-sm">
                    Testing video streaming quality and performance...
                  </span>
                </div>
              </div>

              {/* Streaming Test Container */}
              <div className="p-4">
                <div
                  id="streaming-test-container"
                  className="min-h-[300px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
                >
                  <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
                    <p className="text-sm">
                      Preparing to start video streaming...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Video stream will appear here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 font-medium">Test Error</div>
          </div>
          <div className="mt-2 text-red-700">{error}</div>
          <div className="mt-3 text-sm text-red-600">
            Please check your network connection and try again. If the problem
            persists, the test server may be temporarily unavailable.
          </div>
        </div>
      )}

      {results && !isRunning && (
        <>
          {/* Show API submission error */}
          {(results as any)?.submissionError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600 font-medium">
                  Submission Failed
                </div>
              </div>
              <div className="mt-2 text-red-700">
                {(results as any).submissionError}
              </div>
            </div>
          )}

          <ResultsDisplay results={results} />
        </>
      )}
    </div>
  );
}
