import { useTranslation } from "@/hooks/useTranslation";
import { log } from "console";
import React, { useEffect, useState, useMemo } from "react";

function IpDetails({ className }: { className?: string }) {
  const [ip, setIp] = useState("");
  const [isp, setIsp] = useState("");
  const [location, setLocation] = useState("");
  const t = useTranslation();

  useEffect(() => {
    let cancelled = false;

    const fetchIP = async () => {
      try {
        const res = await fetch("https://ipinfo.io/json?token=f69fce66bd0d29");
        // const res = await fetch("https://ipapi.co/json/");

        const data = await res.json();
        if (!cancelled) {
          setIp(data?.ip || "");
          setIsp(data?.asn?.name || "Unknown ISP");
          setLocation(`${data?.city || ""}, ${data?.region || ""}`);
        }
      } catch {
        if (!cancelled) {
          setIp("Not Found");
          setIsp("Not Found");
          setLocation("Not Found");
        }
      }
    };

    fetchIP();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer
      className={`${className} flex flex-row sm:grid sm:grid-cols-3 justify-between text-center gap-3 sm:gap-0 mx-auto w-full text-xs sm:text-sm mt-auto max-w-7xl mb-[6rem] max-sm:mb-[4rem]`}
    >
      <div className="flex-1">
        <div className="text-white/50 text-size4">{t("ISP Name")}</div>
        <div className="mt-1 px-1 sm:px-2 text-size3 text-white">{t(isp)}</div>
      </div>
      <div className="flex-1">
        <div className="text-white/50 text-size4">{t("IP Address")}</div>
        <div className="mt-1 break-all px-1 sm:px-2 text-size3 text-white">
          {ip}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-white/50 text-size4">{t("Location")}</div>
        <div className="mt-1 px-1 sm:px-2 text-size3 text-white">
          {t(location)}
        </div>
      </div>
    </footer>
  );
}

export default IpDetails;
