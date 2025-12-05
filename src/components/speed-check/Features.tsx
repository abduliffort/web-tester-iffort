import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
    return (
      <div className="text-center p-6">
        <div className="flex justify-center mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    );
  };
  
  const Features = () => {
    const features = [
      { icon: <svg />, title: 'We Test Response Time (Latency)', description: 'This shows how quickly your internet reacts when you take action. Lower is better.' },
      { icon: <svg />, title: 'We Check Your Network Speed', description: 'See how fast you can download and upload things like apps, files, and photos.' },
      { icon: <svg />, title: 'We Test Website Loading Time', description: 'Find out how long do everyday sites (like news, shopping, or social media) open on your internet.' },
      { icon: <svg />, title: 'We Test Video Streaming Quality', description: 'See if videos play smoothly without pauses or buffering, even in HD or Full HD.' },
    ];
  
    return (
      <section className="bg-gray-50 py-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} icon={feature.icon} title={feature.title} description={feature.description} />
          ))}
        </div>
      </section>
    );
  };
  
  export default Features;