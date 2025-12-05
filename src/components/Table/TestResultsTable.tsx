"use client";
import { useEffect, useState, useMemo } from "react";
import { Table } from "./Table";
import { getTestResultsFromStorage } from "@/lib/utils/localStorage";
import type { TestResult } from "./Table.types";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * TestResultsTable - A pre-configured table component showing test results
 * Shows only real test results from localStorage (no mock data)
 */
export const TestResultsTable = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslation();

  useEffect(() => {
    // Get real test results from localStorage only
    const loadResults = () => {
      try {
        const storedResults = getTestResultsFromStorage();

        if (storedResults.length > 0) {
          // Convert stored results to table format
          const formattedResults: TestResult[] = storedResults.map(
            (result) => ({
              dateTime: result.dateTime,
              networkType: result.networkType,
              testType: result.testType,
              testId: result.testId,
              latency: result.latency,
              download: result.download,
              upload: result.upload,
              webBrowsing: result.webBrowsing,
              videoStreaming: result.videoStreaming,
            })
          );

          // Show only real results
          setResults(formattedResults);
        }
      } catch (error) {
        // console.error('Error loading test results:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  // Memoize the table component to prevent unnecessary re-renders
  const tableComponent = useMemo(() => {
    if (loading) {
      return (
        <div className="w-full py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">
            {t("Loading test results...")}
          </p>
        </div>
      );
    }

    // Show message if no tests have been completed
    if (results.length === 0) {
      return (
        <div className="w-full py-12 text-center">
          <div className="max-w-md mx-auto">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("No Test Results Yet")}
            </h3>
            <p className="text-sm text-gray-600">
              {t(
                "Run your first speed test to see results here. Your test history will be saved automatically."
              )}
            </p>
          </div>
        </div>
      );
    }

    return <Table data={results} />;
  }, [results, loading]);

  return tableComponent;
};
