import { ActionConfig, Server, StreamingTestResult } from "../types/speed-test";
import Hls from "hls.js";
import {
  TEST_CONFIG,
  NETWORK_CONFIG,
  PROTOCOL_CONFIG,
  API_CONFIG,
  CACHE_CONFIG,
  PERFORMANCE_CONFIG,
} from "../constants";
import { loggers } from "../utils/logger";
import { errorHandler } from "../utils/error-handler";

export class StreamingTester {
  private config: ActionConfig;
  private server: Server | null;
  private streamUrl: string;

  // For live progress updates
  public currentProgress: number = 0;
  public currentBytesTransferred: number = 0;

  private logger = loggers.streaming;

  constructor(config: ActionConfig, streamUrl: string, server: Server | null) {
    this.config = config;
    this.streamUrl = streamUrl;
    this.server = server;
  }

  private addAggressiveCacheBusting(url: string): string {
    const separator = url.includes("?") ? "&" : "?";
    const timestamp = Date.now();
    const random = Math.random()
      .toString(PROTOCOL_CONFIG.RANDOM_STRING_BASE)
      .substring(CACHE_CONFIG.CACHE_BUST_SUBSTRING_START);
    const nanoTime = performance.now();

    const uniqueParam = `${timestamp}${random}${nanoTime}`;
    return `${url}${separator}${CACHE_CONFIG.URL_PARAM_CACHE_PREFIX}=${uniqueParam}`;
  }

