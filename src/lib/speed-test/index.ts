import { LatencyTester } from "./latency-tester";
import { DownloadTester } from "./download-tester";
import { UploadTester } from "./upload-tester";
import { WebTesterInline as WebTester } from "./web-tester-inline";
import { StreamingTester } from "./streaming-tester";
import { ScenarioLoader } from "./scenario-loader";
import { TRAIResultSubmitter } from "./result-submitter";
import { APIClient } from "../auth/api-client";
import { GeolocationService } from "../utils/geolocation";
import {
  TestResults,
  Scenario,
  Server,
  EnvironmentInfo,
  GeolocationInfo,
  NetworkInformation,
} from "../types/speed-test";
import {
  NETWORK_CONFIG,
  GEO_CONFIG,
  SERVER_CONFIG,
  VALIDATION_CONFIG,
  ENV_CONFIG,
} from "../constants";

export class SpeedTestEngine {
  private apiClient: APIClient;
  private scenarioLoader: ScenarioLoader;
  private resultSubmitter: TRAIResultSubmitter;
  private selectedScenario: Scenario | null = null;
  private selectedServer: Server | null = null;
  private abortController: AbortController | null = null;

  // Store Master ID for continuous testing (fetched once, used for all cycles)
  private cachedMasterId: number | null = null;
  private cachedMasterUuid: string | null = null;

  // Store intermediate results for live updates
  public intermediateResults: {
    latency?: number;
    download?: number;
    upload?: number;
    web?: number;
    streaming?: number;
  } = {};

  constructor(baseUrl: string, masterId?: number, masterUuid?: string) {
    this.apiClient = new APIClient(baseUrl);
    this.scenarioLoader = new ScenarioLoader(this.apiClient);
    this.resultSubmitter = new TRAIResultSubmitter(this.apiClient);

    // Set Master ID if provided (from Continuous Test page button click)
    if (masterId && masterUuid) {
      this.cachedMasterId = masterId;
      this.cachedMasterUuid = masterUuid;
      // console.log("✅ SpeedTestEngine initialized with Master ID:", masterId);
      // console.log("✅ Master UUID:", masterUuid);
    }
  }

  // HTTP Ping for latency measurement
  private async httpPing(server: Server): Promise<number> {
    const startTime = performance.now();

    try {
      const response = await fetch(server.url, {
        method: "HEAD", // Use HEAD to minimize data transfer
        cache: "no-cache",
        signal: AbortSignal.timeout(NETWORK_CONFIG.HTTP_PING_TIMEOUT_MS),
      });

      const endTime = performance.now();
      const latency = endTime - startTime;

      // console.log(
      //   `HTTP ping to ${server.name} (${server.url}): ${latency.toFixed(2)}ms`
      // );
      return response.ok ? latency : Infinity;
    } catch (error) {
      // console.warn(`HTTP ping to ${server.name} failed:`, error);
      return Infinity;
    }
  }

  // Filter servers that have websocket_port
  private filterServersWithWebSocket(servers: Server[]): Server[] {
    return servers.filter((server) => {
      const hasWebSocketPort = server.websocket_port;
      if (!hasWebSocketPort) {
        // console.log(`Filtering out server ${server.name}: no websocket_port`);
      }
      return hasWebSocketPort;
    });
  }

