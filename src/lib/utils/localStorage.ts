/**
 * Utility functions for storing and retrieving test results from localStorage
 * COMPLETELY REWRITTEN - Fresh implementation with Master ID support
 */

export interface StoredTestResult {
  testId: string;
  masterId?: string; // Master ID for continuous tests
  masterUuid?: string; // Master UUID for continuous tests
  dateTime: string;
  networkType: string;
  testType: string;
  latency: number | null;
  download: number | null;
  upload: number | null;
  webBrowsing: number | null;
  videoStreaming: number | null;
}

export interface MasterTestGroup {
  masterId: string;
  masterUuid: string;
  dateTime: string;
  testCount: number;
  tests: StoredTestResult[];
}

const TEST_RESULTS_KEY = "trai_test_results_history";

/**
 * Get all test results from localStorage
 */
export const getTestResultsFromStorage = (): StoredTestResult[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(TEST_RESULTS_KEY);
    if (!stored) return [];

    const results = JSON.parse(stored);
    // console.log('📖 Loaded test results from localStorage:', results.length, 'entries');
    return results;
  } catch (error) {
    // console.error("❌ Error reading test results from localStorage:", error);
    return [];
  }
};

/**
 * Save a new test result to localStorage
 * IMPROVED LOGIC:
 * - Waits 2 seconds before saving
 * - Prevents duplicates by checking testId + timestamp combination
 * - Supports continuous testing with multiple tests
 */
export const saveTestResultToStorage = async (
  result: StoredTestResult
): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    // console.log("⏳ Waiting 2 seconds before saving result...");

    // Wait 2 seconds after displaying result
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const existing = getTestResultsFromStorage();

    // Check for duplicates by testId AND dateTime (more robust)
    const isDuplicate = existing.some(
      (item) =>
        item.testId === result.testId && item.dateTime === result.dateTime
    );

    if (isDuplicate) {
      // console.log(
      //   "⚠️ Duplicate test result detected (same ID and time), skipping:",
      //   result.testId
      // );
      return;
    }

    // Add new result at the beginning (newest first)
    const updated = [result, ...existing];

    // Keep only last 100 results
    const limited = updated.slice(0, 100);

    localStorage.setItem(TEST_RESULTS_KEY, JSON.stringify(limited));
    // console.log("✅ Test result saved successfully:", result.testId);
    // console.log("📊 Total entries now:", limited.length);
  } catch (error) {
    // console.error("❌ Error saving test result to localStorage:", error);
  }
};

/**
 * Clear all test results from localStorage
 */
export const clearTestResultsFromStorage = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(TEST_RESULTS_KEY);
    // console.log("🗑️ All test results cleared from localStorage");
  } catch (error) {
    // console.error("❌ Error clearing test results from localStorage:", error);
  }
};

/**
 * Get test results grouped by master ID (for continuous tests)
 * Returns array of master test groups + individual tests
 */
export const getGroupedTestResults = (): (
  | MasterTestGroup
  | StoredTestResult
)[] => {
  if (typeof window === "undefined") return [];

  try {
    const allResults = getTestResultsFromStorage();
    const grouped: Map<string, MasterTestGroup> = new Map();
    const individual: StoredTestResult[] = [];

    allResults.forEach((result) => {
      if (result.masterId && result.masterUuid) {
        // This is part of a continuous test
        const key = result.masterId;

        if (!grouped.has(key)) {
          grouped.set(key, {
            masterId: result.masterId,
            masterUuid: result.masterUuid,
            dateTime: result.dateTime,
            testCount: 0,
            tests: [],
          });
        }

        const group = grouped.get(key)!;
        group.tests.push(result);
        group.testCount = group.tests.length;
      } else {
        // Individual test (not part of continuous testing)
        individual.push(result);
      }
    });

    // Combine grouped and individual tests, then sort by dateTime (latest first)
    const result: (MasterTestGroup | StoredTestResult)[] = [
      ...Array.from(grouped.values()),
      ...individual,
    ].sort((a, b) => {
      // Parse dateTime strings to compare (format: "DD MMM YYYY, HH:MM am/pm")
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
    });

    // console.log("📊 Grouped test results:", result.length, "items");
    return result;
  } catch (error) {
    // console.error("❌ Error grouping test results:", error);
    return [];
  }
};
