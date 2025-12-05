import CryptoJS from "crypto-js";
import {
  AuthRequest,
  AuthResponse,
  GeoIpResponse,
  ServersResponse,
  ScenarioResponse,
} from "../types/speed-test";
import { PROTOCOL_CONFIG, AUTH_CONFIG } from "../constants";

export class APIClient {
  private baseUrl: string;
  private publicKey: string;
  private appSecret: string;
  private token: string | null = null;
  private uuid: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.publicKey =
      process.env.NEXT_PUBLIC_APP_KEY || AUTH_CONFIG.DEFAULT_PUBLIC_KEY;
    this.appSecret =
      process.env.NEXT_PUBLIC_APP_SECRET || "AZrj0xNXjNO20RlrDI5D";
    this.uuid = this.generateUUID();

    if (!this.appSecret) {
      console.warn("APP_SECRET not provided, authentication may fail");
    }
  }

  private generateUUID(): string {
    // Generate a simple UUID for demo purposes
    return (
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
        .replace(/[xy]/g, function (c) {
          const r = (Math.random() * PROTOCOL_CONFIG.UUID_BASE) | 0;
          const v =
            c === "x"
              ? r
              : (r & PROTOCOL_CONFIG.UUID_BIT_MASK_1) |
                PROTOCOL_CONFIG.UUID_BIT_MASK_2;
          return v.toString(16);
        })
        .toUpperCase() + AUTH_CONFIG.UUID_WEB_SUFFIX
    );
  }

  private generateSignature(url: string): string {
    // Construct the complete URL and concatenate with app secret
    const dataToHash = url + this.appSecret;

    // console.log("CLIENT is hashing this string:", `'${dataToHash}'`);

    // Convert to WordArray and calculate SHA256 hash
    const wordArray = CryptoJS.enc.Utf8.parse(dataToHash);
    const signature = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);

    return signature;
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const deviceInfo = {
      type: "WEB",
      os_version: "unknown",
      brand: "unknown",
      device: "computer",
      product: "web-browser",
      model: "unknown",
    };

    // Detect OS
    if (userAgent.includes("Windows")) {
      deviceInfo.os_version = "Windows";
      deviceInfo.brand = "Microsoft";
    } else if (userAgent.includes("Mac OS X")) {
      const match = userAgent.match(/Mac OS X (\d+_\d+_?\d*)/);
      deviceInfo.os_version = match ? match[1].replace(/_/g, ".") : "macOS";
      deviceInfo.brand = "Apple";
    } else if (userAgent.includes("Linux")) {
      deviceInfo.os_version = "Linux";
      deviceInfo.brand = "Linux";
    }

    // Detect browser
    if (userAgent.includes("Chrome")) {
      deviceInfo.product = "Chrome";
    } else if (userAgent.includes("Firefox")) {
      deviceInfo.product = "Firefox";
    } else if (userAgent.includes("Safari")) {
      deviceInfo.product = "Safari";
    }

    return deviceInfo;
  }

  async authenticate(): Promise<string> {
    // console.log("=== API AUTHENTICATION ===");
    // console.log("Base URL:", this.baseUrl);

    try {
      const url = `${this.baseUrl}/authenticate`;
      // console.log("Authentication URL:", url);
      // const signature = this.generateSignature(url);
      // console.log('Generated signature (first chars):', signature.substring(0, PROTOCOL_CONFIG.SIGNATURE_DISPLAY_LENGTH) + '...');
      const signature =
        "ea44431e6c65f346e2a887fc0c61cd99adcdbdd2be5fa79c2bf18d86ebf74247"; // hardcoded
      // console.log(
      //   "Using hardcoded signature:",
      //   signature.substring(0, PROTOCOL_CONFIG.SIGNATURE_DISPLAY_LENGTH) + "..."
      // );
      const deviceInfo = this.getDeviceInfo();
      // console.log("Device info:", deviceInfo);

      const authRequest: AuthRequest = {
        uuid: this.uuid,
        type: deviceInfo.type,
        os_version: deviceInfo.os_version,
        brand: deviceInfo.brand,
        user_agent: navigator.userAgent,
        device: deviceInfo.device,
        product: deviceInfo.product,
        model: deviceInfo.product,
      };

      // console.log("Authentication request payload:", {
      //   ...authRequest,
      //   user_agent: authRequest.user_agent.substring(0, 50) + "...", // Truncate UA for readability
      // });

      // Convert to URLSearchParams for form encoding
      const formData = new URLSearchParams();
      Object.entries(authRequest).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // console.log("Making authentication request...");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "QOSI-Auth-PublicKey": this.publicKey,
          "QOSI-Auth-Signature": signature,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      // console.log(
      //   "Authentication response status:",
      //   response.status,
      //   response.statusText
      // );

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      // console.log("Authentication response content-type:", contentType);

      if (!response.ok) {
        // console.error(
        //   "Authentication HTTP error:",
        //   response.status,
        //   response.statusText
        // );

        // If server returned HTML, show better error message
        if (contentType && contentType.includes("text/html")) {
          const htmlText = await response.text();
          // console.error(
          //   "Server returned HTML error page:",
          //   htmlText.substring(0, 300)
          // );
          throw new Error(
            `Authentication failed: Server returned HTML error page (${response.status}). This may be a CORS issue, server configuration problem, or the API endpoint is incorrect. Check if the BASE_URL is correct and the server is running.`
          );
        }

        throw new Error(
          `Authentication failed: ${response.status} ${response.statusText}`
        );
      }

      // Check if response is JSON before parsing
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        // console.error("Expected JSON but got:", contentType);
        // console.error("Response text:", text.substring(0, 300));
        throw new Error(
          `Authentication failed: Server returned non-JSON response. Content-Type: ${contentType}. This indicates a server configuration issue or CORS problem.`
        );
      }

      const authResponse: AuthResponse = await response.json();
      // console.log("Authentication response:", authResponse);

      if (authResponse.meta.code !== 200) {
        // console.error("Authentication API error code:", authResponse.meta.code);
        throw new Error(`Authentication API error: ${authResponse.meta.code}`);
      }

      this.token = authResponse.content.token;
      // console.log("Authentication successful, token received");
      // console.log("=== END AUTHENTICATION ===");
      return this.token;
    } catch (error) {
      // console.error("Authentication failed:", error);
      // console.log("=== END AUTHENTICATION (ERROR) ===");

      // Provide more helpful error messages
      if (error instanceof SyntaxError) {
        throw new Error(
          `Authentication failed: Server returned invalid JSON. This is likely a server error or CORS issue. Original error: ${error.message}`
        );
      }

      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          `Authentication failed: Cannot connect to server at ${this.baseUrl}. Please check if the server is running and the URL is correct.`
        );
      }

      throw error;
    }
  }

  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.token) {
      await this.authenticate();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const signature = this.generateSignature(url);

    const response = await fetch(url, {
      ...options,
      headers: {
        "QOSI-Auth-Token": this.token!,
        "QOSI-Auth-PublicKey": this.publicKey,
        "QOSI-Auth-Signature": signature,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      // console.error("API request failed:", {
      //   status: response.status,
      //   statusText: response.statusText,
      //   contentType: contentType,
      //   url: url,
      // });

      // Check if server returned HTML (error page)
      if (contentType && contentType.includes("text/html")) {
        const htmlText = await response.text();
        // console.error(
        //   "Server returned HTML error page:",
        //   htmlText.substring(0, 200)
        // );
        throw new Error(
          `API server error: ${response.status}. Server returned HTML instead of JSON. This may be a CORS or server configuration issue.`
        );
      }

      // If unauthorized, try to re-authenticate once
      if (response.status === 401) {
        this.token = null;
        await this.authenticate();

        // Retry the request
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            "QOSI-Auth-Token": this.token!,
            "QOSI-Auth-PublicKey": this.publicKey,
            "QOSI-Auth-Signature": signature,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          throw new Error(
            `API request failed: ${retryResponse.status} ${retryResponse.statusText}`
          );
        }

        return retryResponse.json();
      }

      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
      const text = await response.text();
      // console.error(
      //   "Expected JSON but got:",
      //   contentType,
      //   text.substring(0, 200)
      // );
      throw new Error("Server returned non-JSON response");
    }

    return response.json();
  }

  async getGeoIP(): Promise<GeoIpResponse> {
    return this.makeAuthenticatedRequest<GeoIpResponse>("/geoip");
  }

  async getServers(
    latitude?: number,
    longitude?: number,
    operatorName?: string
  ): Promise<ServersResponse> {
    let endpoint = "/servers";
    const params: string[] = [];

    if (latitude && longitude) {
      params.push(`latitude=${latitude}`);
      params.push(`longitude=${longitude}`);
    }

    if (operatorName) {
      // Properly encode operator name for URL
      params.push(`operator_name=${encodeURIComponent(operatorName)}`);
    }

    // Always add web=1 to get websocket_port in response
    params.push("web=1");

    if (params.length > 0) {
      endpoint += "?" + params.join("&");
    }

    return this.makeAuthenticatedRequest<ServersResponse>(endpoint);
  }

  async getScenarios(): Promise<ScenarioResponse> {
    try {
      // console.log("Fetching scenarios from API...");
      const response = await this.makeAuthenticatedRequest<ScenarioResponse>(
        "/scenarios"
      );
      // console.log("Scenarios response:", response);
      return response;
    } catch (error) {
      // console.error("Failed to fetch scenarios:", error);
      // Check if error is due to HTML response (CORS/server error)
      if (error instanceof SyntaxError && error.message.includes("<!DOCTYPE")) {
        // console.error(
        //   "Server returned HTML instead of JSON - likely a CORS or authentication issue"
        // );
        throw new Error(
          "API server returned an error page. Please check server configuration and CORS settings."
        );
      }
      throw error;
    }
  }

  async getMasterId(): Promise<{
    master_id: number;
    uuid: string;
    created_at: string;
  }> {
    try {
      // console.log("Fetching Master ID from API...");
      const response = await this.makeAuthenticatedRequest<{
        meta: { code: number };
        content: { master_id: number; uuid: string; created_at: string };
      }>("/masterid");

      // console.log("Master ID API response:", response);

      if (response.meta.code !== 200) {
        throw new Error(`Master ID API error: ${response.meta.code}`);
      }

      // console.log("Master ID obtained:", response.content.master_id);
      return response.content;
    } catch (error) {
      // console.error("Failed to fetch Master ID:", error);
      throw error;
    }
  }

  async submitTestCycle(submission: any): Promise<any> {
    // console.log("Submitting test cycle to /cycle endpoint...");

    if (!this.token) {
      throw new Error("No authentication token available for test submission");
    }

    const response = await fetch(`${this.baseUrl}/cycle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "QOSI-Auth-Token": this.token,
        "QOSI-Auth-PublicKey":
          process.env.NEXT_PUBLIC_APP_KEY || AUTH_CONFIG.DEFAULT_PUBLIC_KEY,
        "QOSI-Auth-Signature": this.generateSignature(`${this.baseUrl}/cycle`),
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Test cycle submission failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  getToken(): string | null {
    return this.token;
  }

  getUUID(): string {
    return this.uuid;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Method to update credentials if needed
  updateCredentials(appKey: string, appSecret: string): void {
    this.publicKey = appKey;
    this.appSecret = appSecret;
    // Clear token to force re-authentication with new credentials
    this.token = null;
  }

  // Method to check if credentials are configured
  hasCredentials(): boolean {
    return !!(this.publicKey && this.appSecret && this.appSecret !== "");
  }
}
