import React from "react";
import { ENV_CONFIG } from "@/lib/constants";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Download,
  Upload,
  Globe,
  Video,
  MapPin,
  Wifi,
  Copy,
  Star,
  ArrowLeftRight,
} from "lucide-react";

const copyToClipboard = async (
  text: string,
  label: string,
  callback?: () => void
) => {
  try {
    await navigator.clipboard.writeText(text);
    // console.log(`${label} copied to clipboard:`, text);
    if (callback) callback();
  } catch (error) {
    console.error(`Failed to copy ${label}:`, error);
  }
};

const getVideoCallingRating = (
  latency: number,
  packetLoss: number,
  jitter: number
): number => {
  const score =
    (latency < 50 ? 2 : latency < 100 ? 1 : 0) +
    (packetLoss < 1 ? 2 : packetLoss < 5 ? 1 : 0) +
    (jitter < 10 ? 1 : 0);
  return Math.min(5, Math.round(score));
};

const getRating = (delaySec: number): number => {
  if (delaySec <= 0) return 0;
  if (delaySec < 0.5) return 5;
  if (delaySec < 1) return 4;
  if (delaySec < 2) return 3;
  if (delaySec < 5) return 2;
  if (delaySec < 10) return 1;
  return 0; // if delay too high, 0 stars
};