  async runTest(
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<StreamingTestResult> {
    this.logger.info("Starting streaming test", {
      streamUrl: this.streamUrl,
      timeoutSeconds: this.config.timeout,
    });

    const startTime = performance.now();

    try {
      onProgress?.(5);

      // Clear streaming caches before starting
      // console.log("Clearing streaming caches for fresh test...");
      await this.clearStreamingCaches();

      onProgress?.(10);

      // Generate fresh URL with aggressive cache-busting for each test
      const freshStreamUrl = this.addAggressiveCacheBusting(this.streamUrl);
      // console.log("Using fresh streaming URL:", freshStreamUrl);

      // Start streaming test with video element
      const result = await this.measureStreamingPerformance(
        freshStreamUrl,
        signal,
        onProgress
      );

      onProgress?.(100);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      this.logger.results("streaming", {
        durationSeconds: totalDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
        lagCount: result.lagCount,
        totalDelayMs: result.totalDelay,
        bytesTransferred: result.totalBytesTransferred,
        videostartTimeMs: result.videoStartTime,
        bufferedTimeMs: result.bufferedTime,
        rebufferingSumMs: result.rebufferingSum,
        lagDurationMs: result.lagDuration,
      });

      // Determine actual success based on streaming metrics
      const actualSuccess = this.determineStreamingSuccess({
        ...result,
        success: true,
      });

      return {
        ...result,
        duration: totalDuration,
        success: actualSuccess,
      };
    } catch (error) {
      if (signal?.aborted) {
        throw new Error("Test cancelled");
      }

      const handledError = errorHandler.handle(error, {
        context: "streaming-test",
      });
      this.logger.error("Streaming test failed", handledError);

      const endTime = performance.now();
      return {
        url: this.streamUrl,
        duration: endTime - startTime,
        videoStartTime: 0,
        lagCount: 0,
        lagDuration: 0,
        totalDelay: 0,
        bufferedTime: 0,
        rebufferingSum: 0,
        totalBytesTransferred: 0,
        bytes_sec: 0,
        success: false,
        error: handledError.message,
      };
    }
  }

  private async measureStreamingPerformance(
    url: string,
    signal?: AbortSignal,
    onProgress?: (progress: number) => void
  ): Promise<Omit<StreamingTestResult, "success" | "error">> {
    return new Promise(async (resolve, reject) => {
      // Find or create streaming test container
      const streamingContainer = await this.getOrCreateStreamingContainer();

      // Create fresh video element with cache-disabling attributes
      const video = document.createElement("video");
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.minHeight =
        TEST_CONFIG.STREAMING.DEFAULT_CONTAINER_MIN_HEIGHT;
      video.style.maxHeight = TEST_CONFIG.STREAMING.DEFAULT_CONTAINER_HEIGHT;
      video.style.backgroundColor = "#000";
      video.style.borderRadius = "8px";
      video.style.objectFit = "contain"; // Maintain aspect ratio
      video.controls = false; // Remove user controls for accurate testing
      video.muted = true; // Required for autoplay in most browsers
      video.preload = "none"; // Don't preload anything to force fresh streaming
      video.autoplay = true; // Enable autoplay
      video.playsInline = true; // For mobile devices

      // Cache-disabling attributes for video element
      video.setAttribute("cache", "no-cache");
      video.setAttribute("data-streaming-test", "true");
      video.setAttribute("data-cache-buster", Date.now().toString());

      // Force fresh loading by setting unique ID
      video.id = `streaming-video-${Date.now()}-${Math.random()}`;

      // Disable any potential prefetching
      video.setAttribute("preload", "none");
      video.setAttribute("crossorigin", "anonymous"); // Helps with cache busting

      // Metrics tracking
      let bufferEvents = 0;
      let totalBufferTime = 0;
      let bufferStartTime = 0;
      let lagCount = 0;
      let totalLagDuration = 0;
      let lagStartTime = 0;
      let startupTime = 0;
      let lastPlaybackPosition = 0;
      let lastPlaybackTime = 0;
      let totalBytesTransferred = 0; // Track total bytes transferred
      const testDuration =
        (this.config.timeout || TEST_CONFIG.STREAMING.DEFAULT_TIMEOUT_S) *
        API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
      const testStartTime = performance.now();
      let progressInterval: NodeJS.Timeout;

      const cleanup = () => {
        // Clean up HLS instance if it exists
        const hlsInstance = (video as any)._hlsInstance;
        if (hlsInstance) {
          hlsInstance.destroy();
          (video as any)._hlsInstance = null;
        }

        if (streamingContainer?.contains(video)) {
          streamingContainer?.removeChild(video);
        }
        // Reset container
        streamingContainer.innerHTML = `
          <div class="streaming-container">
            <div class="text-sm">Streaming test completed</div>
          </div>
        `;
      };

      // Lag detection function
      const detectLag = () => {
        const currentTime = performance.now();
        const currentPosition = video.currentTime;

        if (lastPlaybackTime > 0 && !video.paused && !video.ended) {
          const timeDelta = currentTime - lastPlaybackTime;
          const positionDelta = currentPosition - lastPlaybackPosition;

          // If time passed but video position didn't advance proportionally, it's lagging
          const expectedPositionDelta =
            timeDelta / API_CONFIG.CONVERSIONS.MS_TO_SECONDS;
          const lagThreshold = TEST_CONFIG.STREAMING.LAG_DETECTION_THRESHOLD_S; // tolerance

          if (expectedPositionDelta - positionDelta > lagThreshold) {
            if (lagStartTime === 0) {
              // New lag event started
              lagStartTime = currentTime;
              lagCount++;
              this.logger.debug(`Lag event detected`, {
                lagCount,
                event: "video-stuttering",
              });
            }
          } else {
            if (lagStartTime > 0) {
              // Lag event ended
              const lagDuration = currentTime - lagStartTime;
              totalLagDuration += lagDuration;
              this.logger.debug(`Lag event ended`, {
                lagDurationMs: Number(lagDuration.toFixed(0)),
              });
              lagStartTime = 0;
            }
          }
        }

        lastPlaybackTime = currentTime;
        lastPlaybackPosition = currentPosition;
      };

      const timeout = setTimeout(() => {
        cleanup();

        // Finalize any ongoing lag event
        if (lagStartTime > 0) {
          const lagDuration = performance.now() - lagStartTime;
          totalLagDuration += lagDuration;
        }

        // Calculate final metrics
        const endTime = performance.now();
        const totalDuration = endTime - testStartTime;

        // KPI calculations
        const videoStartTime = startupTime; // Time from play() to first frame
        const lagDuration = totalLagDuration; // Total rebuffering duration (ms)
        const totalDelay = videoStartTime + lagDuration; // Total delay (ms)
        const bufferedTime = lagDuration + videoStartTime; // Total buffered time (ms)
        const rebufferingSum = lagDuration; // Sum of all rebuffering events (ms)

        const bytes_sec =
          totalBytesTransferred > 0 && totalDuration > 0
            ? totalBytesTransferred /
            (totalDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS)
            : 0;

        resolve({
          url,
          duration: totalDuration,
          videoStartTime,
          lagCount,
          lagDuration,
          totalDelay,
          bufferedTime,
          rebufferingSum,
          totalBytesTransferred,
          bytes_sec,
        });
      }, testDuration);

      // Handle signal abortion
      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          cleanup();
          reject(new Error("Test cancelled"));
        });
      }

      // Video event handlers
      video.addEventListener("loadstart", () => {
        // console.log("Video loading started");
        this.updateStreamingUI(
          streamingContainer,
          "Loading video stream...",
          5
        );
      });

      video.addEventListener("loadeddata", () => {
        // console.log("Video data loaded");
        // this.updateStreamingUI(
        //   streamingContainer,
        //   "Video data loaded, preparing playback...",
        //   15
        // );
      });

      video.addEventListener("loadedmetadata", () => {
        // console.log("Video metadata loaded");
        // console.log(
        //   `Video dimensions: ${video.videoWidth}x${video.videoHeight}`
        // );
      });

      video.addEventListener("canplay", () => {
        const now = performance.now();
        startupTime = now - testStartTime;
        this.logger.phase("streaming", "video-ready", {
          startupTimeMs: Number(startupTime.toFixed(0)),
        });

        // Auto-start playback
        video.play().catch((e) => console.log("Autoplay blocked:", e));
      });

      video.addEventListener("playing", () => {
        this.logger.phase("streaming", "playback-started", {});
        lastPlaybackTime = performance.now();
        lastPlaybackPosition = video.currentTime;
        this.updateStreamingUI(streamingContainer, "Video streaming...", 25);
      });

      video.addEventListener("waiting", () => {
        bufferStartTime = performance.now();
        bufferEvents++;
        // console.log(`Buffer event #${bufferEvents} started`);
        this.updateStreamingUI(
          streamingContainer,
          `Buffering... (event #${bufferEvents})`,
          null
        );
      });

      video.addEventListener("canplaythrough", () => {
        if (bufferStartTime > 0) {
          const bufferDuration = performance.now() - bufferStartTime;
          totalBufferTime += bufferDuration;
          // console.log(
          //   `Buffer event ended - duration: ${bufferDuration.toFixed(0)}ms`
          // );
          bufferStartTime = 0;
        }
      });

      video.addEventListener("error", (e) => {
        // console.error("Video error:", e);
        // console.error("Video error details:", {
        //   error: video.error,
        //   networkState: video.networkState,
        //   readyState: video.readyState,
        //   currentSrc: video.currentSrc,
        // });

        let errorMessage = "Unknown error";
        if (video.error) {
          switch (video.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = "Video loading was aborted";
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = "Network error occurred while loading video";
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = "Video decoding error";
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage =
                "Video format not supported by browser. HLS (.m3u8) may require additional libraries.";
              break;
            default:
              errorMessage = video.error.message || "Unknown video error";
          }
        }

        clearTimeout(timeout);
        cleanup();
        reject(new Error(`Video playback error: ${errorMessage}`));
      });

      // Video ended event - complete test when video finishes
      video.addEventListener("ended", () => {
        this.logger.phase("streaming", "playback-completed", {});
        clearTimeout(timeout);
        clearInterval(progressInterval);

        // Finalize any ongoing lag event
        if (lagStartTime > 0) {
          const lagDuration = performance.now() - lagStartTime;
          totalLagDuration += lagDuration;
        }

        // Calculate final metrics
        const endTime = performance.now();
        const totalDuration = endTime - testStartTime;

        // KPI calculations
        const videoStartTime = startupTime; // Time from play() to first frame
        const lagDuration = totalLagDuration; // Total rebuffering duration (ms)
        const totalDelay = videoStartTime + lagDuration; // Total delay (ms)
        const bufferedTime = lagDuration + videoStartTime; // Total buffered time (ms)
        const rebufferingSum = lagDuration; // Sum of all rebuffering events (ms)

        cleanup();
        const bytes_sec =
          totalBytesTransferred > 0 && totalDuration > 0
            ? totalBytesTransferred /
            (totalDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS)
            : 0;

        resolve({
          url,
          duration: totalDuration,
          videoStartTime,
          lagCount,
          lagDuration,
          totalDelay,
          bufferedTime,
          rebufferingSum,
          totalBytesTransferred,
          bytes_sec,
        });
      });

      // Progress tracking with lag detection
      progressInterval = setInterval(() => {
        if (!video.duration) return;

        detectLag();

        // Calculate progress based on video playback position (more accurate)
        const videoProgress = (video.currentTime / video.duration) * 100;
        const timeProgress =
          ((performance.now() - testStartTime) / testDuration) * 100;

        // Use video progress if available, otherwise fall back to time progress
        const progress =
          video.duration > 0
            ? Math.min(95, videoProgress)
            : Math.min(90, timeProgress);

        // Update live progress
        this.currentProgress = progress;
        this.currentBytesTransferred = totalBytesTransferred;

        onProgress?.(progress);

        // Update UI with current stats - removed buffers and lags display
        const currentTime = Math.round(video.currentTime);
        const totalTime = Math.round(video.duration);
        const timeDisplay =
          video.duration > 0
            ? `${currentTime}/${totalTime}s`
            : `${Math.round(
              (performance.now() - testStartTime) /
              API_CONFIG.CONVERSIONS.MS_TO_SECONDS
            )}s`;
        const stats = `Time: ${timeDisplay}`;
        this.updateStreamingUI(streamingContainer, stats, progress);
      }, TEST_CONFIG.STREAMING.PROGRESS_UPDATE_INTERVAL_MS); // Check frequency for lag detection

      // Cleanup interval when test ends
      setTimeout(() => clearInterval(progressInterval), testDuration);

      // Handle HLS streams (.m3u8) - check if browser supports it natively
      if (url.includes(".m3u8")) {
        if (
          video.canPlayType("application/vnd.apple.mpegurl") ||
          video.canPlayType("application/x-mpegURL")
        ) {
          // Native HLS support (Safari)
          // console.log("Using native HLS support");
          video.src = url;
        } else if (Hls.isSupported()) {
          // Use hls.js for browsers that don't support HLS natively
          // console.log("Using hls.js for HLS streaming");
          const hls = new Hls({
            enableWorker: NETWORK_CONFIG.HLS.ENABLE_WORKER,
            lowLatencyMode: NETWORK_CONFIG.HLS.LOW_LATENCY_MODE,
            backBufferLength: NETWORK_CONFIG.HLS.BACK_BUFFER_LENGTH,
            maxBufferLength: NETWORK_CONFIG.HLS.MAX_BUFFER_LENGTH,
            maxMaxBufferLength: NETWORK_CONFIG.HLS.MAX_MAX_BUFFER_LENGTH,
            startLevel: NETWORK_CONFIG.HLS.START_LEVEL,
            autoStartLoad: NETWORK_CONFIG.HLS.AUTO_START_LOAD,
            // Progressive streaming settings for accurate testing
            startPosition: NETWORK_CONFIG.HLS.START_POSITION,
            liveSyncDurationCount: NETWORK_CONFIG.HLS.LIVE_SYNC_DURATION_COUNT,
            liveMaxLatencyDurationCount:
              NETWORK_CONFIG.HLS.LIVE_MAX_LATENCY_DURATION_COUNT,
            maxBufferSize: NETWORK_CONFIG.HLS.MAX_BUFFER_SIZE,
            maxBufferHole: NETWORK_CONFIG.HLS.MAX_BUFFER_HOLE,
            highBufferWatchdogPeriod:
              NETWORK_CONFIG.HLS.HIGH_BUFFER_WATCHDOG_PERIOD,
            nudgeOffset: NETWORK_CONFIG.HLS.NUDGE_OFFSET,
            nudgeMaxRetry: NETWORK_CONFIG.HLS.NUDGE_MAX_RETRY,
            maxFragLookUpTolerance:
              NETWORK_CONFIG.HLS.MAX_FRAG_LOOKUP_TOLERANCE,
            liveDurationInfinity: NETWORK_CONFIG.HLS.LIVE_DURATION_INFINITY,
            enableCEA708Captions: NETWORK_CONFIG.HLS.ENABLE_CEA708_CAPTIONS,
            enableWebVTT: NETWORK_CONFIG.HLS.ENABLE_WEBVTT,
            // Custom loader for cache busting on .ts segments
            loader: class extends (Hls.DefaultConfig.loader!) {
              load(context: any, config: any, callbacks: any) {
                // Add cache busting to .ts segment URLs
                if (context.url.endsWith(".ts")) {
                  const separator = context.url.includes("?") ? "&" : "?";
                  const timestamp = Date.now();
                  const random = Math.random()
                    .toString(API_CONFIG.CONVERSIONS.STRING_BASE_36)
                    .substring(CACHE_CONFIG.CACHE_BUST_SUBSTRING_START);
                  const uniqueParam = `${timestamp}${random}`;
                  context.url = `${context.url}${separator}${CACHE_CONFIG.URL_PARAM_TS_PREFIX}=${uniqueParam}`;
                  // console.log(
                  //   "Cache busting applied to .ts segment:",
                  //   context.url.split("/").pop()
                  // );
                }
                super.load(context, config, callbacks);
              }
            },
          });

          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            // console.log("HLS manifest parsed successfully");
            // Force immediate playback after manifest is parsed
            video.play().catch((e) => console.log("HLS autoplay blocked:", e));
          });

          hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
            // console.log(
            //   "HLS fragment loaded:",
            //   data?.frag?.url?.split("/").pop() || "unknown"
            // );
            // Track bytes transferred from HLS fragments
            if (data?.payload) {
              totalBytesTransferred += data.payload.byteLength || 0;
            }
            // When first fragment is loaded, try to play if not already playing
            if (video.paused) {
              video
                .play()
                .catch((e) => console.log("HLS fragment play blocked:", e));
            }
          });

          hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
            // console.log('HLS level loaded:', data?.level || 'unknown level');
          });

          hls.on(Hls.Events.BUFFER_APPENDED, () => {
            // console.log('HLS buffer appended - video data ready');
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            // Provide more detailed error logging
            // console.log('HLS error event:', {
            //   type: data?.type || 'unknown',
            //   details: data?.details || 'no details',
            //   fatal: data?.fatal || false,
            //   reason: data?.reason || 'no reason',
            //   response: data?.response || 'no response',
            //   url: data?.url || 'no url',
            //   fullData: data
            // });

            // Only handle fatal errors
            if (data?.fatal) {
              this.logger.error("FATAL HLS error - attempting recovery", {
                type: data?.type || "unknown",
                details: data?.details || "no details",
                fatal: data?.fatal || false,
              });
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  this.logger.info("Network error recovery: restarting load");
                  try {
                    hls.startLoad();
                  } catch (e) {
                    this.logger.error(
                      "Network recovery failed",
                      errorHandler.handle(e)
                    );
                  }
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  // console.log("Media error recovery: recovering media error");
                  try {
                    hls.recoverMediaError();
                  } catch (e) {
                    // console.error("Media recovery failed:", e);
                  }
                  break;
                default:
                  // console.error("Unrecoverable error, destroying HLS instance");
                  try {
                    hls.destroy();
                  } catch (e) {
                    // console.error("Error destroying HLS:", e);
                  }
                  break;
              }
            } else {
              // Non-fatal error - just log it
              // console.log(
              //   "Non-fatal HLS error (continuing playback):",
              //   data?.details || "unknown"
              // );
            }
          });

          // Store hls instance for cleanup
          (video as any)._hlsInstance = hls;
        } else {
          // Fallback: try loading the URL directly anyway
          // console.warn(
          //   "HLS not supported natively and hls.js not available, trying direct load"
          // );
          video.src = url;
        }
      } else {
        // Regular video file
        video.src = url;
      }

      // Add video to container AFTER source is set
      streamingContainer.innerHTML = "";
      streamingContainer.appendChild(video);

      this.logger.info("Starting streaming test execution", {
        durationSeconds: testDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
      });
      // Don't call updateStreamingUI here as video is already in container
      // Just add the initial overlay
      const overlay = document.createElement("div");
      overlay.className = "streaming-overlay";
      overlay.style.position = "absolute";
      overlay.style.bottom = "0";
      overlay.style.left = "0";
      overlay.style.right = "0";
      overlay.style.background = "rgba(0,0,0,0.8)";
      overlay.style.color = "white";
      overlay.style.padding = "10px";
      overlay.style.fontSize = "14px";
      overlay.style.textAlign = "center";
      overlay.style.zIndex = "10";
      overlay.textContent = "Initializing streaming test...";
      streamingContainer.style.position = "relative";
      streamingContainer.appendChild(overlay);
    });
  }

  private async clearStreamingCaches(): Promise<void> {
    try {
      // Clear Service Worker caches (video segments)
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        // console.log("Service Worker caches cleared");
      }

      // Clear ONLY streaming-related storage items (not test results!)
      try {
        // Clear only HLS/streaming related items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.includes("hls") ||
              key.includes("video") ||
              key.includes("stream"))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        // Clear session storage (temporary data only)
        sessionStorage.clear();

        // console.log(
        //   "Streaming-related storage cleared (test results preserved)"
        // );
      } catch (e) {
        // console.warn("Storage clearing failed:", e);
      }

      // Remove any existing video elements to prevent cache reuse
      const existingVideos = document.querySelectorAll("video");
      existingVideos.forEach((video) => {
        // Stop video and clear sources
        video.pause();
        video.removeAttribute("src");
        video.load(); // This triggers cache clearing for the video element

        // Clear any HLS instances
        const hlsInstance = (video as any)._hlsInstance;
        if (hlsInstance) {
          try {
            hlsInstance.destroy();
          } catch (e) {
            // console.warn("HLS instance cleanup failed:", e);
          }
        }
      });

      // Force memory pressure to clear video buffer caches
      const tempArrays = [];
      for (let i = 0; i < PERFORMANCE_CONFIG.MEMORY_PRESSURE_ITERATIONS; i++) {
        tempArrays.push(
          new Array(PERFORMANCE_CONFIG.MEMORY_PRESSURE_ARRAY_SIZE_SMALL).fill(
            Math.random()
          )
        );
      }
      tempArrays.length = 0;

      // console.log("Streaming caches cleared successfully");
    } catch (error) {
      // console.warn("Streaming cache clearing failed:", error);
    }
  }

  private async getOrCreateStreamingContainer(): Promise<HTMLElement> {
    // Wait a bit for React to render the container
    await new Promise((resolve) =>
      setTimeout(resolve, TEST_CONFIG.STREAMING.UI_UPDATE_DELAY_MS)
    );

    const container = document?.getElementById("streaming-test-container");
    if (!container) {
      // console.error(
      //   "Available containers:",
      //   document.querySelectorAll('[id*="container"]')
      // );

      throw new Error(
        'Streaming container not found. Make sure currentStep is "streaming" and UI component is rendered.'
      );
    }

    // console.log("Found streaming container:", container);
    return container;
  }

  private updateStreamingUI(
    container: HTMLElement,
    message: string,
    progress: number | null
  ) {
    // Update the streaming UI with current status
    const existingVideo = container?.querySelector("video");
    if (existingVideo) {
      // Video exists - add or update overlay
      let overlay = container.querySelector(
        ".streaming-overlay"
      ) as HTMLElement;
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "streaming-overlay";
        overlay.style.position = "absolute";
        overlay.style.bottom = "0";
        overlay.style.left = "0";
        overlay.style.right = "0";
        overlay.style.background = "rgba(0,0,0,0.8)";
        overlay.style.color = "white";
        overlay.style.padding = "10px";
        overlay.style.fontSize = "14px";
        overlay.style.textAlign = "center";
        overlay.style.zIndex = "10";
        container.style.position = "relative"; // Ensure container can position overlay
        container.appendChild(overlay);
      }

      // Update overlay content
      if (progress !== null) {
        overlay.innerHTML = `
          <div style="margin-bottom: 8px;">${message}</div>
          <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: #8B5CF6; width: ${progress}%; transition: width 0.3s;"></div>
          </div>
        `;
      } else {
        overlay.textContent = message;
      }

      // Keep overlay visible throughout the streaming test to show progress bar
    } else {
      // No video yet - show loading state
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 300px; flex-direction: column; color: #8B5CF6;">
          <div style="font-size: 24px; margin-bottom: 12px;">📺</div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Streaming Test</div>
          <div style="font-size: 14px; margin-bottom: 12px;">${message}</div>
          ${progress !== null
          ? `
            <div style="width: 200px; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; background: #8B5CF6; width: ${progress}%; transition: width 0.3s;"></div>
            </div>
          `
          : `
            <div style="width: 20px; height: 20px; border: 2px solid #8B5CF6; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
          `
        }
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </div>
      `;
    }
  }

  /**
   * Determine if streaming test was actually successful based on metrics
   */
  private determineStreamingSuccess(result: StreamingTestResult): boolean {
    // Basic success criteria for streaming test
    const hasVideoStarted = result.videoStartTime > 0;
    const hasBytesTransferred = result.totalBytesTransferred > 0;
    const hasReasonablePlayback = result.bytes_sec > 0;

    // Calculate lag ratio (excessive lag indicates failure)
    const testDuration = result.duration * API_CONFIG.CONVERSIONS.SECONDS_TO_MS; // Convert to ms
    const lagRatio = testDuration > 0 ? result.lagDuration / testDuration : 1;
    const excessiveLag = lagRatio > TEST_CONFIG.STREAMING.LAG_RATIO_THRESHOLD; // More than 50% lag time

    // Log the success determination
    this.logger.debug("Determining streaming success", {
      hasVideoStarted,
      hasBytesTransferred,
      hasReasonablePlayback,
      lagRatio: Number(lagRatio.toFixed(3)),
      excessiveLag,
      lagCount: result.lagCount,
      totalBytesTransferred: result.totalBytesTransferred,
      videoStartTime: result.videoStartTime,
    });

    // Success requires: video started, data transferred, reasonable playback, not excessive lag
    return (
      hasVideoStarted &&
      hasBytesTransferred &&
      hasReasonablePlayback &&
      !excessiveLag
    );
  }
}
