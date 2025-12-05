import { cn } from '@/lib/utils';
import { 
  ResponseTimeFeatureCard, 
  NetworkSpeedFeatureCard, 
  WebsiteLoadingFeatureCard, 
  VideoStreamingFeatureCard 
} from './FeatureCardVariants';

interface FeatureSectionProps {
  className?: string;
}

export const FeatureSection = ({ className }: FeatureSectionProps) => {
  return (
    <div className={cn('w-full py-16 bg-gray-50', className)}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold font-sans text-gray-900 mb-4">
            Your Tests Build A <span className="text-blue-600">Stronger Network</span>
          </h2>
          <p className="text-gray-600 font-sans max-w-3xl mx-auto">
            When you test your internet speed, you help TRAI and Service Providers make networks 
            faster and more reliable for everyone in India.
          </p>
          <button className="mt-6 px-6 py-3 bg-blue-600 text-white font-sans font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            MEASURE. KNOW. IMPROVE.
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 justify-items-center">
          <ResponseTimeFeatureCard />
          <NetworkSpeedFeatureCard />
          <WebsiteLoadingFeatureCard />
          <VideoStreamingFeatureCard />
        </div>
      </div>
    </div>
  );
};
