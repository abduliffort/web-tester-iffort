interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  features: {
    fetch: boolean;
    webSocket: boolean;
    geolocation: boolean;
    networkInformation: boolean;
  };
}

export class BrowserCompatibilityChecker {
  static checkCompatibility(): BrowserInfo {
    const userAgent = navigator.userAgent;
    // console.log('=== BROWSER COMPATIBILITY CHECK ===');
    // console.log('User Agent:', userAgent);

    const browserInfo = this.detectBrowser(userAgent);
    // console.log('Detected Browser:', browserInfo.name, browserInfo.version);

    const features = this.checkFeatures();
    // console.log('Browser Features:', features);

    const isSupported = this.isBrowserSupported(browserInfo, features);
    // console.log('Browser Supported:', isSupported);
    // console.log('=== END BROWSER CHECK ===');

    return {
      ...browserInfo,
      features,
      isSupported,
    };
  }

  private static detectBrowser(
    userAgent: string
  ): Omit<BrowserInfo, "features" | "isSupported"> {
    // Edge (Chromium-based) - Must check first as it contains Chrome
    if (userAgent.includes("Edg/") || userAgent.includes("Edge/")) {
      const version = userAgent.match(/(?:Edg|Edge)\/(\d+)/)?.[1] || "0";
      return {
        name: "Edge",
        version,
      };
    }

    // Chrome (but not Edge) - Check for Chrome and explicitly exclude Edge
    if (
      userAgent.includes("Chrome/") &&
      !userAgent.includes("Edg/") &&
      !userAgent.includes("Edge/")
    ) {
      const version = userAgent.match(/Chrome\/(\d+)/)?.[1] || "0";
      return {
        name: "Chrome",
        version,
      };
    }

    // Firefox
    if (userAgent.includes("Firefox/")) {
      const version = userAgent.match(/Firefox\/(\d+)/)?.[1] || "0";
      return {
        name: "Firefox",
        version,
      };
    }

    // Safari (real Safari, not Chrome-based)
    if (
      userAgent.includes("Safari/") &&
      !userAgent.includes("Chrome/") &&
      !userAgent.includes("Chromium/")
    ) {
      const version = userAgent.match(/Version\/(\d+)/)?.[1] || "0";
      return {
        name: "Safari",
        version,
      };
    }

    return {
      name: "Unknown",
      version: "0",
    };
  }

  private static checkFeatures() {
    return {
      fetch: typeof fetch !== "undefined",
      webSocket: typeof WebSocket !== "undefined",
      geolocation: "geolocation" in navigator,
      networkInformation:
        "connection" in navigator ||
        "mozConnection" in navigator ||
        "webkitConnection" in navigator,
    };
  }

  private static isBrowserSupported(
    browserInfo: Omit<BrowserInfo, "features" | "isSupported">,
    features: BrowserInfo["features"]
  ): boolean {
    const minVersions = {
      Chrome: 70,
      Firefox: 65,
      Edge: 79,
      Safari: 12,
    };

    const requiredFeatures = ["fetch", "webSocket"] as const;
    const hasRequiredFeatures = requiredFeatures.every(
      (feature) => features[feature]
    );

    if (!hasRequiredFeatures) {
      return false;
    }

    const minVersion =
      minVersions[browserInfo.name as keyof typeof minVersions];
    if (!minVersion) {
      return false; // Unknown browser
    }

    return parseInt(browserInfo.version) >= minVersion;
  }

  static getUnsupportedMessage(browserInfo: BrowserInfo): string {
    if (!browserInfo.features.fetch) {
      return "Your browser does not support the Fetch API. Please update your browser.";
    }

    if (!browserInfo.features.webSocket) {
      return "Your browser does not support WebSockets. Please update your browser.";
    }

    const minVersions = {
      Chrome: 70,
      Firefox: 65,
      Edge: 79,
      Safari: 12,
    };

    const minVersion =
      minVersions[browserInfo.name as keyof typeof minVersions];
    if (minVersion && parseInt(browserInfo.version) < minVersion) {
      return `Please update ${browserInfo.name} to version ${minVersion} or later. Current version: ${browserInfo.version}`;
    }

    return "Your browser may not be fully compatible with this speed test. Please use the latest version of Chrome, Firefox, Edge, or Safari.";
  }
}
