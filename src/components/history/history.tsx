"use client";
import React, { useState, useEffect, useMemo, Fragment } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface TestResult {
  testId: string;
  dateTime: string;
  networkType: string;
  testType?: string;
  latency: number | null;
  download: number | null;
  upload: number | null;
  webBrowsing?: number | null;
  videoStreaming?: number | null;
}

export default function HistoryPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<"speed" | "video">("speed"); // Default: Speed Test
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedOperator, setSelectedOperator] = useState("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [gotoInput, setGotoInput] = useState("");
  const t = useTranslation();

  useEffect(() => {
    const raw = localStorage.getItem("trai_test_results_history");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as TestResult[];
        setResults(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const processedData = useMemo(() => {
    let data = [...results];

    if (selectedOperator !== "all") {
      data = data.filter((r) => r.networkType === selectedOperator);
    }

    data.sort((a, b) => {
      const da = new Date(a.dateTime.replace(", ", " ")).getTime();
      const db = new Date(b.dateTime.replace(", ", " ")).getTime();
      return dateSort === "newest" ? db - da : da - db;
    });

    // Tab-specific filtering
    if (activeTab === "speed") {
      data = data.filter(
        (r) => r.latency !== null || r.download !== null || r.upload !== null
      );
    }
    if (activeTab === "video") {
      data = data.filter(
        (r) => r.webBrowsing !== null || r.videoStreaming !== null
      );
    }

    return data;
  }, [results, selectedOperator, dateSort, activeTab]);

  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginated = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleGoto = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const page = parseInt(gotoInput);
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
      setGotoInput("");
    }
  };

  const formatNetwork = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("wifi")) return "Wi-Fi";
    if (lower.includes("4g") || lower.includes("5g") || lower.includes("lte"))
      return "Mobile Data";
    return type;
  };

  const formatValue = (val: number | null, unit = "") => {
    return val === null
      ? "-"
      : val % 1 === 0
      ? val + unit
      : parseFloat(val.toFixed(1)) + unit;
  };

  const formatDelay = (val: any) => {
    if (val === null) return "-";
    return val.toFixed(3);
  };

  // Show speed columns only in Speed tab, delay columns only in Video tab
  const showSpeedColumns = activeTab === "speed";
  const showDelayColumns = activeTab === "video";

  return (
    <div className="px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-6 mb-6 md:mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base"
        >
          <ChevronLeft size={20} />
          <span className="text-size3">{t("Back to Home")}</span>
        </Link>
        <h1 className="text-size1 text-white text-center flex max-sm:mt-6">
          {t("Previous Test Results")}
        </h1>
        <div className="hidden md:block w-[120px]" />
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8 mb-8">
        {/* Tabs - Only Speed and Video & Browser */}
        <div className="flex flex-nowrap overflow-x-auto overflow-y-hidden lg:overflow-visible justify-start max-sm:justify-evenly gap-0 lg:gap-4 border-b border-gray-300 scrollbar-hide">
          {[
            { id: "speed", label: t("Speed Test") },
            { id: "video", label: t("Video & Browser Test") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as "speed" | "video");
                setCurrentPage(1);
              }}
              className={`flex-shrink-0 pb-2 sm:pb-4 px-3 text-size3 transition-colors border-b-4 -mb-px ${
                activeTab === tab.id
                  ? "text-white border-white"
                  : "text-white/50 border-transparent hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Sort */}
        <div className="flex flex-row flex-nowrap justify-center sm:justify-end gap-2 sm:gap-3">
          <div className="relative inline-block">
            <select
              value={dateSort}
              onChange={(e) => {
                setDateSort(e.target.value as any);
                setCurrentPage(1);
              }}
              className="appearance-none pl-3 sm:pl-4 pr-10 sm:pr-12 py-2 border border-white/50 rounded-full text-white focus:outline-none focus:border-white/50 bg-darkPrimary text-size3 leading-tight"
            >
              <option value="newest">{t("Date & Time (Newest First)")}</option>
              <option value="oldest">{t("Date & Time (Oldest First)")}</option>
            </select>
            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-3 sm:right-4 top-1/2 -translate-y-[45%] text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto md:overflow-visible">
          <table className="min-w-[820px] w-full text-sm md:text-[0.9rem]">
            <thead>
              <tr className="bg-darkYellow text-darkBlue">
                <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue">
                  {t("Date & Time")}
                </th>
                <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue">
                  {t("Network Type")}
                </th>
                <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue">
                  {t("Test ID")}
                </th>

                {showSpeedColumns && (
                  <>
                    <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue">
                      {t("Latency (ms)")}
                    </th>
                    <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue">
                      {t("Download (Mbps)")}
                    </th>
                    <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue">
                      {t("Upload (Mbps)")}
                    </th>
                  </>
                )}

                {showDelayColumns && (
                  <>
                    <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue">
                      {t("Web Browsing Delay (Sec)")}
                    </th>
                    <th className="px-3 md:px-6 py-4 text-left text-size4 border-r border-darkBlue last:border-r-0">
                      {t("Video Streaming Delay (Sec)")}
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="bg-[#1F2937] text-white">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={showSpeedColumns ? 6 : 5}
                    className="text-center py-16 text-gray-500"
                  >
                    {t("No results found")}
                  </td>
                </tr>
              ) : (
                paginated.map((r, i) => (
                  <tr key={r.testId + i} className="border-t border-gray-200">
                    <td className="px-3 md:px-6 py-4 text-size4">
                      {r.dateTime}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-size4">
                      {formatNetwork(r.networkType)}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-size4">{r.testId}</td>

                    {showSpeedColumns && (
                      <>
                        <td className="px-3 md:px-6 py-4 text-size4">
                          {formatValue(r.latency)}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-size4">
                          {formatValue(r.download)}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-size4">
                          {formatValue(r.upload)}
                        </td>
                      </>
                    )}

                    {showDelayColumns && (
                      <>
                        <td className="px-3 md:px-6 py-4 text-size4">
                          {formatDelay(r.webBrowsing)}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-size4">
                          {formatDelay(r.videoStreaming)}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination - unchanged */}
      {processedData.length > 0 && (
        <Fragment>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 my-6 text-xs sm:text-sm hidden md:flex">
            <TotalItems t={t} totalItems={totalItems} />
            <Paginations
              setCurrentPage={setCurrentPage}
              currentPage={currentPage}
              totalPages={totalPages}
            />
            <PerPage
              t={t}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              gotoInput={gotoInput}
              setGotoInput={setGotoInput}
              handleGoto={handleGoto}
              currentPage={currentPage}
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-3 my-6 text-xs sm:text-sm md:hidden">
            <Paginations
              setCurrentPage={setCurrentPage}
              currentPage={currentPage}
              totalPages={totalPages}
            />
            <div className="order-2 md:order-1 flex w-full md:w-auto justify-between items-center sm:gap-6 gap-[2rem] text-white">
              <TotalItems t={t} totalItems={totalItems} />
              <PerPage
                t={t}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                gotoInput={gotoInput}
                setGotoInput={setGotoInput}
                handleGoto={handleGoto}
                currentPage={currentPage}
              />
            </div>
          </div>
        </Fragment>
      )}
    </div>
  );
}

// Pagination components remain exactly the same
const Paginations = ({
  setCurrentPage,
  currentPage,
  totalPages,
}: {
  setCurrentPage: (page: any) => void;
  currentPage: number;
  totalPages: number;
}) => (
  <div className="flex flex-wrap justify-center md:justify-end items-center gap-1 sm:gap-2 w-full md:w-auto">
    <button
      onClick={() => setCurrentPage(1)}
      disabled={currentPage === 1}
      className="p-1.5 sm:p-2 rounded hover:bg-darkPrimary disabled:cursor-not-allowed"
    >
      <ChevronsLeft size={18} />
    </button>
    <button
      onClick={() => setCurrentPage((p: any) => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className="p-1.5 sm:p-2 rounded hover:bg-darkPrimary disabled:cursor-not-allowed"
    >
      <ChevronLeft size={18} />
    </button>
    <div className="flex gap-0.5 sm:gap-1">
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((page) => {
          if (totalPages <= 7) return true;
          if (currentPage <= 4) return page <= 6 || page === totalPages;
          if (currentPage >= totalPages - 3)
            return page >= totalPages - 5 || page === 1;
          return (
            page === 1 ||
            (page >= currentPage - 2 && page <= currentPage + 2) ||
            page === totalPages
          );
        })
        .map((page, idx, arr) => {
          const prev = arr[idx - 1];
          const showDots = prev && page - prev > 1;
          return (
            <React.Fragment key={page}>
              {showDots && (
                <span className="px-1 sm:px-2 text-gray-500">...</span>
              )}
              <button
                onClick={() => setCurrentPage(page)}
                className={`w-7 sm:w-9 h-7 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition ${
                  currentPage === page
                    ? "text-white border border-darkYellow"
                    : "hover:bg-darkPrimary text-white font-medium"
                }`}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}
    </div>
    <button
      onClick={() => setCurrentPage((p: any) => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      className="p-1.5 sm:p-2 rounded hover:bg-darkPrimary disabled:cursor-not-allowed"
    >
      <ChevronRight size={18} />
    </button>
    <button
      onClick={() => setCurrentPage(totalPages)}
      disabled={currentPage === totalPages}
      className="p-1.5 sm:p-2 rounded hover:bg-darkPrimary disabled:cursor-not-allowed"
    >
      <ChevronsRight size={18} />
    </button>
  </div>
);

const TotalItems = ({
  t,
  totalItems,
}: {
  t: (key: string) => string;
  totalItems: number;
}) => (
  <div className="text-size3">
    {t("Total ")}
    {totalItems} {t(`item${totalItems === 1 ? "" : "s"}`)}
  </div>
);

const PerPage = ({
  t,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  totalPages,
  gotoInput,
  setGotoInput,
  handleGoto,
  currentPage,
}: {
  t: (key: string) => string;
  itemsPerPage: number;
  setItemsPerPage: (itemsPerPage: number) => void;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  gotoInput: string;
  setGotoInput: (gotoInput: string) => void;
  handleGoto: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  currentPage: number;
}) => (
  <div className="flex items-center gap-2">
    <select
      value={itemsPerPage}
      onChange={(e) => {
        setItemsPerPage(+e.target.value);
        setCurrentPage(1);
      }}
      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-darkPrimary border border-white text-white rounded-lg text-size4"
    >
      <option value={10}>10 / page</option>
      <option value={15}>15 / page</option>
      <option value={20}>20 / page</option>
      <option value={50}>50 / page</option>
    </select>
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="text-size4">Go to</span>
      <input
        type="number"
        min="1"
        max={totalPages}
        value={gotoInput}
        onChange={(e) => setGotoInput(e.target.value)}
        onKeyDown={handleGoto}
        placeholder={currentPage.toString()}
        className="w-10 sm:w-16 px-2 py-1.5 sm:py-2 bg-transparent border border-white text-white rounded-lg text-center text-size4"
      />
    </div>
  </div>
);
