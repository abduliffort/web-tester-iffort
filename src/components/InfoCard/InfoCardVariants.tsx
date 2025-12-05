import { InfoCard } from './InfoCard';

export const WhatWeMeasureCard = () => (
  <InfoCard
    title="What We Measure:"
    items={[
      'Your network speed test results (like download, upload, and latency)',
      'Your location during the test (to map network performance)',
    ]}
  />
);

export const WhatWeDontCollectCard = () => (
  <InfoCard
    title="What We Don't Collect:"
    items={[
      'Personal data, messages, or browsing history',
      'Your contacts, photos, or apps',
    ]}
  />
);

export const WhyWeMeasureCard = () => (
  <InfoCard
    title="Why we Measure it:"
    items={[
      'To share anonymous network performance data with TRAI',
      'To help improve internet quality across India for better internet experience',
    ]}
  />
);
