export type TestResult = {
  dateTime: string;
  networkType: string;
  testType: string;
  testId: string;
  latency: number | null;
  download: number | null;
  upload: number | null;
  webBrowsing: number | null;
  videoStreaming: number | null;
};

export type TableProps = {
  data: TestResult[];
  className?: string;
};
