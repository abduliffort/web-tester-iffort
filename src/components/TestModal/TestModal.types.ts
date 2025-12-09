export type TestStatus = "idle" | "in-progress" | "completed";

export type TestType = "quick" | "full" | "continuous";

export type TestMetric = {
  label: string;
  value: string;
  unit: string;
  color?: string;
  icon?: React.ReactNode;
};

export type TestDetail = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

export type TestResult = {
  downloadSpeed?: string;
  uploadSpeed?: string;
  latency?: string;
  webBrowsingDelay?: string;
  videoStreamingDelay?: string;
  packetLoss?: string;
  jitter?: string;
};

export type TestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  testType?: TestType;
  testStatus?: TestStatus;
  currentMetric?: string;
  estimatedTime?: string;
  testId?: string;
  dateTime?: string;
  connection?: string;
  technology?: string;
  operator?: string;
  location?: string;
  testResult?: TestResult;
  progressMetrics?: TestMetric[];
  onCancelTest?: () => void;
  onTestAgain?: (scenarioId?: number) => void;
  onExportResults?: () => void;
  onTestComplete?: (cycleId: string) => void;
  onTestRunningChange?: (isRunning: boolean) => void; // NEW: Notify parent when test state changes
  baseUrl: string;
  defaultScenarioId?: number;
  currentScenarioId?: number;
  masterId?: number;
  masterUuid?: string;
  isLastTest?: boolean; // NEW: Indicates if this is the last test in continuous mode
  setCurrentScenarioId?: (scenarioId: number | undefined) => void;
};

export type TestModalHandle = {
  triggerStop: () => void;
};