  // Select best server based on HTTP ping latency
  public async selectBestServer(
    latitude?: number,
    longitude?: number,
    operatorName?: string
  ): Promise<Server | null> {
    try {
      // console.log("Fetching available servers...");
      const serversResponse = await this.apiClient.getServers(
        latitude,
        longitude,
        operatorName
      );

      if (!serversResponse?.content?.length) {
        // console.warn("No servers available from API");
        return null;
      }

      // console.log(`Found ${serversResponse.content.length} servers from API`);

      // Filter servers with websocket_port
      const serversWithWebSocket = this.filterServersWithWebSocket(
        serversResponse.content
      );

      if (serversWithWebSocket.length === 0) {
        // console.warn("No servers have websocket_port available");
        return null;
      }

      // console.log(
      //   `${serversWithWebSocket.length} servers have websocket_port, testing latency...`
      // );

      // Test HTTP ping latency for each server
      const serverLatencies = await Promise.all(
        serversWithWebSocket.map(async (server) => ({
          server,
          latency: await this.httpPing(server),
        }))
      );

      // Filter out failed pings and sort by latency
      const validServers = serverLatencies
        .filter((result) => result.latency !== Infinity)
        .sort((a, b) => a.latency - b.latency);

      if (validServers.length === 0) {
        // console.warn("All servers failed HTTP ping test");
        return null;
      }

      const bestServer = validServers[0];
      // console.log(
      //   `Selected server: ${
      //     bestServer.server.name
      //   } with latency: ${bestServer.latency.toFixed(2)}ms`
      // );

      this.selectedServer = bestServer.server;
      return bestServer.server;
    } catch (error) {
      // console.error("Server selection failed:", error);
      return null;
    }
  }

