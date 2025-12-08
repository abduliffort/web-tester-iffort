/**
 * Production-ready constants for TRAI WebTester
 * All hardcoded values centralized for easy configuration
 */

// Test Configuration Constants
export const TEST_CONFIG = {
  // Download Test
  DOWNLOAD: {
    DEFAULT_FILENAME: "1000000000", // 1GB file
    DEFAULT_FILE_EXTENSION: ".file",
    DEFAULT_RESOURCE_PATH: "/dl/",
    DEFAULT_TIMEOUT_S: 30000, // 30 seconds safety timeout
    DEFAULT_REQUEST_TIMEOUT_S: 15000, // 15 seconds per request
    GRACE_PERIOD_MS: 5000, // 5 seconds grace period for ongoing chunks
    DEFAULT_THREADS: 4,
    DEFAULT_WARMUP_DURATION_S: 2,
    DEFAULT_MEASUREMENT_DURATION_S: 5,
  },

  // Upload Test
  UPLOAD: {
    DEFAULT_CHUNK_SIZE: 1000000, // 1MB chunks
    DEFAULT_TIMEOUT_S: 30000,
    DEFAULT_REQUEST_TIMEOUT_S: 15000,
    GRACE_PERIOD_MS: 5000,
    DEFAULT_THREADS: 4,
    DEFAULT_WARMUP_DURATION_S: 2,
    DEFAULT_MEASUREMENT_DURATION_S: 5,
    THEORETICAL_MAX_MBPS: 50, // Theoretical maximum upload speed
    CRYPTO_CHUNK_SIZE: 65536, // 64KB chunks for crypto random data
    DEFAULT_ENDPOINT: "/ul/upload.php", // Default upload endpoint
  },

  // Latency Test
  LATENCY: {
    DEFAULT_PACKET_COUNT: 200,
    DEFAULT_SEND_DURATION_S: 3,
    DEFAULT_TOTAL_DURATION_S: 5,
    DEFAULT_TIMEOUT_S: 2,
    DEFAULT_DELAY_TIMEOUT_S: 2,
    DEFAULT_PACKET_SIZE: 160,
    PACKET_SEND_INTERVAL_MS: 15, // 15ms between packets
    WEBRTC_TIMEOUT_MS: 10000, // 10s for WebRTC connection
    WEBSOCKET_FALLBACK_DELAY_MS: 5000,
    DEFAULT_WEBSOCKET_PORT: 8443,
    WEBSOCKET_PROTOCOL: "wss://",
    FALLBACK_WEBSOCKET_SERVER: "wss://jio-test-server.mozark.ai:8443",
    FALLBACK_STUN1: "stun:stun.l.google.com:19302",
    FALLBACK_STUN2: "stun:stun1.l.google.com:19302",
    TRAI_STUN1: "stun:35.207.244.56:3478",
    // WebSocket Protocol Constants
    WEBSOCKET_MIN_PACKET_SIZE: 20, // Minimum packet size for parsing
    WEBSOCKET_MARKER: 0x57535049, // 'WSPI' binary marker
    SAMPLE_DISPLAY_LIMIT: 10, // Number of latency samples to display
    // WebRTC Binary Format Offsets
    WEBRTC_SEQUENCE_OFFSET: 0,
    WEBRTC_TIMESTAMP_OFFSET: 8,
    WEBRTC_MARKER_OFFSET: 16,
    WEBRTC_PAYLOAD_OFFSET: 20,
    // Progress Constants
    PROGRESS: {
      CONNECTION_ESTABLISHED: 5, // WebRTC connection established (5%)
      SENDING_START: 5, // Start of sending phase (5%)
      SENDING_END_WEBRTC: 65, // End of sending phase WebRTC (65%)
      SENDING_END_WEBSOCKET: 60, // End of sending phase WebSocket (60%)
      RECEIVING_RANGE_WEBRTC: 35, // Receiving phase range WebRTC (35%)
      RECEIVING_RANGE_WEBSOCKET: 40, // Receiving phase range WebSocket (40%)
      COMPLETE: 100, // Test complete (100%)
    },
  },

  // Web Test
  WEB: {
    DEFAULT_TIMEOUT_S: 10,
    CONTAINER_RETRY_COUNT: 20,
    CONTAINER_RETRY_DELAY_MS: 100,
    LOADING_DELAY_MS: 200,
    SUCCESS_DISPLAY_DELAY_MS: 1000,
    SUCCESS_DURATION_MS: 2000,
    ERROR_DISPLAY_DURATION_MS: 3000,
    CORS_FALLBACK_BYTES: 50000, // 50KB
    SOURCE_SET_DELAY_MS: 100,
    RESOURCE_ESTIMATION_MULTIPLIER: 0.5, // Additional resources estimation factor
  },

  // Streaming Test
  STREAMING: {
    DEFAULT_TIMEOUT_S: 30,
    DEFAULT_CONTAINER_HEIGHT: "400px",
    DEFAULT_CONTAINER_MIN_HEIGHT: "300px",
    LAG_DETECTION_THRESHOLD_S: 0.5,
    LAG_DETECTION_INTERVAL_MS: 500,
    PROGRESS_UPDATE_INTERVAL_MS: 500,
    UI_UPDATE_DELAY_MS: 100,
    DEFAULT_RESOURCE: "/videos/Mozark-30s-720p.m3u8",
    LAG_RATIO_THRESHOLD: 0.5, // 50% lag ratio threshold for success determination
    FILE_EXTENSION: "m3u8", // HLS file extension
  },
} as const;

