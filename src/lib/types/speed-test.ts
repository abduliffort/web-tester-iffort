export interface TestConfiguration {
  downloadConfig: {
    duration: number;           // 7 seconds (2s warmup + 5s measurement)
    connections: number;        // 4 concurrent threads
    fileSize: number;          // 1MB per request
    warmupDuration: number;    // 2 seconds
    measurementDuration: number; // 5 seconds
    timeout: number;           // 30 seconds safety timeout
  };
  uploadConfig: {
    duration: number;           // 7 seconds (2s warmup + 5s measurement)
    connections: number;        // 4 concurrent threads
    chunkSize: number;         // 8KB chunks
    warmupDuration: number;    // 2 seconds
    measurementDuration: number; // 5 seconds
    timeout: number;           // 30 seconds safety timeout
  };
  latencyConfig: {
    totalDuration: number;      // 5 seconds
    packetCount: number;        // 200 packets
    sendDuration: number;       // 3 seconds
    timeout: number;           // 2 seconds
  };
  servers: ServerEndpoint[];
}

export interface ServerEndpoint {
  id: string;
  name: string;
  location: string;
  downloadUrl: string;        // Base URL for download tests
  uploadUrl: string;          // Upload endpoint
  websocketUrl: string;       // WebSocket endpoint for latency
  priority: number;           // Selection priority
}

// Authentication types
export interface AuthRequest {
  uuid: string;
  type: string;
  os_version: string;
  brand: string;
  user_agent: string;
  device: string;
  product: string;
  model: string;
}

export interface AuthResponse {
  meta: {
    code: number;
  };
  content: {
    uuid: string;
    os: string;
    token: string;
    is_team_authenticated: boolean;
    is_app_authenticated: boolean;
    server_choice_policy: string;
    password: string;
    salt: string;
  };
}

export interface GeoIpResponse {
  meta: {
    code: number;
  };
  content: {
    ip: string;
    data: {
      country_code_iso3166alpha2: string;
      country_name: string;
      region_name: string;
      city: string;
      postal_code: string;
      latitude: number;
      longitude: number;
      isp: string;
    };
  };
}

export interface Server {
  id: number;
  name: string;
  ip: string;
  port: string;
  url: string;
  video: number;
  websocket_port?: string;
}

export interface ServersResponse {
  meta: {
    code: number;
  };
  content: Server[];
}

// Scenario API types
export interface ScenarioResponse {
  meta: {
    code: number;
  };
  content: Scenario[];
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  type: string;
  test_type: string;
  actions: ScenarioAction[];
  configuration: ScenarioConfiguration;
}

export interface ScenarioAction {
  type: 'LATENCY' | 'DOWNLOAD' | 'UPLOAD_GENERATED' | 'STREAMING' | 'WEB';
  resource: string;
  id_action: number;
  cfg: ActionConfig[];
}

export interface ActionConfig {
  id_configuration: number;
  techno: string;
  timeout: number;
  threads: number;
  uri: string;
  host: string;
  port: string;
  filename?: string;
  extension?: string;
  file_size: number;
  warmup_maxtime: string;
  transfer_maxtime: string;
  datagrams?: string;
  max_time?: string;
  inter_packet_time?: string;
  delay_timeout?: string;
  server_type?: string;
  count: number;
  is_default: boolean;
}

export interface ScenarioConfiguration {
  id: number;
  name: string;
  launch_mode: {
    type: string;
    loop_count: number;
    loop_delay: number;
  };
}

export interface TestResults {
  latency?: LatencyResults;
  download?: SpeedResults;
  upload?: SpeedResults;
  web?: WebTestResult; // Single web test (backward compatibility)
  // Dynamic web test fields (web1, web2, web3, etc.)
  [key: `web${number}`]: WebTestResult;
  streaming?: StreamingTestResult;
  environment: EnvironmentInfo;
  timestamp: number;
  scenario?: Scenario;
  server?: Server;
  cycleId?: string; // Cycle ID from backend (id_qscycle)
  masterId?: number; // Master ID from /masterid endpoint
  masterUuid?: string; // UUID from /masterid endpoint
}

