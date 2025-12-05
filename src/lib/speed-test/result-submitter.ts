import { TestResults, Server, Scenario } from "../types/speed-test";
import { APIClient } from "../auth/api-client";
import {
  API_CONFIG,
  TEST_CONFIG,
  NETWORK_CONFIG,
  GEO_CONFIG,
} from "../constants";
import { GeolocationService } from "../utils/geolocation";

export class TRAIResultSubmitter {
  private apiClient: APIClient;
  private submittedTimestamps: Set<number> = new Set(); // Track submitted test timestamps
  private cycleIdCache: Map<number, string> = new Map(); // Cache cycle IDs by timestamp

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  private formatDateForTRAI(date: Date): string {
    // Format: Y-m-d\TH:i:sP (e.g., 2025-08-25T11:40:50+01:00)
    const offset = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60)
      .toString()
      .padStart(2, "0");
    const offsetMins = (Math.abs(offset) % 60).toString().padStart(2, "0");
    const offsetSign = offset >= 0 ? "+" : "-";

    // Convert UTC to local time by adding the timezone offset
    const localDate = new Date(
      date.getTime() -
        date.getTimezoneOffset() * API_CONFIG.CONVERSIONS.MINUTES_TO_MS
    );

    // Format as ISO string but replace Z with timezone offset
    return localDate
      .toISOString()
      .replace(/\.\d{3}Z$/, `${offsetSign}${offsetHours}:${offsetMins}`);
  }

  private formatUTCDateForTRAI(date: Date): string {
    // Format: Y-m-d\TH:i:sZ (e.g., 2025-08-21T09:48:05Z)
    // Remove milliseconds but keep Z suffix for UTC
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  // Helper methods to determine test success and generate status fields
  private calculateLatencyStatus(latency: any): {
    status: string;
    status_code: string;
    statusComment: string;
    success_flag: boolean;
  } {
    // Latency test success criteria:
    // - Must have received at least some packets
    // - Packet loss should be reasonable (< 100%)
    // - Average latency should be reasonable (> 0)
    const hasResults = latency.packetsReceived > 0 && latency.average > 0;
    const reasonablePacketLoss =
      latency.packetLoss < NETWORK_CONFIG.MAX_REASONABLE_PACKET_LOSS_PERCENT;
    const success = hasResults && reasonablePacketLoss;

    const statusComment = success
      ? `RTT: ${latency.average.toFixed(
          2
        )}ms, Loss: ${latency.packetLoss.toFixed(1)}%`
      : `Failed - RTT: ${latency.average.toFixed(
          2
        )}ms, Loss: ${latency.packetLoss.toFixed(1)}%`;

    return {
      status: success ? "OK" : "ERROR",
      status_code: success ? "OK" : "ERROR",
      statusComment,
      success_flag: success,
    };
  }

  private calculateDownloadStatus(download: any): {
    status: string;
    status_code: string;
    statusComment: string;
    success_flag: boolean;
  } {
    // Download test success criteria:
    // - Must have transferred some bytes
    // - Must have achieved some speed
    // - Duration should be within 30 second timeout
    const hasTransfer = download.bytes > 0 && download.speed > 0;
    const withinTimeout =
      download.duration > 0 &&
      download.duration <= NETWORK_CONFIG.MAX_TEST_DURATION_SECONDS;
    const success = hasTransfer && withinTimeout;

    const statusComment = success
      ? `${download.speed.toFixed(2)} Mbps`
      : `Failed - ${download.speed.toFixed(2)} Mbps`;

    return {
      status: success ? "OK" : "ERROR",
      status_code: success ? "OK" : "ERROR",
      statusComment,
      success_flag: success,
    };
  }

  private calculateUploadStatus(upload: any): {
    status: string;
    status_code: string;
    statusComment: string;
    success_flag: boolean;
  } {
    // Upload test success criteria:
    // - Must have transferred some bytes
    // - Must have achieved some speed
    // - Duration should be within 30 second timeout
    const hasTransfer = upload.bytes > 0 && upload.speed > 0;
    const withinTimeout =
      upload.duration > 0 &&
      upload.duration <= NETWORK_CONFIG.MAX_TEST_DURATION_SECONDS;
    const success = hasTransfer && withinTimeout;

    const statusComment = success
      ? `${upload.speed.toFixed(2)} Mbps`
      : `Failed - ${upload.speed.toFixed(2)} Mbps`;

    return {
      status: success ? "OK" : "ERROR",
      status_code: success ? "OK" : "ERROR",
      statusComment,
      success_flag: success,
    };
  }

  private async getLocationData(geoipData?: any): Promise<any> {
    // Extract GeoIP details from existing data
    const geoipInfo = {
      city: geoipData?.isp?.city || "",
      country:
        geoipData?.isp?.country_code_iso3166alpha2 ||
        geoipData?.isp?.country_code_fips10 - 4 ||
        "",
      region: geoipData?.isp?.region_name || "",
      postalcode: geoipData?.ips?.postal_code || "",
      latitude: geoipData?.isp?.latitude || 0,
      longitude: geoipData?.isp?.longitude || 0,
    };

    // Use unified geolocation service with standardized priority
    const gpsResult = await GeolocationService.getLocation({
      enableHighAccuracy: true,
      timeout: GEO_CONFIG.GPS.DEFAULT_GPS_TIMEOUT_MS,
      maximumAge: API_CONFIG.TRAI.GPS_CACHE_MAX_AGE_MS,
      fallbackToIp: false,
    });

    const standardizedLocation = GeolocationService.getStandardizedLocation(
      gpsResult.location,
      { latitude: geoipInfo.latitude, longitude: geoipInfo.longitude }
    );

    return {
      latitude: standardizedLocation.latitude,
      longitude: standardizedLocation.longitude,
      accuracy: standardizedLocation.accuracy.toFixed(2),
      provider: standardizedLocation.source.toLowerCase(),
      horizontal_accuracy: standardizedLocation.accuracy.toFixed(2),
      speed: 0, // Speed not available from static location
      speed_accuracy: 0,
      averageSpeed: 0,
      // Use GeoIP data for location details
      city: geoipInfo.city,
      country: geoipInfo.country,
      region: geoipInfo.region,
      postalcode: geoipInfo.postalcode,
    };
  }

  private generateTraces(locationData: any): any[] {
    const now = new Date();
    const traces = [];

    // FIRST trace
    traces.push({
      wifi: {
        ssid: null,
        bssid: null,
        enabled: true,
      },
      tag: 1,
      date: this.formatDateForTRAI(now),
      location: {
        latitude: locationData.latitude,
        city: locationData.city,
        longitude: locationData.longitude,
        provider: locationData.provider,
        averageSpeed: locationData.averageSpeed,
        accuracy: locationData.accuracy,
        postalcode: locationData.postalcode,
        country: locationData.country,
        speed_accuracy: locationData.speed_accuracy,
        speed: locationData.speed,
        location_time: this.formatDateForTRAI(now),
      },
      device_timestamp: this.formatDateForTRAI(now),
      event: "FIRST",
    });

    // LAST trace
    const endTime = new Date(
      now.getTime() + NETWORK_CONFIG.TRACE_END_TIME_OFFSET_MS
    );
    traces.push({
      date: this.formatDateForTRAI(endTime),
      event: "LAST",
      device_timestamp: this.formatDateForTRAI(endTime),
      wifi: {
        bssid: null,
        enabled: true,
        ssid: null,
      },
      tag: 2,
      location: {
        location_time: this.formatDateForTRAI(endTime),
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        city: locationData.city,
        postalcode: locationData.postalcode,
        provider: locationData.provider,
        speed_accuracy: locationData.speed_accuracy,
        averageSpeed: locationData.averageSpeed,
        longitude: locationData.longitude,
        country: locationData.country,
        latitude: locationData.latitude,
      },
    });

    return traces;
  }

  async submitTestResults(
    results: TestResults,
    scenario: Scenario,
    server: Server,
    token: string,
    ispProvider: string,
    geoipData?: any
  ): Promise<string | null> {
    // Prevent duplicate submissions (React Strict Mode protection)
    const timestamp = results.timestamp;

    // console.log('🔵 submitTestResults called with timestamp:', timestamp);
    // console.log('🔵 Already submitted timestamps:', Array.from(this.submittedTimestamps));
    // console.log('🔵 Checking if', timestamp, 'is in submitted set:', this.submittedTimestamps.has(timestamp));

    if (this.submittedTimestamps.has(timestamp)) {
      // console.log('⚠️ DUPLICATE SUBMISSION PREVENTED for timestamp:', timestamp);
      // console.log('⚠️ This means the API was ALREADY called for this test');
      // Return cached cycle ID if available
      const cachedCycleId = this.cycleIdCache.get(timestamp);
      if (cachedCycleId) {
        // console.log('✅ Returning CACHED Cycle ID:', cachedCycleId);
        return cachedCycleId;
      }
      // console.warn('⚠️ No cached cycle ID available for duplicate submission');
      return null;
    }

    // console.log('=== SUBMITTING TRAI TEST RESULTS (FIRST TIME FOR THIS TIMESTAMP) ===');
    // console.log('🔒 Locking submission for timestamp:', timestamp);
    this.submittedTimestamps.add(timestamp);
    // console.log('🔒 Updated submitted timestamps:', Array.from(this.submittedTimestamps));

    // console.log('Converting test results to TRAI submission format...');

    const submission = await this.formatResultsForTRAI(
      results,
      scenario,
      server,
      token,
      ispProvider,
      geoipData
    );

    // console.log('TRAI Submission payload:', JSON.stringify(submission, null, 2));

    try {
      // console.log('📡 Calling backend /cycle API...');
      const response = await this.apiClient.submitTestCycle(submission);
      // console.log('✅ TRAI submission successful!');
      // console.log('📦 Backend response:', JSON.stringify(response, null, 2));

      // Extract id_qscycle from response.content.id_qscycle
      const cycleId = response?.content?.id_qscycle;

      if (cycleId) {
        // Convert to string if it's a number
        const cycleIdString = String(cycleId);
        // console.log('✅ Received Cycle ID from backend:', cycleIdString);
        // Cache the cycle ID for this timestamp
        this.cycleIdCache.set(timestamp, cycleIdString);
        // console.log('💾 Cached cycle ID for timestamp:', timestamp);
        return cycleIdString;
      } else {
        // console.warn('⚠️ Backend response did not contain content.id_qscycle');
        // console.warn('⚠️ Full response structure:', response);
        return null;
      }
    } catch (error) {
      // console.error('TRAI submission failed:', error);
      throw error;
    }
  }

  private async formatResultsForTRAI(
    results: TestResults,
    scenario: Scenario,
    server: Server,
    token: string,
    ispProvider: string,
    geoipData?: any
  ): Promise<any> {
    const now = new Date();
    const tests: any[] = [];

    // Convert Latency Test
    if (results.latency) {
      tests.push(
        await this.formatLatencyResult(results, scenario, server, geoipData)
      );
    }

    // Convert Download Test
    if (results.download) {
      tests.push(
        await this.formatDownloadResult(results, scenario, server, geoipData)
      );
    }

    // Convert Upload Test
    if (results.upload) {
      tests.push(
        await this.formatUploadResult(results, scenario, server, geoipData)
      );
    }

    // Convert Web Test (single)
    if (results.web) {
      tests.push(
        await this.formatWebResult(results, scenario, server, geoipData)
      );
    }

    // Convert Multiple Web Tests (web1, web2, web3, etc.)
    let webIndex = 1;
    while ((results as any)[`web${webIndex}`]) {
      const webResult = (results as any)[`web${webIndex}`];
      // Create a temporary results object for the formatter
      const tempResults = { ...results, web: webResult };
      tests.push(
        await this.formatWebResult(tempResults, scenario, server, geoipData)
      );
      webIndex++;
    }

    // Convert Streaming Test
    if (results.streaming) {
      tests.push(
        await this.formatStreamingResult(results, scenario, server, geoipData)
      );
    }

    // Build the cycle object
    const cycleData: any = {
      token,
      scenario_id: scenario.id,
      sim: {
        provider: ispProvider,
        sim_mobile_country_code: "null",
        sim_mobile_network_code: "null",
        countryCode: "null",
        mccmnc: "null",
      },
      user: {
        locationType: "INDOOR",
      },
      submission_category: "Full Test",
      server_id: server.id,
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0",
      date: this.formatDateForTRAI(now),
      tests,
    };

    // Add master_id if available (for Continuous Test)
    if ((results as any).masterId) {
      cycleData.master_id = (results as any).masterId;
      console.log(
        "🔗 Linking Cycle with Master ID:",
        (results as any).masterId
      );
    }

    return {
      cycle: cycleData,
    };
  }

  private async formatLatencyResult(
    results: TestResults,
    scenario: Scenario,
    server: Server,
    geoipData?: any
  ): Promise<any> {
    const latency = results.latency!;
    const latencyAction = scenario.actions.find(
      (action) => action.type === "LATENCY"
    );
    const now = new Date();
    const locationData = await this.getLocationData(geoipData);

    // Calculate dynamic status fields
    const statusInfo = this.calculateLatencyStatus(latency);

    return {
      action_id: latencyAction?.id_action,
      timestamp: this.formatDateForTRAI(now),
      device_timestamp: this.formatDateForTRAI(now),
      utc_datetime: this.formatDateForTRAI(now),
      local_datetime: this.formatDateForTRAI(now),
      startDate: this.formatDateForTRAI(new Date(results.timestamp)),
      url: server.url,
      targets: server.url,
      status: statusInfo.status,
      status_code: statusInfo.status_code,
      statusComment: statusInfo.statusComment,
      success_flag: statusInfo.success_flag,
      duration: Math.round(
        latency.average * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      launchDuration: 0,
      warmup_duration: 0,
      warmup_bytes_transferred: 0,
      bytes_total:
        latency.packetsSent * TEST_CONFIG.LATENCY.DEFAULT_PACKET_SIZE,
      bytes_transferred:
        latency.packetsSent * TEST_CONFIG.LATENCY.DEFAULT_PACKET_SIZE,
      testTraffic:
        latency.packetsSent * TEST_CONFIG.LATENCY.DEFAULT_PACKET_SIZE,
      deviceGlobalTraffic: 0,
      threads: 0,
      extension: "",

      // Latency specific fields (convert ms to microseconds)
      jitter: Math.round(
        latency.jitter * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      packets_received: latency.packetsReceived,
      packets_sent: latency.packetsSent,
      round_trip_time: Math.round(
        latency.average * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      packet_loss: latency.packetLoss.toFixed(2),
      packet_size: TEST_CONFIG.LATENCY.DEFAULT_PACKET_SIZE,

      location: {
        county: locationData.county,
        averageSpeed: locationData.averageSpeed,
        longitude: locationData.longitude,
        latitude: locationData.latitude,
        city: locationData.city,
        provider: locationData.provider,
        horizontal_accuracy: locationData.horizontal_accuracy,
        country: locationData.country,
        postalcode: locationData.postalcode,
        location_time: this.formatDateForTRAI(now),
      },
      network: {
        type: "wifi",
        techno: "WIFI",
        connected: true,
        available: true,
      },
      wifi: {
        ssid: "",
        enabled: true,
        bssid: "",
      },
      traces: this.generateTraces(locationData),
    };
  }

  private async formatDownloadResult(
    results: TestResults,
    scenario: Scenario,
    server: Server,
    geoipData?: any
  ): Promise<any> {
    const download = results.download!;
    const downloadAction = scenario.actions.find(
      (action) => action.type === "DOWNLOAD"
    );
    const downloadConfig =
      downloadAction?.cfg.find((cfg) => cfg.is_default) ||
      downloadAction?.cfg[0];
    const now = new Date();
    const locationData = await this.getLocationData(geoipData);

    // Calculate dynamic status fields
    const statusInfo = this.calculateDownloadStatus(download);

    return {
      action_id: downloadAction?.id_action,
      timestamp: this.formatDateForTRAI(new Date(results.timestamp)),
      device_timestamp: this.formatDateForTRAI(now),
      utc_datetime: this.formatUTCDateForTRAI(new Date(results.timestamp)),
      local_datetime: this.formatDateForTRAI(new Date(results.timestamp)),
      startDate: this.formatDateForTRAI(new Date(results.timestamp)),
      download_time: this.formatDateForTRAI(new Date(results.timestamp)),
      url: server.url,
      targets: server.url,
      status: statusInfo.status,
      status_code: statusInfo.status_code,
      statusComment: statusInfo.statusComment,
      success_flag: statusInfo.success_flag,
      duration: Math.round(
        download.measurementDuration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      launchDuration: 0,
      warmup_duration: Math.round(
        download.warmupDuration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      warmup_bytes_transferred: download.warmupBytes,
      bytes_total: download.warmupBytes + download.measurementBytes,
      bytes_transferred: download.measurementBytes,
      testTraffic: download.warmupBytes + download.measurementBytes,
      deviceGlobalTraffic: 0,
      threads: download.threads.length,
      extension:
        downloadConfig?.extension ||
        TEST_CONFIG.DOWNLOAD.DEFAULT_FILE_EXTENSION,

      bytes_sec: Math.round(
        download.speed * API_CONFIG.CONVERSIONS.MBPS_TO_BYTES_PER_SEC
      ), // Convert Mbps to Bytes/sec

      location: {
        location_time: this.formatDateForTRAI(now),
      },
      network: {
        type: "wifi",
        techno: "WIFI",
        connected: true,
        available: true,
      },
      wifi: {
        ssid: "",
        enabled: true,
        bssid: "",
      },
      traces: this.generateTraces(locationData),
    };
  }

  private async formatUploadResult(
    results: TestResults,
    scenario: Scenario,
    server: Server,
    geoipData?: any
  ): Promise<any> {
    const upload = results.upload!;
    const uploadAction = scenario.actions.find(
      (action) => action.type === "UPLOAD_GENERATED"
    );
    const now = new Date();
    const locationData = await this.getLocationData(geoipData);

    // Calculate dynamic status fields
    const statusInfo = this.calculateUploadStatus(upload);

    return {
      action_id: uploadAction?.id_action,
      timestamp: this.formatDateForTRAI(new Date(results.timestamp)),
      device_timestamp: this.formatDateForTRAI(now),
      utc_datetime: this.formatUTCDateForTRAI(new Date(results.timestamp)),
      local_datetime: this.formatDateForTRAI(new Date(results.timestamp)),
      startDate: this.formatDateForTRAI(new Date(results.timestamp)),
      upload_time: this.formatDateForTRAI(new Date(results.timestamp)),
      url: server.url,
      targets: server.url,
      status: statusInfo.status,
      status_code: statusInfo.status_code,
      statusComment: statusInfo.statusComment,
      success_flag: statusInfo.success_flag,
      duration: Math.round(
        upload.measurementDuration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      launchDuration: 0,
      warmup_duration: Math.round(
        upload.warmupDuration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      warmup_bytes_transferred: upload.warmupBytes,
      bytes_total: upload.warmupBytes + upload.measurementBytes,
      bytes_transferred: upload.measurementBytes,
      testTraffic: upload.warmupBytes + upload.measurementBytes,
      deviceGlobalTraffic: 0,
      threads: upload.threads.length,
      extension: "",
      bytes_sec: Math.round(
        upload.speed * API_CONFIG.CONVERSIONS.MBPS_TO_BYTES_PER_SEC
      ),

      location: {
        location_time: this.formatDateForTRAI(now),
      },
      network: {
        type: "wifi",
        techno: "WIFI",
        connected: true,
        available: true,
      },
      wifi: {
        ssid: "",
        enabled: true,
        bssid: "",
      },
      traces: this.generateTraces(locationData),
    };
  }

  private async formatWebResult(
    results: TestResults,
    scenario: Scenario,
    server: Server,
    geoipData?: any
  ): Promise<any> {
    const web = results.web!;
    const webAction = scenario.actions.find((action) => action.type === "WEB");
    const now = new Date();
    const locationData = await this.getLocationData(geoipData);

    return {
      action_id: webAction?.id_action,
      timestamp: this.formatDateForTRAI(new Date(results.timestamp)),
      device_timestamp: this.formatDateForTRAI(now),
      utc_datetime: this.formatUTCDateForTRAI(new Date(results.timestamp)),
      local_datetime: this.formatDateForTRAI(new Date(results.timestamp)),
      startDate: this.formatDateForTRAI(new Date(results.timestamp)),
      web_time: this.formatDateForTRAI(new Date(results.timestamp)),
      url: web.url,
      targets: web.url,
      status: web.success ? "OK" : "ERROR",
      status_code: web.success ? "OK" : "ERROR",
      statusComment: web.error || `Load time: ${web.duration.toFixed(0)}ms`,
      success_flag: web.success,
      browsingDelay: Math.round(
        web.browsingDelay * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      duration: Math.round(
        web.duration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      launchDuration: Math.round(
        web.launchDuration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      warmup_duration: 0,
      warmup_bytes_transferred: 0,
      bytes_total: web.bytes_transferred,
      bytes_transferred: web.bytes_transferred,
      testTraffic: web.bytes_transferred,
      deviceGlobalTraffic: 0,
      threads: 0,
      extension: "",
      bytes_sec: web.bytes_sec,
      location: {
        location_time: this.formatDateForTRAI(now),
      },
      network: {
        type: "wifi",
        techno: "WIFI",
        connected: true,
        available: true,
      },
      wifi: {
        ssid: "",
        enabled: true,
        bssid: "",
      },
      traces: this.generateTraces(locationData),
    };
  }

  private async formatStreamingResult(
    results: TestResults,
    scenario: Scenario,
    server: Server,
    geoipData?: any
  ): Promise<any> {
    const streaming = results.streaming!;
    const streamingAction = scenario.actions.find(
      (action) => action.type === "STREAMING"
    );
    const now = new Date();
    const locationData = await this.getLocationData(geoipData);

    return {
      action_id: streamingAction?.id_action,
      timestamp: this.formatDateForTRAI(new Date(results.timestamp)),
      device_timestamp: this.formatDateForTRAI(now),
      utc_datetime: this.formatUTCDateForTRAI(new Date(results.timestamp)),
      local_datetime: this.formatDateForTRAI(new Date(results.timestamp)),
      startDate: this.formatDateForTRAI(new Date(results.timestamp)),
      hls_time: this.formatDateForTRAI(new Date(results.timestamp)),
      url: streaming.url,
      targets: streaming.url,
      status: streaming.success ? "OK" : "ERROR",
      status_code: streaming.success ? "OK" : "ERROR",
      statusComment:
        streaming.error || `Duration: ${streaming.duration.toFixed(2)}s`,
      success_flag: streaming.success,
      duration: Math.round(
        streaming.duration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      launchDuration: Math.round(
        streaming.videoStartTime * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      warmup_duration: 0,
      warmup_bytes_transferred: 0,
      bytes_total: streaming.totalBytesTransferred,
      bytes_transferred: streaming.totalBytesTransferred,
      testTraffic: streaming.totalBytesTransferred,
      deviceGlobalTraffic: 0,
      threads: 0,
      extension: TEST_CONFIG.STREAMING.FILE_EXTENSION,
      bytes_sec: streaming.bytes_sec,
      bufferedTime: Math.round(
        streaming.bufferedTime * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      lagCount: streaming.lagCount,
      lagDuration: Math.round(
        streaming.lagDuration * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      videoStartTime: Math.round(
        streaming.videoStartTime * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      rebufferingSum: Math.round(
        streaming.rebufferingSum * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      totalDelay: Math.round(
        streaming.totalDelay * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS
      ),
      location: {
        location_time: this.formatDateForTRAI(now),
      },
      network: {
        type: "wifi",
        techno: "WIFI",
        connected: true,
        available: true,
      },
      wifi: {
        ssid: "",
        enabled: true,
        bssid: "",
      },
      traces: this.generateTraces(locationData),
    };
  }
}
