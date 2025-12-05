import {
  SpeedResults,
  ThreadResult,
  ActionConfig,
  ScenarioAction,
  Server,
} from "../types/speed-test";
import { TEST_CONFIG, NETWORK_CONFIG, API_CONFIG } from "../constants";
import { loggers } from "../utils/logger";
import { errorHandler } from "../utils/error-handler";

export class UploadTester {
  private config: ActionConfig;
  private action: ScenarioAction;
  private server: Server | null;
  private logger = loggers.upload;

  // Track live speed across all threads for real-time display
  public currentSpeed: number = 0;
  private totalBytesAllThreads: number = 0;
  private measurementStartTime: number = 0;

  constructor(
    config: ActionConfig,
    action: ScenarioAction,
    server: Server | null = null
  ) {
    this.config = config;
    this.action = action;
    this.server = server;
  }

  async runTest(
    onProgress: (progress: number) => void,
    signal: AbortSignal
  ): Promise<SpeedResults> {
    const startTime = performance.now();
    const threads: Promise<ThreadResult>[] = [];
    const threadCount =
      this.config.threads || TEST_CONFIG.UPLOAD.DEFAULT_THREADS;

    // Reset live speed trackers
    this.currentSpeed = 0;
    this.totalBytesAllThreads = 0;
    this.measurementStartTime = 0;

    this.logger.info("Starting upload test", {
      threadCount,
      methodology: "API-based",
      source: "scenario-api",
      dataType: "random-uncompressible",
    });

    // Create concurrent upload threads
    for (let i = 0; i < threadCount; i++) {
      threads.push(this.runUploadThread(i, onProgress, signal));
    }

    const threadResults = await Promise.all(threads);
    const endTime = performance.now();
    const totalDuration =
      (endTime - startTime) / API_CONFIG.CONVERSIONS.MS_TO_SECONDS;

    // TRAI Formula: Total Speed = S_1 + S_2 + S_3 + S_4 (sum of individual thread speeds)
    const aggregates = threadResults.reduce(
      (acc, result) => ({
        speed: acc.speed + result.speed,
        bytes: acc.bytes + result.bytes,
        warmupBytes: acc.warmupBytes + result.warmupBytes,
        measurementBytes: acc.measurementBytes + result.measurementBytes,
        warmupDuration: acc.warmupDuration + result.warmupDuration,
        measurementDuration:
          acc.measurementDuration + result.measurementDuration,
      }),
      {
        speed: 0,
        bytes: 0,
        warmupBytes: 0,
        measurementBytes: 0,
        warmupDuration: 0,
        measurementDuration: 0,
      }
    );

    const totalSpeed = aggregates.speed;
    const totalBytes = aggregates.bytes;
    const totalWarmupBytes = aggregates.warmupBytes;
    const totalMeasurementBytes = aggregates.measurementBytes;
    const avgWarmupDuration = aggregates.warmupDuration / threadResults.length;
    const avgMeasurementDuration =
      aggregates.measurementDuration / threadResults.length;

    this.logger.results("upload", {
      totalSpeedMbps: Number(totalSpeed.toFixed(2)),
      totalBytes,
      totalDurationSeconds: Number(totalDuration.toFixed(2)),
      threadCount: threadResults.length,
      conversionBytesPerSec:
        (totalSpeed * API_CONFIG.CONVERSIONS.BYTES_TO_MBPS_MULTIPLIER) /
        API_CONFIG.CONVERSIONS.BITS_TO_BYTES,
    });

    return {
      speed: Number(totalSpeed.toFixed(2)),
      speedUnit: "Mbps",
      bytes: totalBytes,
      duration: Number(avgMeasurementDuration.toFixed(2)),
      threads: threadResults,
      warmupDuration: avgWarmupDuration,
      warmupBytes: totalWarmupBytes,
      totalBytes: totalBytes,
      measurementBytes: totalMeasurementBytes,
      measurementDuration: Number(avgMeasurementDuration.toFixed(2)),
    };
  }

