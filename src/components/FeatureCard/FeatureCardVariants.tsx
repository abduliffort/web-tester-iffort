import { FeatureCard } from './FeatureCard';
import { 
  ResponseTimeIcon, 
  NetworkSpeedIcon, 
  WebsiteLoadingIcon, 
  VideoStreamingIcon 
} from '../icons';

export const ResponseTimeFeatureCard = () => (
  <FeatureCard
    icon={<ResponseTimeIcon />}
    title="We Test Response Time (Latency)"
    description="This shows how quickly your Internet reacts when you click or tap. Lower is better."
  />
);

export const NetworkSpeedFeatureCard = () => (
  <FeatureCard
    icon={<NetworkSpeedIcon />}
    title="We Check Your Network Speed"
    description="See how fast you can download and upload things like apps, files, and photos."
  />
);

export const WebsiteLoadingFeatureCard = () => (
  <FeatureCard
    icon={<WebsiteLoadingIcon />}
    title="We Test Website Loading Time"
    description="Find out how quickly everyday sites (like news, shopping, or social media) open on your internet."
  />
);

export const VideoStreamingFeatureCard = () => (
  <FeatureCard
    icon={<VideoStreamingIcon />}
    title="We Test Video Streaming Quality"
    description="See if videos play smoothly without pauses or buffering, even in HD or full HD."
  />
);
