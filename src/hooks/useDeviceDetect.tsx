import { useEffect, useState } from "react";

type DeviceType = "android" | "ios" | "other" | null;

export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("android")) {
      setDeviceType("android");
    } else if (
      ua.includes("iphone") ||
      ua.includes("ipad") ||
      ua.includes("ipod")
    ) {
      setDeviceType("ios");
    } else {
      setDeviceType("other");
    }
  }, []);

  return { deviceType };
};
