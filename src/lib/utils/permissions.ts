import { GeolocationService } from "./geolocation";
import { GEO_CONFIG } from "../constants";

interface PermissionStatus {
  granted: boolean;
  message: string;
}

interface SystemPermissions {
  geolocation: PermissionStatus;
  networkAccess: PermissionStatus;
  isHttps: PermissionStatus;
}

interface NetworkConnection {
  connection?: {
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  mozConnection?: {
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  webkitConnection?: {
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
}

export class PermissionChecker {
  static async checkAllPermissions(): Promise<SystemPermissions> {
    const permissions: SystemPermissions = {
      geolocation: await this.checkGeolocation(),
      networkAccess: this.checkNetworkAccess(),
      isHttps: this.checkHttps(),
    };

    return permissions;
  }

  private static async checkGeolocation(): Promise<PermissionStatus> {
    if (!GeolocationService.isSupported()) {
      return {
        granted: false,
        message: "Geolocation is not supported by this browser",
      };
    }

    try {
      // Use unified permission checking
      const permissionState = await GeolocationService.checkPermission();

      if (permissionState === "granted") {
        return {
          granted: true,
          message: "Geolocation permission granted",
        };
      }

      if (permissionState === "denied") {
        return {
          granted: false,
          message:
            "Geolocation permission denied. Please enable location access in your browser settings.",
        };
      }

      // For 'prompt' or 'unknown' states, try a quick location request
      const result = await GeolocationService.getLocation({
        enableHighAccuracy: false,
        timeout: GEO_CONFIG.GPS.PERMISSION_CHECK_TIMEOUT_MS,
        maximumAge: 0,
      });

      if (result.location) {
        return {
          granted: true,
          message: "Geolocation permission granted",
        };
      } else {
        return {
          granted: false,
          message:
            result.error ||
            "Geolocation not available. This may affect result mapping.",
        };
      }
    } catch {
      return {
        granted: false,
        message: "Unable to check geolocation permission",
      };
    }
  }

  private static checkNetworkAccess(): PermissionStatus {
    // Check if we can make network requests (basic fetch API availability)
    if (typeof fetch === "undefined") {
      return {
        granted: false,
        message: "Network access APIs not available",
      };
    }

    // Check if we're in a secure context for full API access
    if (!window.isSecureContext) {
      return {
        granted: false,
        message:
          "Secure context required for full network testing capabilities",
      };
    }

    return {
      granted: true,
      message: "Network access available for performance testing",
    };
  }

  private static checkHttps(): PermissionStatus {
    const isHttps =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";

    return {
      granted: isHttps,
      message: isHttps
        ? "Secure HTTPS connection established"
        : "HTTPS connection required for secure speed testing",
    };
  }

  static async requestGeolocationPermission(): Promise<PermissionStatus> {
    // console.log('=== GEOLOCATION PERMISSION REQUEST ===');

    if (!GeolocationService.isSupported()) {
      // console.log('Geolocation API not available in this browser');
      // console.log('=== END GEOLOCATION REQUEST ===');
      return {
        granted: false,
        message: "Geolocation not supported by this browser",
      };
    }

    // console.log('Requesting geolocation permission...');

    // Use unified geolocation service for permission request
    const result = await GeolocationService.requestPermission();

    // console.log('Permission result:', result);
    // console.log('=== END GEOLOCATION REQUEST ===');

    return {
      granted: !!result.location,
      message: result.error || "Location access enabled successfully",
    };
  }

  static getNetworkType(): string {
    // console.log("=== NETWORK TYPE DETECTION ===");
    const navWithConnection = navigator as Navigator & NetworkConnection;
    const connection =
      navWithConnection.connection ||
      navWithConnection.mozConnection ||
      navWithConnection.webkitConnection;

    // console.log('Navigator connection object:', connection);
    // console.log('Connection available:', !!connection);

    if (!connection) {
      // console.log('No connection API available, using fallback detection');
      // Try to detect mobile device for fallback
      const userAgent = navigator.userAgent;
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      // console.log('User Agent:', userAgent);
      // console.log('Is Mobile Device:', isMobile);
      if (isMobile) {
        // console.log('Network Type Result: Mobile/Cellular (UA fallback)');
        // console.log('=== END NETWORK DETECTION ===');
        return "Mobile/Cellular";
      }
      // console.log('Network Type Result: Unknown (no connection API, not mobile)');
      // console.log('=== END NETWORK DETECTION ===');
      return "Unknown";
    }

    // console.log('Connection properties:');
    // console.log('- connection.type:', connection.type);
    // console.log('- connection.effectiveType:', connection.effectiveType);
    // console.log('- connection.downlink:', connection.downlink);
    // console.log('- connection.rtt:', connection.rtt);

    // Map connection types to user-friendly names
    const typeMapping: Record<string, string> = {
      wifi: "Wi-Fi",
      ethernet: "Ethernet",
      cellular: "Cellular",
      "4g": "Cellular (4G)",
      "3g": "Cellular (3G)",
      "2g": "Cellular (2G)",
      bluetooth: "Bluetooth",
      wimax: "WiMAX",
      other: "Other",
      none: "No Connection",
      unknown: "Unknown",
    };

    // First try connection.type (primary connection type)
    if (connection.type && typeMapping[connection.type]) {
      // console.log('Using connection.type:', connection.type);
      const result = typeMapping[connection.type];
      // console.log('Network Type Result:', result);
      // console.log('=== END NETWORK DETECTION ===');
      return result;
    }

    // Fallback to effectiveType for mobile connections
    if (connection.effectiveType) {
      // console.log('Using connection.effectiveType:', connection.effectiveType);
      if (typeMapping[connection.effectiveType]) {
        const result = typeMapping[connection.effectiveType];
        // console.log('Network Type Result:', result, '(from effectiveType mapping)');
        // console.log('=== END NETWORK DETECTION ===');
        return result;
      }
      // Handle special cases
      if (
        connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g"
      ) {
        // console.log('Network Type Result: Cellular (2G) (special case)');
        // console.log('=== END NETWORK DETECTION ===');
        return "Cellular (2G)";
      }
      if (connection.effectiveType === "3g") {
        // console.log('Network Type Result: Cellular (3G) (special case)');
        // console.log('=== END NETWORK DETECTION ===');
        return "Cellular (3G)";
      }
      if (connection.effectiveType === "4g") {
        // console.log('Network Type Result: Cellular (4G/LTE) (special case)');
        // console.log('=== END NETWORK DETECTION ===');
        return "Cellular (4G/LTE)";
      }
    }

    // Final fallback - detect mobile device
    // console.log('Using final fallback detection');
    const userAgent = navigator.userAgent;
    // console.log('User Agent for fallback:', userAgent);
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      );
    const isDesktop =
      /Windows|Mac|Linux/i.test(userAgent) && !/Mobile|Tablet/i.test(userAgent);

    // console.log('Is Mobile (fallback):', isMobile);
    // console.log('Is Desktop (fallback):', isDesktop);

    if (isMobile) {
      // console.log('Network Type Result: Mobile/Cellular (final mobile fallback)');
      // console.log('=== END NETWORK DETECTION ===');
      return "Mobile/Cellular";
    }

    // Desktop fallback
    if (isDesktop) {
      // console.log('Network Type Result: Ethernet/Wi-Fi (final desktop fallback)');
      // console.log('=== END NETWORK DETECTION ===');
      return "Ethernet/Wi-Fi";
    }

    // console.log('Network Type Result: Unknown (all detection methods failed)');
    // console.log('=== END NETWORK DETECTION ===');
    return "Unknown";
  }

  static getDetailedNetworkInfo() {
    const navWithConnection = navigator as Navigator & NetworkConnection;
    const connection =
      navWithConnection.connection ||
      navWithConnection.mozConnection ||
      navWithConnection.webkitConnection;

    if (!connection) {
      return {
        type: "unknown",
        effectiveType: "unknown",
        downlink: null,
        rtt: null,
        saveData: false,
      };
    }

    return {
      type: connection.type || "unknown",
      effectiveType: connection.effectiveType || "unknown",
      downlink: connection.downlink || null,
      rtt: connection.rtt || null,
      saveData: connection.saveData || false,
    };
  }
}
