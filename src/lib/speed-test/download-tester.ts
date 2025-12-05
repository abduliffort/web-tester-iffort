import { SpeedResults, ThreadResult, ActionConfig, ScenarioAction, Server } from '../types/speed-test';
import { TEST_CONFIG, NETWORK_CONFIG, API_CONFIG } from '../constants';
import { loggers } from '../utils/logger';
import { errorHandler } from '../utils/error-handler';

export class DownloadTester {
  private config: ActionConfig;
  private action: ScenarioAction;
  private server: Server | null;
  private logger = loggers.download;
  
  // Track live speed across all threads for real-time display
  public currentSpeed: number = 0;
  private totalBytesAllThreads: number = 0;
  private measurementStartTime: number = 0;

  constructor(config: ActionConfig, action: ScenarioAction, server: Server | null = null) {
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
    const threadCount = this.config.threads || TEST_CONFIG.DOWNLOAD.DEFAULT_THREADS;
    
    // Reset live speed trackers
    this.currentSpeed = 0;
    this.totalBytesAllThreads = 0;
    this.measurementStartTime = 0;

    this.logger.info('Starting download test', {
      threadCount,
      methodology: 'API-based',
      source: 'scenario-api'
    });

    // Create concurrent download threads
    for (let i = 0; i < threadCount; i++) {
      threads.push(this.runDownloadThread(i, onProgress, signal));
    }

    const threadResults = await Promise.all(threads);
    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // TRAI Formula: Total Speed = S_1 + S_2 + S_3 + S_4 (sum of individual thread speeds)
    const aggregates = threadResults.reduce((acc, result) => ({
      speed: acc.speed + result.speed,
      bytes: acc.bytes + result.bytes,
      warmupBytes: acc.warmupBytes + result.warmupBytes,
      measurementBytes: acc.measurementBytes + result.measurementBytes,
      warmupDuration: acc.warmupDuration + result.warmupDuration,
      measurementDuration: acc.measurementDuration + result.measurementDuration
    }), { 
      speed: 0, 
      bytes: 0, 
      warmupBytes: 0, 
      measurementBytes: 0, 
      warmupDuration: 0, 
      measurementDuration: 0 
    });
    
    const totalSpeed = aggregates.speed;
    const totalBytes = aggregates.bytes;
    const totalWarmupBytes = aggregates.warmupBytes;
    const totalMeasurementBytes = aggregates.measurementBytes;
    const avgWarmupDuration = aggregates.warmupDuration / threadResults.length;
    const avgMeasurementDuration = aggregates.measurementDuration / threadResults.length;

    this.logger.results('download', {
      totalSpeedMbps: Number(totalSpeed.toFixed(2)),
      totalBytes,
      totalDurationSeconds: Number((totalDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(2)),
      threadCount: threadResults.length,
      conversionBytesPerSec: (totalSpeed * API_CONFIG.CONVERSIONS.BYTES_TO_MBPS_MULTIPLIER / API_CONFIG.CONVERSIONS.BITS_TO_BYTES)
    });

    return {
      speed: Number(totalSpeed.toFixed(2)),
      speedUnit: 'Mbps',
      bytes: totalBytes,
      duration: Number(avgMeasurementDuration.toFixed(2)),
      threads: threadResults,
      warmupDuration: avgWarmupDuration,
      warmupBytes: totalWarmupBytes,
      totalBytes: totalBytes,
      measurementBytes: totalMeasurementBytes,
      measurementDuration: Number(avgMeasurementDuration.toFixed(2))
    };
  }

  private async runDownloadThread(
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
    let actualWarmupDuration = 0; // Track actual warmup time when measurement starts
    const warmupStartTime = startTime;

    // Timing from scenario API with fallback to constants
    const warmupDuration = (parseInt(this.config.warmup_maxtime) || TEST_CONFIG.DOWNLOAD.DEFAULT_WARMUP_DURATION_S) * API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
    const transferDuration = (parseInt(this.config.transfer_maxtime) || TEST_CONFIG.DOWNLOAD.DEFAULT_MEASUREMENT_DURATION_S) * API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
    const totalDuration = warmupDuration + transferDuration;
    const maxTimeout = (this.config.timeout || TEST_CONFIG.DOWNLOAD.DEFAULT_TIMEOUT_S) * API_CONFIG.CONVERSIONS.SECONDS_TO_MS;

    this.logger.phase('download', 'thread-start', {
      threadId,
      warmupDurationMs: warmupDuration,
      transferDurationMs: transferDuration,
      maxTimeoutMs: maxTimeout,
      strategy: 'stream-large-files',
      startTime: new Date(Date.now()).toISOString()
    });

    while (!signal.aborted && (performance.now() - startTime) < Math.min(maxTimeout, totalDuration)) {
      try {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;

        // Stop immediately when target duration is reached
        if (elapsed >= totalDuration) {
          this.logger.debug(`Target duration reached, stopping thread immediately`, {
            threadId,
            targetDurationMs: totalDuration,
            elapsedMs: elapsed,
            warmupDurationMs: warmupDuration,
            warmupCompleted: measurementStartTime !== null
          });
          break;
        }


        // Build download URL using scenario API parameters with constants fallback
        let downloadUrl: string;
        if (this.server && this.server.url) {
          // Use scenario API parameters for server-based URLs
          const resource = this.action.resource || TEST_CONFIG.DOWNLOAD.DEFAULT_RESOURCE_PATH;
          const filename = this.config.filename || TEST_CONFIG.DOWNLOAD.DEFAULT_FILENAME;
          const extension = this.config.extension || TEST_CONFIG.DOWNLOAD.DEFAULT_FILE_EXTENSION;
          downloadUrl = `${this.server.url}${resource}${filename}${extension}?t=${Date.now()}&r=${Math.random()}&thread=${threadId}`;
        } else {
          // Fallback using scenario API parameters with constants
          const baseUri = this.config.uri || '';
          const filename = this.config.filename || TEST_CONFIG.DOWNLOAD.DEFAULT_FILENAME;
          const extension = this.config.extension || TEST_CONFIG.DOWNLOAD.DEFAULT_FILE_EXTENSION;
          const resource = this.action.resource || TEST_CONFIG.DOWNLOAD.DEFAULT_RESOURCE_PATH;
          downloadUrl = `${baseUri}${resource}${filename}${extension}?t=${Date.now()}&r=${Math.random()}&thread=${threadId}`;
        }

        // Create request with timeout from scenario API with constants fallback
        const requestTimeoutMs = (this.config.timeout || TEST_CONFIG.DOWNLOAD.DEFAULT_REQUEST_TIMEOUT_S) * API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
        const remainingTime = totalDuration - elapsed;
        const effectiveTimeout = Math.min(requestTimeoutMs, remainingTime);
        
        const requestTimeout = AbortSignal.timeout(effectiveTimeout);
        const combinedSignal = AbortSignal.any([signal, requestTimeout]);
        
        const requestStartTime = performance.now();
        const requestElapsed = requestStartTime - startTime;
        const phaseLabel = requestElapsed < warmupDuration ? 'WARMUP' : 'MEASUREMENT';
        
        this.logger.progress('download', threadId, `Starting ${phaseLabel} request #${requests + 1}`, {
          requestElapsed,
          downloadUrl
        });
        
        const response = await fetch(downloadUrl, { 
          signal: combinedSignal,
          mode: 'cors',
          cache: 'no-store',
          credentials: 'omit'
        });

        if (!response.ok) {
          errors++;
          this.logger.warn(`${phaseLabel} request failed`, {
            threadId,
            requestNumber: requests + 1,
            statusCode: response.status,
            url: downloadUrl
          });
          continue;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          errors++;
          this.logger.error(`${phaseLabel} request failed - no reader available`, {
            threadId,
            requestNumber: requests + 1,
            url: downloadUrl
          });
          continue;
        }

        this.logger.debug(`${phaseLabel} request started successfully, reading stream`, {
          threadId,
          requestNumber: requests + 1
        });

        // Process response chunks with strict time limits
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            const chunkTime = performance.now();
            const chunkElapsed = chunkTime - startTime;
            
            // Check for warmup completion during chunk processing
            if (chunkElapsed >= warmupDuration && measurementStartTime === null) {
              measurementStartTime = chunkTime;
              measurementBytes = 0; // Reset for measurement
              actualWarmupDuration = chunkTime - warmupStartTime;
              
              // Set global measurement start time for live speed calculation
              if (this.measurementStartTime === 0) {
                this.measurementStartTime = chunkTime;
              }
              
              this.logger.phase('download', 'warmup-completed', {
                threadId,
                actualWarmupTimeSeconds: Number((actualWarmupDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(3)),
                targetWarmupTimeSeconds: warmupDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
                warmupBytes,
                warmupRequests: requests
              });
              
              this.logger.phase('download', 'measurement-started', {
                threadId,
                elapsedMs: chunkElapsed
              });
            }
            
            // Stop processing chunks if we've exceeded the total duration
            if (chunkElapsed >= totalDuration) {
              this.logger.debug(`Chunk time limit reached, stopping stream`, {
                threadId,
                chunkElapsed,
                totalDuration,
                requestNumber: requests + 1
              });
              reader.cancel(); // Cancel the stream immediately
              break;
            }

            totalBytes += value.length;

            // Count bytes during warmup and measurement periods separately
            if (chunkElapsed < warmupDuration) {
              warmupBytes += value.length;
              this.logger.trace(`WARMUP chunk received`, {
                threadId,
                chunkBytes: value.length,
                chunkElapsed,
                totalWarmupBytes: warmupBytes
              });
            } else {
              measurementBytes += value.length;
              
              // Update global bytes counter for live speed calculation
              this.totalBytesAllThreads += value.length;
              
              // Calculate live speed (sum of all threads)
              if (this.measurementStartTime > 0) {
                const measurementElapsed = (chunkTime - this.measurementStartTime) / API_CONFIG.CONVERSIONS.MS_TO_SECONDS; // in seconds
                if (measurementElapsed > 0) {
                  const speedBps = this.totalBytesAllThreads / measurementElapsed;
                  this.currentSpeed = (speedBps * API_CONFIG.CONVERSIONS.BITS_TO_BYTES) / API_CONFIG.CONVERSIONS.BYTES_TO_MBPS_MULTIPLIER; // Convert to Mbps
                }
              }
              
              this.logger.trace(`MEASUREMENT chunk received`, {
                threadId,
                chunkBytes: value.length,
                chunkElapsed,
                totalMeasurementBytes: measurementBytes,
                liveSpeedMbps: this.currentSpeed.toFixed(2)
              });
            }

            // Report progress (0-100%)
            const timeProgress = Math.min(chunkElapsed / totalDuration, 1);
            onProgress(timeProgress * 100);
          }
        }

        requests++;
        const requestEndTime = performance.now();
        const requestDuration = requestEndTime - requestStartTime;
        const finalPhaseLabel = (requestEndTime - startTime) < warmupDuration ? 'WARMUP' : 'MEASUREMENT';
        this.logger.debug(`${finalPhaseLabel} request completed`, {
          threadId,
          requestNumber: requests,
          requestDurationMs: requestDuration
        });

      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') break;
        
        const handledError = errorHandler.handle(error, { threadId });
        errors++;
        this.logger.error('Request error in download thread', handledError, { threadId });
        
        await new Promise(resolve => setTimeout(resolve, NETWORK_CONFIG.ERROR_RETRY_DELAY_MS));
      }
    }

    const endTime = performance.now();
    const totalTestDuration = endTime - startTime;
    
    // TRAI Formula: S_i = B_i / T_i (per thread speed calculation)
    // B_i = bytes transferred during measurement phase
    // T_i = actual elapsed time for measurement phase
    
    const bytesForCalculation = measurementStartTime !== null ? measurementBytes : totalBytes;
    const actualMeasurementTime = measurementStartTime !== null 
      ? (endTime - measurementStartTime)  // Actual time spent in measurement (milliseconds)
      : totalTestDuration;
    
    // Use stored actual warmup time (when measurement started), or calculate fallback
    const finalWarmupTime = actualWarmupDuration > 0 ? actualWarmupDuration : Math.max(0, (totalTestDuration - actualMeasurementTime));
    
    // S_i = B_i / T_i (convert bytes to bits, seconds to megabits per second)
    const threadSpeedBps = actualMeasurementTime > 0 ? bytesForCalculation / (actualMeasurementTime / API_CONFIG.CONVERSIONS.MS_TO_SECONDS) : 0; // Convert ms to seconds
    const threadSpeedMbps = (threadSpeedBps * API_CONFIG.CONVERSIONS.BITS_TO_BYTES) / API_CONFIG.CONVERSIONS.BYTES_TO_MBPS_MULTIPLIER; // Convert Bytes/s to Mbps
    
    this.logger.results('download', {
      threadId,
      warmupPhase: {
        bytes: warmupBytes,
        durationSeconds: Number((finalWarmupTime / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(3))
      },
      measurementPhase: {
        bytes: bytesForCalculation,
        durationSeconds: Number((actualMeasurementTime / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(3))
      },
      totalBytes,
      totalRequests: requests,
      totalDurationSeconds: Number((totalTestDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(3)),
      speedCalculation: {
        bytesPerSecond: Number(threadSpeedBps.toFixed(2)),
        megabitsPerSecond: Number(threadSpeedMbps.toFixed(2))
      }
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
      measurementDuration: actualMeasurementTime
    };
  }

}