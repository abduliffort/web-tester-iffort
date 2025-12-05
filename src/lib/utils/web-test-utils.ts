/**
 * Utilities for handling multiple web test results
 */

import { TestResults, WebTestResult, WebTestSummary } from '../types/speed-test';

/**
 * Extract all web test results from TestResults and calculate summary
 */
export function calculateWebTestSummary(testResults: TestResults): WebTestSummary | null {
  const webResults: WebTestResult[] = [];
  
  // Check for single web test (backward compatibility)
  if (testResults.web) {
    webResults.push(testResults.web);
  }
  
  // Extract all numbered web test results (web1, web2, web3, etc.)
  Object.keys(testResults).forEach(key => {
    if (key.startsWith('web') && key.match(/^web\d+$/)) {
      const webResult = (testResults as any)[key] as WebTestResult;
      if (webResult) {
        webResults.push(webResult);
      }
    }
  });
  
  if (webResults.length === 0) {
    return null;
  }
  
  // Calculate summary statistics
  const successfulResults = webResults.filter(result => result.success);
  const failedResults = webResults.filter(result => !result.success);
  
  // Calculate average browsing delay from successful tests only
  const averageBrowsingDelay = successfulResults.length > 0
    ? successfulResults.reduce((sum, result) => sum + result.browsingDelay, 0) / successfulResults.length
    : 0;
  
  return {
    averageBrowsingDelay: Number(averageBrowsingDelay.toFixed(2)),
    totalUrls: webResults.length,
    successfulUrls: successfulResults.length,
    failedUrls: failedResults.length,
    individualResults: webResults
  };
}

/**
 * Get individual web test results as array for display
 */
export function getWebTestResults(testResults: TestResults): WebTestResult[] {
  const webResults: WebTestResult[] = [];
  
  // Check for single web test (backward compatibility)
  if (testResults.web) {
    webResults.push(testResults.web);
  }
  
  // Extract all numbered web test results
  Object.keys(testResults).forEach(key => {
    if (key.startsWith('web') && key.match(/^web\d+$/)) {
      const webResult = (testResults as any)[key] as WebTestResult;
      if (webResult) {
        webResults.push(webResult);
      }
    }
  });
  
  return webResults;
}

/**
 * Check if test results contain any web tests
 */
export function hasWebTests(testResults: TestResults): boolean {
  return (
    !!testResults.web || 
    Object.keys(testResults).some(key => 
      key.startsWith('web') && key.match(/^web\d+$/)
    )
  );
}