  async runCompleteTest(
    scenarioId: number,
    onProgress?: (step: string, progress: number) => void,
    onStepComplete?: (step: string, results: unknown) => void,
    existingEnvironment?: any,
    isContinuousTest: boolean = false // NEW PARAMETER: indicates continuous testing mode
  ): Promise<TestResults> {
    const testId = Date.now();
    // console.log("=== STARTING SPEED TEST [ID:", testId, "] ===");
    // console.log(
    //   "Using pre-authenticated system and loaded scenario ID:",
    //   scenarioId
    // );
    // console.log("Is Continuous Test Mode:", isContinuousTest);

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // For Continuous Test: Use cached Master ID (already fetched on Start button click)
      // For Quick/Full Test: Don't use Master ID at all
      // console.log("=== CHECKING MASTER ID ===");
      let masterId: number | null = null;
      let masterUuid: string | null = null;

      if (isContinuousTest) {
        // Use cached Master ID (should be already fetched by fetchAndCacheMasterId)
        if (this.cachedMasterId && this.cachedMasterUuid) {
          // console.log(
          //   "♻️ Using CACHED Master ID for this cycle:",
          //   this.cachedMasterId
          // );
          masterId = this.cachedMasterId;
          masterUuid = this.cachedMasterUuid;
        } else {
          // console.warn(
          //   "⚠️ Continuous test but NO cached Master ID! This should not happen."
          // );
          // console.warn(
          //   '⚠️ Master ID should be fetched when "Start Test" button is clicked.'
          // );
        }
      } else {
        // console.log(
        //   "ℹ️ Quick/Full Test (NOT continuous) - NO Master ID needed"
        // );
      }

      // Ensure scenario is selected (should already be done in background)
      if (!this.selectedScenario) {
        const scenarios = await this.scenarioLoader.loadScenarios();
        this.selectedScenario = await this.scenarioLoader.getScenarioById(
          scenarios,
          scenarioId
        );

        if (!this.selectedScenario) {
          // console.error("Scenario not found:", scenarioId);
          throw new Error(`Scenario with ID ${scenarioId} not found`);
        }
      }

      // Use existing environment data from SpeedTestRunner or prepare fresh environment
      const environment =
        existingEnvironment || (await this.prepareEnvironment());

      const results: TestResults = {
        environment,
        timestamp: Date.now(),
        scenario: this.selectedScenario,
        server: this.selectedServer || undefined,
        ...(masterId && { masterId }), // Add master ID if available
        ...(masterUuid && { masterUuid }), // Add master UUID if available
      };

      // Step 1: Latency Test (if configured)
      // console.log("=== STARTING LATENCY TEST ===");
      const isFullTest = scenarioId === ENV_CONFIG.SCENARIOS.FULL_TEST_ID;

      // Step 1: Latency Test (Skip if Full Test)
      // console.log("=== STARTING LATENCY TEST ===");
      const latencyConfig = this.scenarioLoader.getLatencyConfig(
        this.selectedScenario
      );
      if (latencyConfig && !isFullTest) {
        onProgress?.("latency", 0);
        const latencyTester = new LatencyTester(
          latencyConfig,
          this.selectedServer
        );

        // Start polling for live latency updates
        const latencyPollInterval = setInterval(() => {
          const currentValue = latencyTester.currentLatency;
          this.intermediateResults.latency = currentValue;

          // Debug log to track polling
          if (currentValue > 0) {
            // console.log(
            //   `🔵 Engine polling: latencyTester.currentLatency = ${currentValue.toFixed(
            //     2
            //   )}ms`
            // );
          }
        }, 100); // Poll every 100ms

        const finalResult = await latencyTester.runTest(
          (progress) => onProgress?.("latency", progress),
          signal
        );

        // Clear polling
        clearInterval(latencyPollInterval);

        results.latency = finalResult;
        // Store final intermediate result
        this.intermediateResults.latency = finalResult?.average || 0;
        onStepComplete?.("latency", results.latency);
        // console.log("Latency test completed");
      }

      // Step 2: Download Test (if configured)
      // console.log("=== STARTING DOWNLOAD TEST ===");
      const downloadConfig = this.scenarioLoader.getDownloadConfig(
        this.selectedScenario
      );
      if (downloadConfig && !isFullTest) {
        onProgress?.("download", 0);
        const downloadAction = this.selectedScenario.actions.find(
          (action) => action.type === "DOWNLOAD"
        )!;
        const downloadTester = new DownloadTester(
          downloadConfig,
          downloadAction,
          this.selectedServer
        );

        // Start polling for live speed updates
        const downloadPollInterval = setInterval(() => {
          this.intermediateResults.download = downloadTester.currentSpeed;
        }, 100); // Poll every 100ms

        // Run the test
        const finalResult = await downloadTester.runTest((progress) => {
          onProgress?.("download", progress);
        }, signal);

        // Clear polling
        clearInterval(downloadPollInterval);

        // Store final result
        results.download = finalResult;
        this.intermediateResults.download = finalResult?.speed || 0;
        onStepComplete?.("download", results.download);
        // console.log("Download test completed");
      }

      // Step 3: Upload Test (if configured)
      // console.log("=== STARTING UPLOAD TEST ===");
      const uploadConfig = this.scenarioLoader.getUploadConfig(
        this.selectedScenario
      );
      if (uploadConfig && !isFullTest) {
        onProgress?.("upload", 0);
        const uploadAction = this.selectedScenario.actions.find(
          (action) => action.type === "UPLOAD_GENERATED"
        )!;
        const uploadTester = new UploadTester(
          uploadConfig,
          uploadAction,
          this.selectedServer
        );

        // Start polling for live speed updates
        const uploadPollInterval = setInterval(() => {
          this.intermediateResults.upload = uploadTester.currentSpeed;
        }, 100); // Poll every 100ms

        // Run the test
        const finalResult = await uploadTester.runTest((progress) => {
          onProgress?.("upload", progress);
        }, signal);

        // Clear polling
        clearInterval(uploadPollInterval);

        // Store final result
        results.upload = finalResult;
        this.intermediateResults.upload = finalResult?.speed || 0;
        onStepComplete?.("upload", results.upload);
        // console.log("Upload test completed");
      }

      // Step 4: Web Tests (single or multiple URLs)
      // console.log("=== STARTING WEB TESTS ===");
      const webActions = this.selectedScenario.actions.filter(
        (action) => action.type === "WEB"
      );
      if (webActions.length > 0) {
        if (webActions.length === 1) {
          // Single web test - use 'web' field for backward compatibility
          await this.runSingleWebTest(
            webActions[0],
            results,
            onProgress,
            onStepComplete,
            signal
          );
        } else {
          // Multiple web tests - use web1, web2, etc.
          await this.runMultipleWebTests(
            webActions,
            results,
            onProgress,
            onStepComplete,
            signal
          );
        }
        // console.log("All web tests completed");
      }

      // Step 5: Streaming Test (if configured)
      // console.log("=== STARTING STREAMING TEST ===");
      const streamingAction = this.selectedScenario.actions.find(
        (action) => action.type === "STREAMING"
      )!;
      // console.log(streamingAction);
      const streamingConfig = this.scenarioLoader.getStreamingConfig(
        this.selectedScenario
      );
      if (streamingConfig) {
        onProgress?.("streaming", 0);
        const streamUrl = this.scenarioLoader.buildStreamingUrl(
          streamingConfig,
          streamingAction,
          this.selectedServer
        );
        const streamingTester = new StreamingTester(
          streamingConfig,
          streamUrl,
          this.selectedServer
        );

        // Start polling for live streaming progress
        const streamingPollInterval = setInterval(() => {
          this.intermediateResults.streaming = streamingTester.currentProgress;
        }, 200); // Poll every 200ms

        const finalResult = await streamingTester.runTest(
          (progress) => onProgress?.("streaming", progress),
          signal
        );

        // Clear polling
        clearInterval(streamingPollInterval);

        results.streaming = finalResult;
        this.intermediateResults.streaming = finalResult?.totalDelay || 0;
        onStepComplete?.("streaming", results.streaming);
        // console.log("Streaming test completed");
      }

      // console.log("=== SPEED TEST COMPLETED [ID:", testId, "] ===");

      // // Submit test results to TRAI /cycle endpoint
      // console.log("=== SUBMITTING RESULTS TO TRAI [Test ID:", testId, "] ===");
      let cycleId: string | null = null;
      try {
        const token = this.apiClient.getToken();
        if (token && this.selectedServer) {
          const ispProvider = environment.isp?.isp || "Unknown ISP";
          // console.log("📤 Calling submitTestResults...");
          cycleId = await this.resultSubmitter.submitTestResults(
            results,
            this.selectedScenario,
            this.selectedServer,
            token,
            ispProvider,
            environment // Pass the entire environment object which contains GeoIP data
          );
          // console.log("📥 submitTestResults returned:", cycleId);
          // console.log("TRAI submission completed successfully");

          // Store the cycle ID in results
          if (cycleId) {
            (results as any).cycleId = cycleId;
            // console.log("✅ Stored Cycle ID in results:", cycleId);
          } else {
            // console.warn("⚠️ cycleId is null or undefined");
            // console.warn(
            //   "⚠️ This might be a duplicate submission or backend did not return id_qscycle"
            // );
          }
        } else {
          // console.warn(
          //   "Cannot submit to TRAI: missing token or server information"
          // );
        }
      } catch (error) {
        // console.error(
        //   "TRAI submission failed, but continuing with test results:",
        //   error
        // );

        // Add submission error to results for user notification
        (results as any).submissionError =
          error instanceof Error ? error.message : "Unknown error";

        // Don't throw here - we still want to return the test results even if submission fails
      }

      return results;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Test cancelled by user");
      }
      throw error;
    }
  }

  stopTest(): void {
    this.abortController?.abort();
  }

  /**
   * Fetch Master ID from API and cache it for continuous testing
   * Call this ONCE when user clicks "Start Test" in Continuous Test page
   */
  async fetchAndCacheMasterId(): Promise<{
    masterId: number;
    masterUuid: string;
  } | null> {
    // console.log(
    //   "🔵 fetchAndCacheMasterId called - fetching Master ID from API..."
    // );

    // If already cached, return cached value
    if (this.cachedMasterId && this.cachedMasterUuid) {
      // console.log("♻️ Master ID already cached:", this.cachedMasterId);
      return {
        masterId: this.cachedMasterId,
        masterUuid: this.cachedMasterUuid,
      };
    }

    try {
      const masterIdResponse = await this.apiClient.getMasterId();
      this.cachedMasterId = masterIdResponse.master_id;
      this.cachedMasterUuid = masterIdResponse.uuid;

      // console.log("✅ Master ID fetched and CACHED:", this.cachedMasterId);
      // console.log("✅ Master UUID:", this.cachedMasterUuid);
      // console.log(
      //   "💡 This Master ID will be used for ALL cycles in this continuous test session"
      // );

      return {
        masterId: this.cachedMasterId,
        masterUuid: this.cachedMasterUuid,
      };
    } catch (error) {
      // console.error("❌ Failed to fetch Master ID:", error);
      return null;
    }
  }

  /**
   * Clear cached Master ID - call this when continuous test session ends
   * This ensures a fresh Master ID for the next continuous test session
   */
  clearMasterIdCache(): void {
    // console.log("🗑️ Clearing Master ID cache");
    this.cachedMasterId = null;
    this.cachedMasterUuid = null;
  }

  /**
   * Get the current cached Master ID (for display purposes)
   */
  getMasterId(): number | null {
    return this.cachedMasterId;
  }

  /**
   * Get the current cached Master UUID (for display purposes)
   */
  getMasterUuid(): string | null {
    return this.cachedMasterUuid;
  }

  private async prepareEnvironment(): Promise<EnvironmentInfo> {
    // console.log("Preparing test environment...");

    const environment: EnvironmentInfo = {
      userAgent: navigator.userAgent,
      connection:
        (navigator as typeof navigator & { connection?: NetworkInformation })
          .connection || null,
      geolocation: null,
      isp: null,
      timestamp: Date.now(),
    };

    // console.log("Base environment created:", {
    //   userAgent: environment.userAgent,
    //   hasConnection: !!environment.connection,
    //   timestamp: environment.timestamp,
    // });

    // Get geolocation using unified service
    // console.log("Attempting to get geolocation...");
    const gpsResult = await GeolocationService.getLocation({
      enableHighAccuracy: true,
      timeout: GEO_CONFIG.GPS.DEFAULT_GPS_TIMEOUT_MS,
      maximumAge: GEO_CONFIG.OPTIONS.maximumAge,
    });

    if (gpsResult.location) {
      environment.geolocation = gpsResult.location;
      // console.log("Geolocation obtained:", environment.geolocation);
    }

    // Get ISP information via authenticated GeoIP API
    // console.log("Fetching ISP/GeoIP information...");
    try {
      const geoIpResponse = await this.apiClient.getGeoIP();
      // console.log("GeoIP API response:", geoIpResponse);

      if (geoIpResponse.meta.code === VALIDATION_CONFIG.HTTP_SUCCESS_CODE) {
        environment.isp = geoIpResponse.content.data;
        // console.log("ISP information obtained:", environment.isp);
      }
    } catch (error) {
      // console.warn("ISP information not available:", error);
      // console.log("Test will continue without ISP data");
    }

    // console.log("Final environment:", environment);
    return environment;
  }

  async selectOptimalServer(
    geolocation: GeolocationInfo | null,
    environment?: EnvironmentInfo
  ): Promise<void> {
    try {
      // Use ISP name directly as operator name
      const operatorName = environment?.isp?.isp;

      // console.log("Server selection parameters:", {
      //   latitude: geolocation?.latitude,
      //   longitude: geolocation?.longitude,
      //   operatorName: operatorName,
      // });

      // Try dynamic server selection first
      const dynamicServer = await this.selectBestServer(
        geolocation?.latitude,
        geolocation?.longitude,
        operatorName
      );

      if (dynamicServer) {
        // console.log(
        //   "Using dynamically selected server:",
        //   dynamicServer.name,
        //   dynamicServer.url
        // );
        return; // selectBestServer already sets this.selectedServer
      }
    } catch (error) {
      // console.error("Dynamic server selection error:", error);
      // console.log("Falling back to stable test server");
    }

    // Fallback to stable test server if dynamic selection fails
    this.selectedServer = SERVER_CONFIG.FALLBACK_SERVER;

    // console.log("Using fallback stable test server:", this.selectedServer.url);
  }

  // Utility methods
  getSelectedScenario(): Scenario | null {
    return this.selectedScenario;
  }

  setSelectedScenario(scenario: Scenario): void {
    this.selectedScenario = scenario;
  }

  getSelectedServer(): Server | null {
    return this.selectedServer;
  }

  async getAvailableScenarios(): Promise<Scenario[]> {
    return this.scenarioLoader.loadScenarios();
  }

  getAPIClient(): APIClient {
    return this.apiClient;
  }

  /**
   * Run single web test and store result in 'web' field for backward compatibility
   */
  private async runSingleWebTest(
    webAction: any,
    results: any,
    onProgress?: (step: string, progress: number) => void,
    onStepComplete?: (step: string, results: unknown) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const WebTester = (await import("./web-tester-inline")).WebTesterInline;

    try {
      // console.log("=== STARTING SINGLE WEB TEST ===");
      onProgress?.("web", 0);

      const webConfig = this.scenarioLoader.getWebConfig(
        this.selectedScenario!
      );
      if (webConfig) {
        const testUrl = this.scenarioLoader.buildWebTestUrl(
          webConfig,
          webAction
        );
        const webTester = new WebTester(
          webConfig,
          testUrl,
          this.selectedServer
        );

        const webResult = await webTester.runTest(
          (progress) => onProgress?.("web", progress),
          signal
        );

        // Store result in 'web' field for backward compatibility
        (results as any).web = webResult;
        onStepComplete?.("web", webResult);

        // console.log(`Single web test completed for URL: ${testUrl}`);
      }
    } catch (error) {
      // console.log("Single web test failed:", error);
      (results as any).web = {
        url: webAction.uri || "unknown",
        duration: 0,
        browsingDelay: 0,
        bytes_total: 0,
        testTraffic: 0,
        bytes_transferred: 0,
        launchDuration: 0,
        bytes_sec: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      onStepComplete?.("web", (results as any).web);
    }
  }

  /**
   * Run multiple web tests sequentially and store results as web1, web2, etc.
   */
  private async runMultipleWebTests(
    webActions: any[],
    results: any,
    onProgress?: (step: string, progress: number) => void,
    onStepComplete?: (step: string, results: unknown) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const WebTester = (await import("./web-tester-inline")).WebTesterInline;

    for (let i = 0; i < webActions.length; i++) {
      const webAction = webActions[i];
      const webFieldName = `web${i + 1}`;

      try {
        // console.log(`=== STARTING WEB TEST ${i + 1}/${webActions.length} ===`);
        onProgress?.(webFieldName, 0);

        const webConfig = this.scenarioLoader.getWebConfig(
          this.selectedScenario!
        );
        if (webConfig) {
          const testUrl = this.scenarioLoader.buildWebTestUrl(
            webConfig,
            webAction
          );
          // Reuse the same container for all web tests
          const webTester = new WebTester(
            webConfig,
            testUrl,
            this.selectedServer,
            "web-test-container"
          );

          const webResult = await webTester.runTest(
            (progress) => onProgress?.(webFieldName, progress),
            signal
          );

          // Store result in dynamic field (web1, web2, etc.)
          (results as any)[webFieldName] = webResult;
          onStepComplete?.(webFieldName, webResult);

          // console.log(`Web test ${i + 1} completed for URL: ${testUrl}`);
        }
      } catch (error) {
        // Continue with other web tests even if one fails
        // console.log(`Web test ${i + 1} failed:`, error);
        (results as any)[webFieldName] = {
          url: webAction.uri || "unknown",
          duration: 0,
          browsingDelay: 0,
          bytes_total: 0,
          testTraffic: 0,
          bytes_transferred: 0,
          launchDuration: 0,
          bytes_sec: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
        onStepComplete?.(webFieldName, (results as any)[webFieldName]);
      }
    }
  }
}

// Export all classes for individual use
export { LatencyTester } from "./latency-tester";
export { DownloadTester } from "./download-tester";
export { UploadTester } from "./upload-tester";
export { WebTesterInline } from "./web-tester-inline";
export { StreamingTester } from "./streaming-tester";
export { ScenarioLoader } from "./scenario-loader";
export { ServerSelector } from "./server-selector";
export { APIClient } from "../auth/api-client";