// API Configuration Constants
export const API_CONFIG = {
  // HTTP Status Codes
  STATUS_CODES: {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
  },

  // Request Configuration
  REQUESTS: {
    DEFAULT_TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
  },

  // TRAI Submission
  TRAI: {
    DEFAULT_SCENARIO_ID: 1447,
    SUBMISSION_CATEGORY: "Full Test" as const,
    DEFAULT_VERSION: "1.0",
    DEFAULT_LOCATION_TYPE: "INDOOR" as const,
    DEFAULT_BATTERY_LEVEL: -1,
    DEVICE_GLOBAL_TRAFFIC_MULTIPLIER: 1.1,
    // Duration constants in microseconds
    DEFAULT_DURATION_MICROSECONDS: 5000000, // 5 seconds
    LATENCY_LAUNCH_DURATION_MICROSECONDS: 500000, // 0.5s
    DOWNLOAD_LAUNCH_DURATION_MICROSECONDS: 100000, // 0.1s
    UPLOAD_LAUNCH_DURATION_MICROSECONDS: 1000000, // 1s
    GPS_CACHE_MAX_AGE_MS: 300000, // 5 minutes
  },

  // Mathematical Conversion Constants
  CONVERSIONS: {
    // Time conversions
    MS_TO_SECONDS: 1000,
    SECONDS_TO_MS: 1000,
    MICROSECONDS_TO_MS: 1000,
    MS_TO_MICROSECONDS: 1000,
    SECONDS_TO_MICROSECONDS: 1000000,
    MINUTES_TO_MS: 60000, // 60 * 1000 - Convert minutes to milliseconds
    // Data conversions
    BITS_TO_BYTES: 8,
    BYTES_TO_BITS: 8,
    MBPS_TO_BYTES_PER_SEC: 125000, // 1000000 / 8 - Convert Mbps to Bytes/sec
    BYTES_TO_MBPS_MULTIPLIER: 1000000, // Convert bytes to megabits
    KB_TO_BYTES: 1024,
    MB_TO_BYTES: 1024 * 1024,
    GB_TO_BYTES: 1024 * 1024 * 1024,
    BYTES_TO_MB: 1024 * 1024,
    BYTES_TO_KB: 1024,
    // Number base conversions
    STRING_BASE_36: 36,
    STRING_BASE_10: 10,
    STRING_BASE_16: 16,
  },
} as const;

// UI Constants
export const UI_CONFIG = {
  // Colors (for consistent theming)
  COLORS: {
    PRIMARY: "#8B5CF6",
    SUCCESS: "#10B981",
    ERROR: "#EF4444",
    WARNING: "#F59E0B",
    INFO: "#3B82F6",
  },

  // Progress and Animation
  PROGRESS: {
    UPDATE_INTERVAL_MS: 100,
    ANIMATION_DURATION_MS: 300,
    DEBOUNCE_MS: 250,
  },

  // Dimensions
  DIMENSIONS: {
    MIN_CONTAINER_HEIGHT: "300px",
    MAX_CONTAINER_HEIGHT: "400px",
    BORDER_RADIUS: "8px",
  },
} as const;