export interface WebTestResult {
  url: string;
  duration: number; // Total test duration in ms
  browsingDelay: number; // Time to load webpage (0 if page not loaded)
  bytes_total: number; // Total bytes transferred (same as bytesTransferred)
  testTraffic: number; // Total bytes transferred (same as bytesTransferred)
  bytes_transferred: number; // Total bytes transferred (same as bytesTransferred)
  launchDuration: number; // Time to start the test in milliseconds
  bytes_sec: number; // bytes_transferred/duration in bytes per second
  success: boolean;
  error?: string;
}

export interface WebTestSummary {
  averageBrowsingDelay: number; // Average browsing delay across all URLs
  totalUrls: number; // Total number of URLs tested
  successfulUrls: number; // Number of successfully loaded URLs
  failedUrls: number; // Number of failed URLs
  individualResults: WebTestResult[]; // Results for each URL for display
}

export interface StreamingTestResult {
  url: string;                   // Streaming URL tested
  duration: number;              // Total test duration in ms
  videoStartTime: number;        // Initial buffering time (ms) - time from play() to first frame
  lagCount: number;              // Number of rebuffering events (count)
  lagDuration: number;           // Total rebuffering duration (ms) - cumulative stall time
  totalDelay: number;            // Total delay (ms) - videoStartTime + lagDuration
  bufferedTime: number;          // Total buffered time (ms) - same as lagDuration + videoStartTime
  rebufferingSum: number;        // Sum of all rebuffering events (ms) - same as lagDuration
  totalBytesTransferred: number; // Total bytes downloaded for video stream
  bytes_sec: number;             // bytes_transferred/duration in bytes per second
  success: boolean;              // Test completion status
  error?: string;                // Error message if failed
}

export interface LatencyResults {
  average: number;            // Average RTT in ms
  averageUnit: string;        // "ms"
  min: number;               // Minimum RTT in ms
  max: number;               // Maximum RTT in ms
  jitter: number;            // Packet Delay Variation in ms
  packetLoss: number;        // Percentage (0-100)
  packetsSent: number;       // Total packets sent
  packetsReceived: number;   // Packets successfully received
  rawLatencies: number[];    // All individual RTT measurements
  duration: number;          // Average RTT in microseconds for TRAI submission
}

export interface SpeedResults {
  speed: number;              // Speed in Mbps
  speedUnit: string;          // "Mbps"
  bytes: number;              // Total bytes transferred
  duration: number;           // Actual test duration in ms
  threads: ThreadResult[];    // Individual thread results
  warmupDuration: number;     // Warmup duration in ms
  warmupBytes: number;        // Bytes transferred during warmup
  totalBytes: number;         // Total bytes transferred (same as bytes)
  measurementBytes: number;   // Bytes transferred during measurement phase
  measurementDuration: number;// Actual measurement phase duration in ms
}

export interface ThreadResult {
  threadId: number;
  speed: number;             // Thread speed in Mbps
  bytes: number;             // Bytes transferred by this thread
  duration: number;          // Thread duration
  requests: number;          // Number of requests made
  errors: number;            // Number of errors encountered
  warmupBytes: number;       // Bytes transferred during warmup phase
  measurementBytes: number;  // Bytes transferred during measurement phase
  warmupDuration: number;    // Actual warmup duration in ms
  measurementDuration: number; // Actual measurement duration in ms
}

export interface EnvironmentInfo {
  userAgent: string;
  connection: NetworkInformation | null;
  geolocation: GeolocationInfo | null;
  isp: GeoIpResponse['content']['data'] | null;
  timestamp: number;
}

export interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface GeolocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ISPInfo {
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  org: string;
  timezone: string;
}

export type TestStep = 'environment' | 'authentication' | 'server-selection' | 'download' | 'upload' | 'latency' | 'web';

export interface TestProgress {
  step: TestStep;
  progress: number;
  message?: string;
}

