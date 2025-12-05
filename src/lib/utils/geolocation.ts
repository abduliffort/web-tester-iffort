import { GeolocationInfo } from "../types/speed-test";
import { API_CONFIG, GEO_CONFIG } from "../constants";

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  fallbackToIp?: boolean;
}

export interface GeolocationResult {
  location: GeolocationInfo | null;
  source: "gps" | "ip" | "fallback";
  error?: string;
}

export interface LocationAndISPResult {
  source: "device" | "ipinfo";
  latitude: number | null;
  longitude: number | null;
  accuracy: string;
  address: string;
  isp: string;
  ip: string;
  city: string;
  region: string;
  country: string;
}

/**
 * Get user location using browser geolocation + ISP info from IPinfo
 * Uses device GPS first, falls back to IP-based location
 */
export async function getUserLocationAndISP(): Promise<LocationAndISPResult> {
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
    // console.log("📍 Device location found:", latitude, longitude, `±${Math.round(accuracy)}m`);

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

    return {
      source: "device",
      latitude,
      longitude,
      accuracy: `${Math.round(accuracy)} meters`,
      address: reverseData.display_name || "Address not available",
      isp:
        ipinfoData.asn?.name ||
        ipinfoData.company?.name ||
        ipinfoData.org ||
        "Unknown ISP",
      ip: ipinfoData.ip,
      city: ipinfoData.city,
      region: ipinfoData.region,
      country: ipinfoData.country,
    };
  } catch (error: any) {
    // console.warn(
    //   "⚠️ Device geolocation failed, falling back to IP-based lookup:",
    //   error.message
    // );

    // Fallback using IPinfo approximate data
    const ipinfoRes = await fetch(
      `https://ipinfo.io/json?token=f69fce66bd0d29`
    );
    const ipinfoData = await ipinfoRes.json();

    const [lat, lon] = (ipinfoData.loc || "").split(",");

    return {
      source: "ipinfo",
      latitude: parseFloat(lat) || null,
      longitude: parseFloat(lon) || null,
      accuracy: "approximate (IP-based)",
      address: `${ipinfoData.city}, ${ipinfoData.region}, ${ipinfoData.country}`,
      isp:
        ipinfoData.asn?.name ||
        ipinfoData.company?.name ||
        ipinfoData.org ||
        "Unknown ISP",
      ip: ipinfoData.ip,
      city: ipinfoData.city,
      region: ipinfoData.region,
      country: ipinfoData.country,
    };
  }
}

export class GeolocationService {
  private static cachedLocation: GeolocationInfo | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = API_CONFIG.TRAI.GPS_CACHE_MAX_AGE_MS;

  /**
   * Get device location with unified configuration
   * Uses caching to avoid multiple GPS prompts
   */
  static async getLocation(
    options: GeolocationOptions = {}
  ): Promise<GeolocationResult> {
    const config = {
      enableHighAccuracy: true,
      timeout: GEO_CONFIG.GPS.DEFAULT_GPS_TIMEOUT_MS,
      maximumAge: this.CACHE_DURATION,
      fallbackToIp: false,
      ...options,
    };

    // Check cache first
    if (this.isCacheValid()) {
      // console.log("Using cached GPS location");
      return {
        location: this.cachedLocation,
        source: "gps",
      };
    }

    // Try GPS location
    try {
      const location = await this.getGPSLocation(config);
      this.cacheLocation(location);
      // console.log("GPS location obtained:", location);
      return {
        location,
        source: "gps",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown GPS error";
      // console.warn("GPS location failed:", errorMessage);

      // Fallback to IP-based location if enabled
      if (config.fallbackToIp) {
        // console.log("Attempting IP-based location fallback");
        // This would be implemented if IP geolocation service is available
        // For now, just return null with error
      }

      return {
        location: null,
        source: "fallback",
        error: errorMessage,
      };
    }
  }

  /**
   * Get GPS location from device
   */
  private static async getGPSLocation(
    config: GeolocationOptions
  ): Promise<GeolocationInfo> {
    if (!("geolocation" in navigator)) {
      throw new Error("Geolocation is not supported by this browser");
    }

    return new Promise<GeolocationInfo>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Geolocation timeout after ${config.timeout}ms`));
      }, config.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          let errorMessage = "Unknown geolocation error";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Geolocation permission denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Geolocation position unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Geolocation request timeout";
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: config.enableHighAccuracy,
          timeout: config.timeout,
          maximumAge: config.maximumAge,
        }
      );
    });
  }

  /**
   * Quick permission check without requesting location
   */
  static async checkPermission(): Promise<
    "granted" | "denied" | "prompt" | "unknown"
  > {
    if (!("geolocation" in navigator)) {
      return "unknown";
    }

    if ("permissions" in navigator) {
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        return permission.state;
      } catch {
        // Fallback to unknown if permission API fails
      }
    }

    return "unknown";
  }

  /**
   * Request permission explicitly (shows browser prompt)
   */
  static async requestPermission(): Promise<GeolocationResult> {
    // console.log("Requesting geolocation permission...");

    const result = await this.getLocation({
      enableHighAccuracy: false,
      timeout: GEO_CONFIG.GPS.GPS_PERMISSION_TIMEOUT_MS,
      maximumAge: 0,
    });

    if (result.location) {
      // console.log("Geolocation permission granted");
    } else {
      // console.log("Geolocation permission denied or failed");
    }

    return result;
  }

  /**
   * Clear cached location (force fresh GPS request)
   */
  static clearCache(): void {
    this.cachedLocation = null;
    this.cacheTimestamp = 0;
    // console.log("Geolocation cache cleared");
  }

  /**
   * Get cached location without GPS request
   */
  static getCachedLocation(): GeolocationInfo | null {
    return this.isCacheValid() ? this.cachedLocation : null;
  }

  /**
   * Check if browser supports geolocation
   */
  static isSupported(): boolean {
    return "geolocation" in navigator;
  }

  // Private helper methods
  private static isCacheValid(): boolean {
    if (!this.cachedLocation) return false;

    const age = Date.now() - this.cacheTimestamp;
    return age < this.CACHE_DURATION;
  }

  private static cacheLocation(location: GeolocationInfo): void {
    this.cachedLocation = location;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Standardized location with fallback logic
   * Priority: GPS > GeoIP > Default (0.00, 0.00)
   */
  static getStandardizedLocation(
    gpsLocation: GeolocationInfo | null,
    geoipLocation?: { latitude: number; longitude: number }
  ): { latitude: number; longitude: number; accuracy: number; source: string } {
    // Priority 1: GPS location
    if (gpsLocation) {
      return {
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
        source: "GPS",
      };
    }

    // Priority 2: GeoIP location
    if (geoipLocation && geoipLocation.latitude && geoipLocation.longitude) {
      return {
        latitude: geoipLocation.latitude,
        longitude: geoipLocation.longitude,
        accuracy: GEO_CONFIG.GPS.IP_LOCATION_ACCURACY_METERS, // Approximate accuracy for IP-based location
        source: "GeoIP",
      };
    }

    // Priority 3: Default fallback
    return {
      latitude: 0.0,
      longitude: 0.0,
      accuracy: 0,
      source: "Default",
    };
  }
}