const RenderCompletedResults = ({
  testResults,
  selectedScenarioId,
  displayTestId,
  masterId,
  dateTime,
  locationInfo,
  userIP,
}: any) => {
  const isFullTest = selectedScenarioId === ENV_CONFIG.SCENARIOS.FULL_TEST_ID;
  const t = useTranslation();

  const [isCopied, setIsCopied] = React.useState(false);

  if (!testResults) return null;

  const isQuickTest = selectedScenarioId === ENV_CONFIG.SCENARIOS.QUICK_TEST_ID;

  const downloadSpeed = testResults.download?.speed || 0;
  const uploadSpeed = testResults.upload?.speed || 0;

  let webDelay = 0;
  if (testResults.web) {
    webDelay = testResults.web.browsingDelay || testResults.web.duration || 0;
  } else {
    const webResults = Object.keys(testResults)
      .filter((key) => key.startsWith("web") && key !== "web")
      .map((key) => (testResults as any)[key]);

    if (webResults.length > 0) {
      const totalDelay = webResults.reduce((sum, result) => {
        return sum + (result?.browsingDelay || result?.duration || 0);
      }, 0);
      webDelay = totalDelay / webResults.length;
    }
  }

  const streamingDelay = testResults.streaming?.totalDelay || 0;
  const latency = testResults.latency?.average || 0;
  const packetLoss = testResults.latency?.packetLoss || 0;
  const jitter = testResults.latency?.jitter || 0;

  const videoRating = getVideoCallingRating(latency, packetLoss, jitter);
  const webRating = !isQuickTest ? getRating(webDelay / 1000) : 0;
  const streamingRating = !isQuickTest ? getRating(streamingDelay / 1000) : 0;

  const formatDateTime = (dt: string | undefined) => {
    return (
      dt ||
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  // Circle items for final results
  const iconClass = "clamp(16px, 3vw, 20px)"; // 16px on small, up to 24px max
  const resultCircles = [
    // Include Latency, Download, Upload only if it is NOT the Full Test
    ...(!isFullTest
      ? [
          {
            label: "Latency",
            value: latency.toFixed(0),
            unit: "ms",
            icon: <ArrowLeftRight size={iconClass} className="text-white/70" />,
          },
          {
            label: "Download",
            value: downloadSpeed.toFixed(1),
            unit: "Mbps",
            icon: <Download size={iconClass} className="text-white/70" />,
          },
          {
            label: "Upload",
            value: uploadSpeed.toFixed(1),
            unit: "Mbps",
            icon: <Upload size={iconClass} className="text-white/70" />,
          },
        ]
      : []),

    // Include Web Browsing and Video Streaming only if it IS the Full Test
    ...(isFullTest
      ? [
          {
            label: "Web Browsing Delay",
            value: webDelay.toFixed(3),
            unit: "ms",
            icon: <Globe size={iconClass} className="text-white/70" />,
          },
          {
            label: "Video Streaming Delay",
            value: streamingDelay.toFixed(3),
            unit: "ms",
            icon: <Video size={iconClass} className="text-white/70" />,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-row flex-wrap justify-center items-center gap-2 sm:gap-8 mb-[5rem] max-sm:mb-[3.5rem] tracking-wider">
        <span className="text-white/50 text-size4 mr-2 sm:mr-0">
          {t("Date")}:{" "}
          <span className="text-white text-size4">
            {formatDateTime(dateTime)}
          </span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-white/50 text-size4">
            {t("Test ID")}:{" "}
            <span
              className={`text-size4 ${
                isCopied ? "text-green-500" : "text-white"
              }`}
            >
              {displayTestId}
            </span>
          </span>
          <button
            onClick={() =>
              copyToClipboard(displayTestId, t("Test ID"), () => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              })
            }
            className={`text-white/60 hover:text-white transition`}
            title={t("Copy Test ID")}
          >
            <Copy
              size={14}
              className={isCopied ? "text-green-500" : "text-white"}
            />
          </button>
        </div>
      </div>

      {/* Main Gradient Circle Results */}
      <div className="flex justify-center gap-2 sm:gap-8 overflow-x-auto pb-4 max-sm:mx-3 max-sm:pb-4">
        {resultCircles.map((item, index) => (
          <div
            key={index}
            className={`relative rounded-lg bg-white/5 dark:bg-white/10 p-4 sm:p-6 sm:px-10 ${
              item.label === "Download" && "sm:px-8"
            } flex flex-col items-center justify-center text-center transition-all duration-300 sm:min-w-[160px]`}
          >
            {/* Gradient Circle */}
            {/* Gradient Circle */}
            <div
              className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center 
              bg-gradient-to-b from-[#F3B643] from-20% to-[#F9DA95] to-80%
              shadow-2xl"
            >
              {(() => {
                // Convert ms → s for Web and Video
                let displayValue = item.value;
                let displayUnit = item.unit;

                const numericValue = parseFloat(item.value);
                if (!isNaN(numericValue)) {
                  if (
                    item.label.includes("Web") ||
                    item.label.includes("Video")
                  ) {
                    displayValue = (numericValue / 1000).toFixed(2);
                    displayUnit = "Seconds";
                  }
                } else {
                  displayValue = "-";
                }

                return (
                  <>
                    <span className="text-size1 tracking-tight select-none dark:text-darkBlack">
                      {displayValue}
                    </span>
                    <span className="text-size4 text-darkBlack mt-1">
                      {displayUnit}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Label with Icon */}
            <span className="flex mt-2 sm:mt-3 gap-1 sm:gap-2">
              <span>{item.icon}</span>

              <div className="text-size2 flex items-center  justify-center">
                {item.label}
              </div>
            </span>
          </div>
        ))}
      </div>

      {/* Latency, Packet Loss, Jitter */}
      {!isFullTest && (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-6 text-xs sm:text-sm">
          <span className="rounded-lg bg-white/10 p-2 px-3 sm:px-4">
            <span className="text-white text-size2">{t("Packet Loss: ")} </span>{" "}
            <span className="text-size2">{packetLoss.toFixed(1)}%</span>
          </span>
          <span className="rounded-lg bg-white/10 p-2 px-3 sm:px-10">
            <span className="text-white text-size2"> {t("Jitter: ")}</span>{" "}
            <span className="text-size2">{jitter.toFixed(0)} ms</span>
          </span>
        </div>
      )}

      {/* Ratings Section */}
      {/* <div className="border border-darkYellow rounded-3xl py-4 border-gradient mt-[3rem] sm:mt-[5rem] mx-3">
        <div
          className={`flex gap-1 sm:grid sm:gap-8 sm:px-0 ${
            isFullTest
              ? "sm:grid-cols-2 justify-evenly"
              : "sm:grid-cols-3 justify-evenly"
          }`}
        >
          {isFullTest ? (
            <>
              <div className="flex-shrink-0 text-center">
                <p className="text-[0.8rem] sm:text-[1.15rem] font-medium text-gray-300">
                  {t("Web Browsing")}
                </p>
                <div className="flex justify-center gap-1 sm:gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < webRating
                          ? "text-[#37C667] fill-[#37C667]"
                          : "text-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 text-center">
                <p className="text-[0.8rem] sm:text-[1.15rem] font-medium text-gray-300">
                  {t("Video Streaming")}
                </p>
                <div className="flex justify-center gap-1 sm:gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < streamingRating
                          ? "text-[#37C667] fill-[#37C667]"
                          : "text-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex-shrink-0 text-center">
                <p className="text-[0.8rem] sm:text-[1.15rem] font-medium text-gray-300">
                  {t("Latency")}
                </p>
                <div className="flex justify-center gap-1 sm:gap-2">
                  {[...Array(5)].map((_, i) => {
                    const latencyRating =
                      latency < 30
                        ? 5
                        : latency < 60
                        ? 4
                        : latency < 100
                        ? 3
                        : latency < 200
                        ? 2
                        : 1;
                    return (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < latencyRating
                            ? "text-[#37C667] fill-[#37C667]"
                            : "text-gray-600"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0 text-center">
                <p className="text-[0.8rem] sm:text-[1.15rem] font-medium text-gray-300">
                  {t("Download")}
                </p>
                <div className="flex justify-center gap-1 sm:gap-2">
                  {[...Array(5)].map((_, i) => {
                    const downloadRating =
                      downloadSpeed > 100
                        ? 5
                        : downloadSpeed > 50
                        ? 4
                        : downloadSpeed > 20
                        ? 3
                        : downloadSpeed > 10
                        ? 2
                        : 1;
                    return (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < downloadRating
                            ? "text-[#37C667] fill-[#37C667]"
                            : "text-gray-600"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0 text-center">
                <p className="text-[0.8rem] sm:text-[1.15rem] font-medium text-gray-300">
                  {t("Upload")}
                </p>
                <div className="flex justify-center gap-1 sm:gap-2">
                  {[...Array(5)].map((_, i) => {
                    const uploadRating =
                      uploadSpeed > 50
                        ? 5
                        : uploadSpeed > 20
                        ? 4
                        : uploadSpeed > 10
                        ? 3
                        : uploadSpeed > 5
                        ? 2
                        : 1;
                    return (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < uploadRating
                            ? "text-[#37C667] fill-[#37C667]"
                            : "text-gray-600"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        <p className="text-center text-white/50 mt-5 text-xs sm:text-sm">
          {t("These ratings represent real-world performance expectations")}
        </p>
      </div> */}

      {/* <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-start gap-4">
            <MapPin size={20} className="text-gray-400 mt-1" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t("Location")}
              </p>
              <p className="text-lg font-medium text-white mt-1">
                {locationInfo?.address || t("Fetching...")}
              </p>
              {locationInfo?.source && (
                <p className="text-xs text-gray-500 mt-1">
                  Source:{" "}
                  {locationInfo.source === "device" ? "GPS" : "IP-based"}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <Wifi size={20} className="text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("ISP")}
                </p>
                <p className="text-lg font-medium text-white mt-1">
                  {locationInfo?.isp || t("Fetching...")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4 flex-1">
                <Globe size={20} className="text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {t("IP Address")}
                  </p>
                  <p className="text-lg font-medium text-white mt-1">
                    {userIP}
                  </p>
                </div>
              </div>
              {userIP !== "Fetching..." && userIP !== "Unknown" && (
                <button
                  onClick={() => copyToClipboard(userIP, t("IP Address"))}
                  className="text-gray-400 hover:text-white transition"
                >
                  <Copy size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default RenderCompletedResults;
