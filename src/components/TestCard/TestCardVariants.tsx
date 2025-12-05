'use client';
import { TestCard } from './TestCard';
import { TestCardContent } from './TestCardContent';
import { QuickTestIcon, FullTestIcon, ContinuousTestIcon } from '../icons';
import { useTranslation } from '@/hooks/useTranslation';
import { ENV_CONFIG } from '@/lib/constants';

interface TestCardProps {
  loadSpeedTest: (scenarioId: number) => void;
}

export const QuickTestCard: React.FC<TestCardProps> = ({loadSpeedTest}) => {
  const t = useTranslation();
  return (
    <TestCard variant="quick">
      <TestCardContent
        icon={<QuickTestIcon />}
        title={t("Quick Test")}
        description={t("Check speed, latency, packet loss, and jitter as you move.")}
        buttonText={t("Start Quick Test")}
        badge={t("Best")}
        onButtonClick={() => loadSpeedTest(ENV_CONFIG.SCENARIOS.QUICK_TEST_ID)}
      />
    </TestCard>
  );
};

export const FullTestCard: React.FC<TestCardProps> = ({loadSpeedTest}) => {
  const t = useTranslation();
  return (
    <TestCard variant="full">
      <TestCardContent
        icon={<FullTestIcon />}
        title={t("Full Test")}
        description={t("Check speed, latency, packet loss, jitter, streaming, delay.")}
        buttonText={t("Start Full Test")}
        badge={t("RECOMMENDED")}
        onButtonClick={() => loadSpeedTest(ENV_CONFIG.SCENARIOS.FULL_TEST_ID)}
      />
    </TestCard>
  );
};

export const ContinuousTestCard: React.FC<TestCardProps> = ({loadSpeedTest}) => {
  const t = useTranslation();
  return (
    <TestCard variant="continuous">
      <TestCardContent
        icon={<ContinuousTestIcon />}
        title={t("Continuous Test")}
        description={t("Check how stable and dependable your internet is.")}
        buttonText={t("Start Continuous Test")}
        badge={t("ADVANCED")}
        onButtonClick={() => loadSpeedTest(ENV_CONFIG.SCENARIOS.CONTINUOUS_TEST_ID)}
      />
    </TestCard>
  );
};
