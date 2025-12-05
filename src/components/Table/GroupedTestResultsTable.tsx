"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  getGroupedTestResults,
  type MasterTestGroup,
  type StoredTestResult,
} from "@/lib/utils/localStorage";
import { useTranslation } from "@/hooks/useTranslation";

type TestFilter = "all" | "quick" | "full" | "continuous";

/**
 * GroupedTestResultsTable - Shows test results with master ID grouping
 * Master ID rows are collapsible to show nested test details
 * Supports pagination with customizable rows per page
 */
export const GroupedTestResultsTable = () => {
  const t = useTranslation();
  const [results, setResults] = useState<
    (MasterTestGroup | StoredTestResult)[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [expandedMasters, setExpandedMasters] = useState<Set<string>>(
    new Set()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [activeFilter, setActiveFilter] = useState<TestFilter>("all");

  useEffect(() => {
    const loadResults = () => {
      try {
        const groupedResults = getGroupedTestResults();
        setResults(groupedResults);
      } catch (error) {
        // console.error('Error loading test results:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  const toggleMaster = (masterId: string) => {
    setExpandedMasters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(masterId)) {
        newSet.delete(masterId);
      } else {
        newSet.add(masterId);
      }
      return newSet;
    });
  };

  const isMasterGroup = (
    item: MasterTestGroup | StoredTestResult
  ): item is MasterTestGroup => {
    return "tests" in item && "testCount" in item;
  };

  // Filter results based on test type
  const filteredResults = useMemo(() => {
    if (activeFilter === "all") return results;

    return results.filter((item) => {
      if (isMasterGroup(item)) {
        // For master groups (Continuous Test), always show in continuous filter
        // Hide in quick/full filters since continuous tests are their own category
        return activeFilter === "continuous";
      } else {
        // For individual tests, check the testType
        const testType = item.testType || "";

        switch (activeFilter) {
          case "quick":
            return testType.toLowerCase().includes("quick");
          case "full":
            return testType.toLowerCase().includes("full");
          case "continuous":
            // Individual continuous tests shouldn't normally exist, but handle them
            return testType.toLowerCase().includes("continuous");
          default:
            return true;
        }
      }
    });
  }, [results, activeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredResults.length / rowsPerPage);
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredResults.slice(startIndex, endIndex);
  }, [filteredResults, currentPage, rowsPerPage]);

  // Reset to page 1 when changing rows per page or filter
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: TestFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="w-full py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("Loading test results...")}
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <div className="max-w-md mx-auto">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t("No Test Results Yet")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t(
              "Run your first speed test to see results here. Your test history will be saved automatically."
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeFilter === "all"
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {t("All Tests")}
          </button>
          <button
            onClick={() => handleFilterChange("quick")}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeFilter === "quick"
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {t("Quick Test")}
          </button>
          <button
            onClick={() => handleFilterChange("full")}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeFilter === "full"
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {t("Full Test")}
          </button>
          <button
            onClick={() => handleFilterChange("continuous")}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeFilter === "continuous"
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {t("Continuous Test")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Pagination Controls - Top */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("Rows per page")}:
            </label>
            <select
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {t("Showing")}{" "}
              {filteredResults.length === 0
                ? 0
                : (currentPage - 1) * rowsPerPage + 1}{" "}
              {t("to")}{" "}
              {Math.min(currentPage * rowsPerPage, filteredResults.length)}{" "}
              {t("of")} {filteredResults.length} {t("results")}
            </span>
          </div>
        </div>

        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/50">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t("Date/Time")} ↓
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t("Test Type")}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    {t("Latency")}
                    <br />
                    <span className="text-[10px] font-normal">(ms)</span>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    {t("Download")}
                    <br />
                    <span className="text-[10px] font-normal">(Mbps)</span>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    {t("Upload")}
                    <br />
                    <span className="text-[10px] font-normal">(Mbps)</span>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    {t("Web Browsing")}
                    <br />
                    <span className="text-[10px] font-normal">(s)</span>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    {t("Video Streaming")}
                    <br />
                    <span className="text-[10px] font-normal">(s)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedResults.map((item, index) => {
                  if (isMasterGroup(item)) {
                    const isExpanded = expandedMasters.has(item.masterId);

                    return (
                      <React.Fragment key={`master-${item.masterId}`}>
                        {/* Master ID Row - Collapsible */}
                        <tr
                          className="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition-colors"
                          onClick={() => toggleMaster(item.masterId)}
                        >
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <svg
                                className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              {item.dateTime}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                              {t("Continuous Test")}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <div className="flex flex-col">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {t("Master ID")}: {item.masterId}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {item.testCount} {t("tests")}
                              </span>
                            </div>
                          </td>
                          <td
                            colSpan={5}
                            className="px-3 py-3 text-center text-sm text-gray-500 dark:text-gray-400 italic"
                          >
                            {t("Click to")}{" "}
                            {isExpanded ? t("collapse") : t("expand")}{" "}
                            {t("test details")}
                          </td>
                        </tr>

                        {/* Nested Test Rows - Only shown when expanded */}
                        {isExpanded &&
                          item.tests.map((test, testIndex) => (
                            <tr
                              key={`test-${test.testId}`}
                              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-blue-300 dark:border-blue-600"
                            >
                              <td className="px-3 py-3 pl-10 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {test.dateTime}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm">
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                                  {t(test.testType)}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                <span className="text-xs">
                                  #{testIndex + 1}
                                </span>{" "}
                                {test.testId}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                                {test.latency != null
                                  ? test.latency.toFixed(2)
                                  : "-"}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                                {test.download != null
                                  ? test.download.toFixed(2)
                                  : "-"}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                                {test.upload != null
                                  ? test.upload.toFixed(2)
                                  : "-"}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                                {test.webBrowsing != null
                                  ? test.webBrowsing.toFixed(0)
                                  : "-"}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                                {test.videoStreaming != null
                                  ? test.videoStreaming.toFixed(0)
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  } else {
                    // Individual test row (not part of continuous testing)
                    return (
                      <tr
                        key={`individual-${item.testId}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {item.dateTime}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                            {t(item.testType)}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {item.testId}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                          {item.latency != null ? item.latency.toFixed(2) : "-"}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                          {item.download != null
                            ? item.download.toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                          {item.upload != null ? item.upload.toFixed(2) : "-"}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                          {item.webBrowsing != null
                            ? item.webBrowsing.toFixed(0)
                            : "-"}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                          {item.videoStreaming != null
                            ? item.videoStreaming.toFixed(0)
                            : "-"}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls - Bottom */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-2 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {t("Page")} {currentPage} {t("of")} {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800"
            >
              {t("First")}
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800"
            >
              {t("Previous")}
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium ${
                      currentPage === pageNum
                        ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800"
            >
              {t("Next")}
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800"
            >
              {t("Last")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
