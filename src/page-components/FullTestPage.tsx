import React, { useState } from "react";
import { TestModal } from "../components/TestModal";
import type { TestStatus, TestResult } from "../components/TestModal";

const FullTestPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testResult, setTestResult] = useState<TestResult | undefined>(
    undefined
  );

  const startTest = () => {
    setIsModalOpen(true);
    setTestStatus("in-progress");

    // Simulate test progression
    setTimeout(() => {
      setTestStatus("completed");
      setTestResult({
        downloadSpeed: "138 Mbps",
        uploadSpeed: "201 Mbps",
        webBrowsingDelay: "7 Sec",
        videoStreamingDelay: "5 Sec",
        latency: "9 ms",
        packetLoss: "0.3%",
        jitter: "168 ms",
      });
    }, 8000);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setTestStatus("idle");
    setTestResult(undefined);
  };

  const handleTestAgain = () => {
    setTestStatus("idle");
    setTestResult(undefined);
    startTest();
  };

  const handleCancelTest = () => {
    handleClose();
  };

  const handleExportResults = () => {
    // console.log("Exporting results...");
    alert("Export functionality would be implemented here");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Full Test</h1>
        <p className="text-lg text-gray-600 mb-8">
          Comprehensive test including download, upload, latency, web browsing,
          and video streaming
        </p>
        <button
          onClick={startTest}
          className="px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-full hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
        >
          Start Full Test
        </button>
      </div>

      <TestModal
        isOpen={isModalOpen}
        onClose={handleClose}
        testType="full"
        testStatus={testStatus}
        currentMetric={
          testStatus === "in-progress" ? "Upload Speed" : undefined
        }
        estimatedTime={testStatus === "in-progress" ? "3 minutes" : undefined}
        testId="10987654321"
        dateTime="Jan 03, 2025 | 10:30 AM"
        connection="Mobile Data"
        technology="4G"
        operator="Airtel"
        location="9-10, Galli Number 69, U Block, DLF Phase 3, Sector 24, Gurugram, Haryana 122002, India"
        progressMetrics={
          testStatus === "in-progress"
            ? [
                { label: "Download Speed", value: "138", unit: "Mbps" },
                { label: "Upload Speed", value: "00", unit: "Mbps" },
                { label: "Latency Test", value: "00", unit: "ms" },
                { label: "Web Browsing Delay", value: "00", unit: "Mbps" },
                { label: "Video Streaming Delay", value: "00", unit: "Mbps" },
              ]
            : undefined
        }
        testResult={testStatus === "completed" ? testResult : undefined}
        onCancelTest={handleCancelTest}
        onTestAgain={handleTestAgain}
        onExportResults={handleExportResults}
        baseUrl={process.env.NEXT_PUBLIC_API_BASE_URL || ""}
        currentScenarioId={1445}
      />
    </div>
  );
};

export default FullTestPage;
