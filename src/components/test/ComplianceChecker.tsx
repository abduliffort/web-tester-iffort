"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Wifi,
  Globe,
  MapPin,
} from "lucide-react";
import { BrowserCompatibilityChecker } from "@/lib/utils/browser-compatibility";
import { PermissionChecker } from "@/lib/utils/permissions";

interface ComplianceStatus {
  browserCompatible: boolean;
  httpsSecure: boolean;
  geolocationAvailable: boolean;
  networkAccessAvailable: boolean;
  allChecked: boolean;
}

interface ComplianceCheckerProps {
  onComplianceComplete: (compliant: boolean) => void;
}

export function ComplianceChecker({
  onComplianceComplete,
}: ComplianceCheckerProps) {
  const [status, setStatus] = useState<ComplianceStatus>({
    browserCompatible: false,
    httpsSecure: false,
    geolocationAvailable: false,
    networkAccessAvailable: false,
    allChecked: false,
  });

  const [browserInfo, setBrowserInfo] = useState<{
    name: string;
    version: string;
    isSupported: boolean;
  } | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{
    type: string;
    effectiveType: string;
    downlink: number | null;
    rtt: number | null;
  } | null>(null);
  const [permissionMessages, setPermissionMessages] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkCompliance();
  }, []);

  const checkCompliance = async () => {
    setIsChecking(true);
    // console.log('=== COMPLIANCE CHECK STARTED ===');

    try {
      // 1. Check browser compatibility
      // console.log('Checking browser compatibility...');
      const browser = BrowserCompatibilityChecker.checkCompatibility();
      setBrowserInfo(browser);
      // console.log('Browser check completed:', browser.name, browser.version, 'Supported:', browser.isSupported);

      // 2. Check permissions
      // console.log('Checking system permissions...');
      const permissions = await PermissionChecker.checkAllPermissions();
      // console.log('Permissions check completed:', permissions);

      // 3. Get network information
      // console.log('Getting network information...');
      const network = PermissionChecker.getDetailedNetworkInfo();
      setNetworkInfo(network);
      // console.log('Network info obtained:', network);

      // 4. Get current network type display
      const networkType = PermissionChecker.getNetworkType();
      // console.log('Current network type display:', networkType);

      // 4. Update status
      const newStatus: ComplianceStatus = {
        browserCompatible: browser.isSupported,
        httpsSecure: permissions.isHttps.granted,
        geolocationAvailable: permissions.geolocation.granted,
        networkAccessAvailable: permissions.networkAccess.granted,
        allChecked: true,
      };

      setStatus(newStatus);

      // 5. Set messages
      const messages: string[] = [];
      if (!browser.isSupported) {
        messages.push(
          BrowserCompatibilityChecker.getUnsupportedMessage(browser)
        );
      }
      if (!permissions.isHttps.granted) {
        messages.push(permissions.isHttps.message);
      }
      if (!permissions.geolocation.granted) {
        messages.push(permissions.geolocation.message);
      }
      if (!permissions.networkAccess.granted) {
        messages.push(permissions.networkAccess.message);
      }

      setPermissionMessages(messages);

      // 6. Determine if test can proceed
      const canProceed =
        newStatus.browserCompatible &&
        newStatus.httpsSecure &&
        newStatus.networkAccessAvailable;

      // console.log("=== COMPLIANCE CHECK SUMMARY ===");
      // console.log(
      //   "✓ Browser:",
      //   browser.name,
      //   browser.version,
      //   browser.isSupported ? "(Supported)" : "(Not Supported)"
      // );
      // console.log("✓ Network Type:", networkType);
      // console.log(
      //   "✓ HTTPS:",
      //   permissions.isHttps.granted ? "Enabled" : "Disabled"
      // );
      // console.log(
      //   "✓ Network Access:",
      //   permissions.networkAccess.granted ? "Available" : "Unavailable"
      // );
      // console.log(
      //   "✓ Geolocation:",
      //   permissions.geolocation.granted ? "Granted" : "Not Granted"
      // );
      // console.log("✓ Can Proceed with Test:", canProceed);
      // console.log("=== END COMPLIANCE CHECK ===");

      onComplianceComplete(canProceed);
    } catch (error) {
      // console.error("Compliance check failed:", error);
      // console.log("=== END COMPLIANCE CHECK (ERROR) ===");
      onComplianceComplete(false);
    } finally {
      setIsChecking(false);
    }
  };

  const requestGeolocationPermission = async () => {
    const permission = await PermissionChecker.requestGeolocationPermission();

    if (permission.granted) {
      setStatus((prev) => ({ ...prev, geolocationAvailable: true }));
      setPermissionMessages((prev) =>
        prev
          .filter((msg) => !msg.includes("Geolocation"))
          .concat([permission.message])
      );
    } else {
      setPermissionMessages((prev) =>
        prev
          .filter((msg) => !msg.includes("Geolocation"))
          .concat([permission.message])
      );
    }
  };

  const getNetworkTypeDisplay = () => {
    return PermissionChecker.getNetworkType();
  };

  if (isChecking) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">
            Checking system compatibility...
          </span>
        </div>
      </div>
    );
  }

  const allRequired =
    status.browserCompatible &&
    status.httpsSecure &&
    status.networkAccessAvailable;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">
          System Compatibility Check
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Browser Compatibility */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
          {status.browserCompatible ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Browser Compatibility</div>
            <div className="text-xs text-gray-600 font-medium">
              {browserInfo
                ? `${browserInfo.name} ${browserInfo.version}`
                : "Detecting..."}
            </div>
            {browserInfo && (
              <div className="text-xs text-gray-500 mt-1">
                {browserInfo.isSupported
                  ? "✓ Supported"
                  : "⚠ May have limited support"}
              </div>
            )}
          </div>
        </div>

        {/* HTTPS Security */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
          {status.httpsSecure ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Secure Connection</div>
            <div className="text-xs text-gray-600">
              {window.location.protocol.toUpperCase()} Protocol
            </div>
          </div>
        </div>

        {/* Network Access */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
          {status.networkAccessAvailable ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Network Access</div>
            <div className="text-xs text-gray-600">
              <Wifi className="inline h-3 w-3 mr-1" />
              {getNetworkTypeDisplay()}
            </div>
          </div>
        </div>

        {/* Geolocation */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
          {status.geolocationAvailable ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <div className="flex-1">
            <div className="font-medium text-sm">Location Access</div>
            <div className="text-xs text-gray-600">
              {status.geolocationAvailable
                ? "Location access enabled for result mapping"
                : "Please enable location access for accurate test results and mapping"}
            </div>
          </div>
          {!status.geolocationAvailable && (
            <button
              onClick={requestGeolocationPermission}
              className="text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-medium"
            >
              Enable Location
            </button>
          )}
        </div>
      </div>

      {/* Geolocation Prompt */}
      {!status.geolocationAvailable && status.allChecked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800">
              Location Permission Required
            </span>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            For the most accurate speed test results and proper mapping of your
            test location, please enable location access when prompted by your
            browser.
          </p>
          <button
            onClick={requestGeolocationPermission}
            className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 font-medium text-sm"
          >
            Enable Location Access
          </button>
        </div>
      )}

      {/* Messages */}
      {permissionMessages.length > 0 && (
        <div className="space-y-2">
          {permissionMessages.map((message, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Network Information */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Globe className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm text-blue-900">
            Detected Network Information
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800">
          <div>
            <span className="font-medium">Connection Type:</span>{" "}
            {getNetworkTypeDisplay()}
          </div>
          {networkInfo?.effectiveType && (
            <div>
              <span className="font-medium">Speed Tier:</span>{" "}
              {networkInfo.effectiveType === "slow-2g"
                ? "Very Slow (2G)"
                : networkInfo.effectiveType === "2g"
                ? "Slow (2G)"
                : networkInfo.effectiveType === "3g"
                ? "Moderate (3G)"
                : networkInfo.effectiveType === "4g"
                ? "Fast (4G/LTE)"
                : networkInfo.effectiveType}
            </div>
          )}
          {networkInfo?.downlink && (
            <div>
              <span className="font-medium">Estimated Speed:</span>{" "}
              {networkInfo.downlink} Mbps
            </div>
          )}
          {networkInfo?.rtt && (
            <div>
              <span className="font-medium">Network Latency:</span>{" "}
              {networkInfo.rtt} ms
            </div>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div
        className={`p-4 rounded-lg ${
          allRequired ? "bg-green-50" : "bg-amber-50"
        }`}
      >
        <div className="flex items-center space-x-2">
          {allRequired ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
          <span
            className={`font-medium ${
              allRequired ? "text-green-800" : "text-amber-800"
            }`}
          >
            {allRequired
              ? "System Ready - All requirements met for speed testing"
              : "Some issues detected - Test may proceed with limited functionality"}
          </span>
        </div>
      </div>
    </div>
  );
}
