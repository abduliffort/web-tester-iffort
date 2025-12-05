import { LatencyResults, ActionConfig, Server } from "../types/speed-test";
import { WebRTCLatencyTester } from "./latency-tester-webrtc";
import { loggers } from "../utils/logger";
import { errorHandler } from "../utils/error-handler";

export class LatencyTester {
  private config: ActionConfig;
  private server: Server | null;
  private logger = loggers.latency;

  // For live updates - expose from WebRTC tester
  public currentLatency: number = 0;
  public currentJitter: number = 0;
  public currentPacketLoss: number = 0;

  constructor(config: ActionConfig, server: Server | null = null) {
    this.config = config;
    this.server = server;
  }

  async runTest(
    onProgress: (progress: number) => void,
    signal: AbortSignal
  ): Promise<LatencyResults> {
    this.logger.info(
      "Starting latency test with WebRTC UDP and WebSocket TCP fallback"
    );

    // Use WebRTC UDP with WebSocket TCP fallback
    this.logger.info(
      "Using WebRTC UDP latency test with WebSocket TCP fallback"
    );
    try {
      const webrtcTester = new WebRTCLatencyTester(this.config, this.server);

      // Start continuous polling to copy live values from webrtcTester
      const livePollInterval = setInterval(() => {
        this.currentLatency = webrtcTester.currentLatency;
        this.currentJitter = webrtcTester.currentJitter;
        this.currentPacketLoss = webrtcTester.currentPacketLoss;

        // Debug log every 500ms to avoid spam
        if (this.currentLatency > 0) {
          // console.log(`🔴 LatencyTester copying live values: ${this.currentLatency.toFixed(2)}ms`);
        }
      }, 100); // Poll every 100ms to keep values fresh

      // Create a wrapper to also copy on progress updates
      const progressWrapper = (progress: number) => {
        this.currentLatency = webrtcTester.currentLatency;
        this.currentJitter = webrtcTester.currentJitter;
        this.currentPacketLoss = webrtcTester.currentPacketLoss;
        onProgress(progress);
      };

      try {
        const result = await webrtcTester.runTest(progressWrapper, signal);
        clearInterval(livePollInterval); // Stop polling when test completes
        return result;
      } catch (error) {
        clearInterval(livePollInterval); // Stop polling on error
        throw error;
      }
    } catch (error) {
      const handledError = errorHandler.handle(error);
      this.logger.error(
        "WebRTC latency test system failed completely",
        handledError
      );

      // Re-throw error since WebRTC failed
      throw handledError;
    }
  }
}