// TRAI Web Tester Submission Types (adapted for browser environment)
export interface TRAIWebSubmissionCycle {
  cycle: {
    sim: {
      mccmnc: "null"; // Web tester doesn't have SIM access
      sim_mobile_network_code: "null";
      countryCode: "";
      sim_mobile_country_code: "null";
      provider: string; // ISP from GeoIP
    };
    token: string;
    device: {
      batteryLevel: -1; // Web API doesn't provide reliable battery info
    };
    scenario_id: number;
    user: {
      locationType: 'INDOOR' | 'OUTDOOR' | 'IN-VEHICLE';
    };
    submission_category: 'Full Test';
    server_id: number;
    version: string;
    contact: {
      encrypted_data: "";
      nonce: "";
      tag: "";
    };
    date: string; // ISO-8601 format
    tests: TRAIWebTestResult[];
  };
}

export interface TRAIWebTestResult {
  // Common fields
  action_id: number;
  timestamp: string; // ISO-8601 format
  device_timestamp: string; // ISO-8601 format
  utc_datetime: string; // ISO-8601 format
  local_datetime: string; // ISO-8601 format
  startDate: string; // ISO-8601 format
  url: string;
  targets: string;
  status: 'OK' | 'ERROR';
  status_code: 'OK' | 'ERROR';
  statusComment: string;
  success_flag: boolean;
  duration: number; // microseconds
  launchDuration: number; // microseconds
  warmup_duration: number; // microseconds
  warmup_bytes_transferred: number;
  bytes_total: number;
  bytes_transferred: number;
  testTraffic: number;
  deviceGlobalTraffic: number; // Estimated based on test traffic
  threads: number;
  extension: string;
  
  // Speed test specific (Download/Upload)
  bytes_sec?: number;
  download_time?: string; // ISO-8601 format
  upload_time?: string; // ISO-8601 format
  hls_time?: string; // For future streaming tests
  web_time?: string; // For web browsing tests
  
  // Latency test specific
  jitter?: number; // microseconds (convert from ms)
  packets_received?: number;
  packets_sent?: number;
  round_trip_time?: number; // microseconds (convert from ms)
  packet_loss?: string; // percentage as string
  packet_size?: number;
  
  // Web-appropriate network and location info
  location: {
    location_time: string; // ISO-8601 format
  };
  network: {
    type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
    techno: 'WIFI' | 'ETHERNET' | 'UNKNOWN'; // Web can't detect cellular specifics
    connected: boolean;
    available: boolean;
  };
  cellular: {
    lac: 0; // Web tester defaults
    cid: 0;
    network_generation: 'WIFI' | 'UNKNOWN';
    net_mobile_country_code: string;
    network_subtype: 'WIFI' | 'UNKNOWN';
    spectrum_bandwidth: "";
    connection_type: 'wifi' | 'ethernet' | 'unknown';
    mccmnc: string;
    net_mobile_network_code: string;
  };
  wifi: {
    ssid: ""; // Web API doesn't provide SSID access
    enabled: boolean;
    bssid: ""; // Web API doesn't provide BSSID access
  };
  
  // Simplified traces for web environment
  traces: TRAIWebTrace[];
}

export interface TRAIWebTrace {
  tag: number;
  event: 'FIRST' | 'LAST' | '';
  device_timestamp: string; // ISO-8601 format
  date: string; // ISO-8601 format
  location: {
    location_time: string;
  };
  network: {
    deviceGlobalULTraffic?: number; // Estimated
    deviceGlobalDLTraffic?: number; // Estimated
    currentTestTraffic?: number;
    connected: boolean;
    available: boolean;
    techno: 'WIFI' | 'ETHERNET' | 'UNKNOWN';
  };
  cellular: {
    network_generation: 'WIFI' | 'UNKNOWN';
    net_mobile_country_code: string;
    cid: 0;
    lac: 0;
    cell_network_time: string; // ISO-8601 format
    mccmnc: string;
    network_subtype: 'WIFI' | 'UNKNOWN';
    net_mobile_network_code: string;
  };
  wifi: {
    enabled: boolean;
    bssid: "";
    ssid: "";
  };
  streaming: {
    quality: "";
    state: "";
  };
}