  private async runUploadThread(
    threadId: number,
    onProgress: (progress: number) => void,
    signal: AbortSignal
  ): Promise<ThreadResult> {
    const startTime = performance.now();
    let totalBytes = 0;
    let requests = 0;
    let errors = 0;
    let measurementBytes = 0;
    let measurementStartTime: number | null = null;
    let warmupBytes = 0;
    let actualWarmupDuration = 0;
    const warmupStartTime = startTime;

    // Timing from scenario API with fallback to constants
    const warmupDuration =
      (parseInt(this.config.warmup_maxtime) ||
        TEST_CONFIG.UPLOAD.DEFAULT_WARMUP_DURATION_S) *
      API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
    const transferDuration =
      (parseInt(this.config.transfer_maxtime) ||
        TEST_CONFIG.UPLOAD.DEFAULT_MEASUREMENT_DURATION_S) *
      API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
    const totalDuration = warmupDuration + transferDuration;
    const maxTimeout =
      (this.config.timeout || TEST_CONFIG.UPLOAD.DEFAULT_TIMEOUT_S) *
      API_CONFIG.CONVERSIONS.SECONDS_TO_MS;

    this.logger.phase("upload", "thread-start", {
      threadId,
      warmupDurationMs: warmupDuration,
      transferDurationMs: transferDuration,
      maxTimeoutMs: maxTimeout,
      strategy: "send-compliant-chunks",
      chunkSize: this.config.file_size || TEST_CONFIG.UPLOAD.DEFAULT_CHUNK_SIZE,
      startTime: new Date(Date.now()).toISOString(),
    });

    while (!signal.aborted && performance.now() - startTime < maxTimeout) {
      try {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;

        // Stop if we've exceeded the test duration
        if (elapsed >= totalDuration) {
          break;
        }

        // Generate random uncompressible data (compliant size)
        const chunkSize =
          this.config.file_size || TEST_CONFIG.UPLOAD.DEFAULT_CHUNK_SIZE;
        const randomData = this.generateRandomUncompressibleData(chunkSize);

        // Create FormData with random data
        const formData = new FormData();
        formData.append(
          "file",
          new Blob([randomData]),
          `chunk_${threadId}_${requests}.bin`
        );

        // Build upload URL using scenario API parameters with constants fallback
        let uploadUrl: string;
        if (this.server && this.server.url) {
          // Use scenario API resource parameter for server-based URLs
          const resource =
            this.action.resource || TEST_CONFIG.UPLOAD.DEFAULT_ENDPOINT;
          uploadUrl = `${this.server.url}${resource}`;
        } else {
          // Fallback using scenario API parameters
          const baseUri = this.config.uri || "";
          const resource =
            this.action.resource || TEST_CONFIG.UPLOAD.DEFAULT_ENDPOINT;
          uploadUrl = `${baseUri}${resource}`;
        }

        // Create request with timeout from scenario API with constants fallback
        const requestTimeoutMs =
          (this.config.timeout ||
            TEST_CONFIG.UPLOAD.DEFAULT_REQUEST_TIMEOUT_S) *
          API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
        const requestTimeout = AbortSignal.timeout(requestTimeoutMs);
        const combinedSignal = AbortSignal.any([signal, requestTimeout]);

        const requestStartTime = performance.now();
        const requestElapsed = requestStartTime - startTime;
        const phaseLabel =
          requestElapsed < warmupDuration ? "WARMUP" : "MEASUREMENT";

        this.logger.progress(
          "upload",
          threadId,
          `Starting ${phaseLabel} upload request #${requests + 1}`,
          {
            requestElapsed,
            chunkSize,
            uploadUrl,
          }
        );

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
          signal: combinedSignal,
          mode: "cors",
          cache: "no-store",
          credentials: "omit",
        });

        const requestEndTime = performance.now();
        const requestDuration = requestEndTime - requestStartTime;
        const requestEndElapsed = requestEndTime - startTime;

        // Check for warmup completion after request completes
        if (
          requestEndElapsed >= warmupDuration &&
          measurementStartTime === null
        ) {
          measurementStartTime = requestEndTime;
          measurementBytes = 0; // Reset for measurement
          actualWarmupDuration = requestEndTime - warmupStartTime;

          // Set global measurement start time for live speed calculation
          if (this.measurementStartTime === 0) {
            this.measurementStartTime = requestEndTime;
          }

          this.logger.phase("upload", "warmup-completed", {
            threadId,
            actualWarmupTimeSeconds: Number(
              (
                actualWarmupDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS
              ).toFixed(3)
            ),
            targetWarmupTimeSeconds:
              warmupDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
            warmupBytes,
            warmupRequests: requests + 1,
          });

          this.logger.phase("upload", "measurement-started", {
            threadId,
            elapsedMs: requestEndElapsed,
          });
        }

        if (response.ok) {
          totalBytes += chunkSize;

          // Track warmup vs measurement bytes based on when request ended
          if (requestEndElapsed < warmupDuration) {
            warmupBytes += chunkSize;
            this.logger.trace(`WARMUP upload completed`, {
              threadId,
              requestNumber: requests + 1,
              chunkSize,
              requestDurationMs: requestDuration,
              totalWarmupBytes: warmupBytes,
            });
          } else if (requestEndElapsed < totalDuration) {
            measurementBytes += chunkSize;

            // Update global bytes counter for live speed calculation
            this.totalBytesAllThreads += chunkSize;

            // Calculate live speed (sum of all threads)
            if (this.measurementStartTime > 0) {
              const measurementElapsed =
                (requestEndTime - this.measurementStartTime) /
                API_CONFIG.CONVERSIONS.MS_TO_SECONDS; // in seconds
              if (measurementElapsed > 0) {
                const speedBps = this.totalBytesAllThreads / measurementElapsed;
                this.currentSpeed =
                  (speedBps * API_CONFIG.CONVERSIONS.BITS_TO_BYTES) /
                  API_CONFIG.CONVERSIONS.BYTES_TO_MBPS_MULTIPLIER; // Convert to Mbps
              }
            }

            this.logger.trace(`MEASUREMENT upload completed`, {
              threadId,
              requestNumber: requests + 1,
              chunkSize,
              requestDurationMs: requestDuration,
              totalMeasurementBytes: measurementBytes,
              liveSpeedMbps: this.currentSpeed.toFixed(2),
            });
          }

          this.logger.debug(`Upload request completed successfully`, {
            threadId,
            requestNumber: requests + 1,
            requestDurationMs: requestDuration,
          });
        } else {
          errors++;
          this.logger.warn(`${phaseLabel} upload request failed`, {
            threadId,
            requestNumber: requests + 1,
            statusCode: response.status,
            url: uploadUrl,
          });
        }

        // Report progress (0-100%) - FIXED: No division by thread count
        const timeProgress = Math.min(requestElapsed / totalDuration, 1);
        onProgress(timeProgress * 100);

        requests++;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") break;

        const handledError = errorHandler.handle(error, { threadId });
        errors++;
        this.logger.error("Request error in upload thread", handledError, {
          threadId,
        });

        await new Promise((resolve) =>
          setTimeout(resolve, NETWORK_CONFIG.ERROR_RETRY_DELAY_MS)
        );
      }
    }

    const endTime = performance.now();
    const totalTestDuration = endTime - startTime;

    // TRAI Formula: S_i = B_i / T_i (per thread speed calculation)
    // B_i = bytes transferred during measurement phase
    // T_i = actual elapsed time for measurement phase

    const bytesForCalculation =
      measurementStartTime !== null ? measurementBytes : totalBytes;
    const actualMeasurementTime =
      measurementStartTime !== null
        ? endTime - measurementStartTime // Actual time spent in measurement
        : totalTestDuration;

    // Use stored actual warmup time (when measurement started), or calculate fallback
    const finalWarmupTime =
      actualWarmupDuration > 0
        ? actualWarmupDuration
        : Math.max(0, totalTestDuration - actualMeasurementTime);

    // S_i = B_i / T_i (convert bytes to bits, seconds to megabits per second)
    const threadSpeedBps =
      actualMeasurementTime > 0
        ? bytesForCalculation /
          (actualMeasurementTime / API_CONFIG.CONVERSIONS.MS_TO_SECONDS)
        : 0;
    const threadSpeedMbps =
      (threadSpeedBps * API_CONFIG.CONVERSIONS.BITS_TO_BYTES) /
      API_CONFIG.CONVERSIONS.BYTES_TO_MBPS_MULTIPLIER; // Convert Bytes/s to Mbps

    this.logger.results("upload", {
      threadId,
      warmupPhase: {
        bytes: warmupBytes,
        durationSeconds: Number(
          (finalWarmupTime / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(3)
        ),
      },
      measurementPhase: {
        bytes: bytesForCalculation,
        durationSeconds: Number(
          (
            actualMeasurementTime / API_CONFIG.CONVERSIONS.MS_TO_SECONDS
          ).toFixed(3)
        ),
      },
      totalBytes,
      totalRequests: requests,
      totalDurationSeconds: Number(
        (totalTestDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(3)
      ),
      speedCalculation: {
        bytesPerSecond: Number(threadSpeedBps.toFixed(2)),
        megabitsPerSecond: Number(threadSpeedMbps.toFixed(2)),
      },
    });

    return {
      threadId,
      speed: Number(threadSpeedMbps.toFixed(2)),
      bytes: totalBytes,
      duration: Number(totalTestDuration.toFixed(2)),
      requests,
      errors,
      warmupBytes,
      measurementBytes: bytesForCalculation,
      warmupDuration: finalWarmupTime,
      measurementDuration: actualMeasurementTime,
    };
  }

  private generateRandomUncompressibleData(size: number): ArrayBuffer {
    // console.log(`Generating ${size} bytes of random uncompressible data...`);

    // TRAI Requirement: Random, uncompressible data
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);

    // Use crypto.getRandomValues for high-quality random data
    // This ensures the data is truly uncompressible
    const chunkSize = TEST_CONFIG.UPLOAD.CRYPTO_CHUNK_SIZE; // 64KB chunks to avoid browser limits
    for (let i = 0; i < size; i += chunkSize) {
      const remainingBytes = Math.min(chunkSize, size - i);
      const chunk = new Uint8Array(remainingBytes);
      crypto.getRandomValues(chunk);
      view.set(chunk, i);
    }

    // console.log(`Generated ${size} bytes of random data`);
    return buffer;
  }
}