// Network Configuration
export const NETWORK_CONFIG = {
  HTTP_PING_TIMEOUT_MS: 5000,
  SERVER_PING_TIMEOUT_MS: 3000,
  SERVER_LATENCY_TIMEOUT_MS: 2000,
  ERROR_RETRY_DELAY_MS: 100,
  MAX_TEST_DURATION_SECONDS: 30,
  HIGH_LATENCY_VALUE_MS: 9999,
  TRACE_END_TIME_OFFSET_MS: 31000,
  MAX_REASONABLE_PACKET_LOSS_PERCENT: 100,
  // Connection Types
  CONNECTION_TYPES: {
    WIFI: "wifi" as const,
    ETHERNET: "ethernet" as const,
    CELLULAR: "cellular" as const,
    UNKNOWN: "unknown" as const,
  },

  // Technology Types
  TECH_TYPES: {
    WIFI: "WIFI" as const,
    ETHERNET: "ETHERNET" as const,
    UNKNOWN: "UNKNOWN" as const,
  },

  // HLS Configuration - Optimized for cache-disabled streaming tests
  HLS: {
    ENABLE_WORKER: true,
    LOW_LATENCY_MODE: true,
    BACK_BUFFER_LENGTH: 0, // Disable back buffer to prevent .ts segment caching
    MAX_BUFFER_LENGTH: 5, // Minimal buffer to force frequent segment requests
    MAX_MAX_BUFFER_LENGTH: 10, // Limit maximum buffer accumulation
    START_LEVEL: -1, // Auto-select
    AUTO_START_LOAD: true,
    START_POSITION: 0,
    LIVE_SYNC_DURATION_COUNT: 3,
    LIVE_MAX_LATENCY_DURATION_COUNT: 5,
    MAX_BUFFER_SIZE: 10 * 1000 * 1000, // Reduced to 10MB to prevent caching
    MAX_BUFFER_HOLE: 0.5,
    HIGH_BUFFER_WATCHDOG_PERIOD: 2,
    NUDGE_OFFSET: 0.1,
    NUDGE_MAX_RETRY: 3,
    MAX_FRAG_LOOKUP_TOLERANCE: 0.25,
    LIVE_DURATION_INFINITY: false,
    ENABLE_CEA708_CAPTIONS: false,
    ENABLE_WEBVTT: false,
  },
} as const;

// Geolocation Configuration
export const GEO_CONFIG = {
  OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
  },
  FALLBACK_ACCURACY: "0",
  PROVIDERS: {
    GPS: "gps" as const,
    GEOIP: "geoip" as const,
  },
  GPS: {
    DEFAULT_GPS_TIMEOUT_MS: 10000,
    GPS_PERMISSION_TIMEOUT_MS: 5000,
    IP_LOCATION_ACCURACY_METERS: 1000,
    PERMISSION_CHECK_TIMEOUT_MS: 2000,
  },
} as const;

// Environment Configuration
export const ENV_CONFIG = {
  // Development vs Production
  NODE_ENV: process.env.NODE_ENV || "development",

  // Feature Flags
  FEATURES: {
    ENABLE_SUBMISSION: process.env.NEXT_PUBLIC_ENABLE_SUBMISSION !== "false",
    ENABLE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_LOGGING !== "false",
    ENABLE_WEBRTC: process.env.NEXT_PUBLIC_ENABLE_WEBRTC !== "false",
    ENABLE_GPS: process.env.NEXT_PUBLIC_ENABLE_GPS !== "false",
  },

  // URLs and Endpoints
  API: {
    BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || "https://dev-traiapi.mozark.ai",
    AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || "",
    SCENARIOS_URL: process.env.NEXT_PUBLIC_SCENARIOS_URL || "",
    SERVERS_URL:
      process.env.NEXT_PUBLIC_SERVERS_URL ||
      "https://trai-test-server.mozark.ai",
    GEOIP_URL: process.env.NEXT_PUBLIC_GEOIP_URL || "",
    SUBMISSION_URL: process.env.NEXT_PUBLIC_SUBMISSION_URL || "",
    DEFAULT_HOST: process.env.NEXT_PUBLIC_DEFAULT_HOST || "https://qosi-5g.fr",
  },

  // Development Configuration
  DEV: {
    DEFAULT_SCENARIO_ID: 1450,
    HTTPS_SERVER_PORT: 3001,
    FALLBACK_SERVER_IP: "35.207.244.56",
  },
  SCENARIOS: {
    QUICK_TEST_ID: 1444, // DataTestWeb - Latency + Download + Upload
    FULL_TEST_ID: 1475, // FullTest Scenario-Webtester (All tests including Web Browsing)
    CONTINUOUS_TEST_ID: 9999, // Special ID for Continuous Test page (not a real scenario)
  },
} as const;

// Protocol Constants
export const PROTOCOL_CONFIG = {
  UUID_BIT_MASK_1: 0x3,
  UUID_BIT_MASK_2: 0x8,
  SIGNATURE_DISPLAY_LENGTH: 10,
  UUID_BASE: 16,
  RANDOM_STRING_BASE: 36,
} as const;

// URLs and Endpoints
export const URLS = {
  FALLBACK_API_URL: "https://dev-traiapi.mozark.ai",
  DEFAULT_TRAI_API_URL: "https://api.myspeed.trai.gov.in",
  FALLBACK_SERVER_URL: "https://trai-test-server.mozark.ai/",
  WEB_TEST_URLS: [
    "https://www.wikipedia.org",
    "https://test.5gmark.com/kepler/",
    "https://httpbin.org/html",
  ],
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  DEFAULT_PUBLIC_KEY: "TRAICROWD",
  UUID_WEB_SUFFIX: "-WEB",
  DEFAULT_APP_VERSION: "1.0",
};

// Server Configuration
export const SERVER_CONFIG = {
  FALLBACK_SERVER: {
    id: 1000,
    name: "stable-test-server",
    ip: "34.93.140.60",
    port: "5000",
    url: "https://trai-test-server.mozark.ai/",
    video: 0,
    websocket_port: "8443",
  },
} as const;

// Export all constants as a single object for easy importing
export const CONSTANTS = {
  TEST: TEST_CONFIG,
  API: API_CONFIG,
  UI: UI_CONFIG,
  NETWORK: NETWORK_CONFIG,
  GEO: GEO_CONFIG,
  ENV: ENV_CONFIG,
  PROTOCOL: PROTOCOL_CONFIG,
  URLS: URLS,
  AUTH: AUTH_CONFIG,
  SERVER: SERVER_CONFIG,
};

// Validation Constants
export const VALIDATION_CONFIG = {
  HTTP_SUCCESS_CODE: 200,
  HTTP_UNAUTHORIZED: 401,
  USER_AGENT_TRUNCATE_LENGTH: 50,
} as const;

// Cache Busting Configuration
export const CACHE_CONFIG = {
  // URL parameter names for cache busting
  URL_PARAM_TS_PREFIX: "_ts_nb", // For .ts video segments
  URL_PARAM_CACHE_PREFIX: "_nb", // For general cache busting
  URL_PARAM_WEB_PREFIX: "bustcache", // For web page cache busting
  CACHE_BUST_SUBSTRING_START: 2,
} as const;

// Performance and Memory Management
export const PERFORMANCE_CONFIG = {
  // Load checking intervals
  LOAD_CHECK_INTERVAL_MS: 100,
  LOAD_COMPLETION_TIMEOUT_MS: 15000,

  // Rate calculation precision
  RATE_CALCULATION_PRECISION: 1, // toFixed(1)

  // Memory pressure generation for cache clearing
  MEMORY_PRESSURE_ITERATIONS: 5,
  MEMORY_PRESSURE_ARRAY_SIZE_SMALL: 50000,
  MEMORY_PRESSURE_ARRAY_SIZE_LARGE: 100000,
  MEMORY_PRESSURE_WEB_ITERATIONS: 10,
} as const;

// Display and Formatting
export const DISPLAY_CONFIG = {
  // Precision for numeric displays
  SPEED_DISPLAY_PRECISION: 0, // Math.round for speeds
  TIME_DISPLAY_PRECISION: 2, // toFixed(2) for durations
  LATENCY_DISPLAY_PRECISION: 1, // toFixed(1) for latency
} as const;

// Type exports for better TypeScript support
export type TestConfig = typeof TEST_CONFIG;
export type ApiConfig = typeof API_CONFIG;
export type UiConfig = typeof UI_CONFIG;
export type NetworkConfig = typeof NETWORK_CONFIG;
export type GeoConfig = typeof GEO_CONFIG;
export type EnvConfig = typeof ENV_CONFIG;
export type ProtocolConfig = typeof PROTOCOL_CONFIG;
export type UrlsConfig = typeof URLS;
export type AuthConfig = typeof AUTH_CONFIG;
export type ValidationConfig = typeof VALIDATION_CONFIG;
export type CacheConfig = typeof CACHE_CONFIG;
export type PerformanceConfig = typeof PERFORMANCE_CONFIG;
export type DisplayConfig = typeof DISPLAY_CONFIG;
