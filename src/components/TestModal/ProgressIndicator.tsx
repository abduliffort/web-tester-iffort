import React from 'react';

interface ProgressIndicatorProps {
  currentStep: string;
  progress: number;
  liveResults?: {
    latency?: number;
    download?: number;
    upload?: number;
    web?: number;
    streaming?: number;
  };
  completedSteps?: string[];
}

interface StepProgress {
  [key: string]: number; // Store individual progress for each step
}

interface StepLabel {
  label: string;
  value: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

interface ProgressMetric {
  label: string;
  value: string;
  unit: string;
}

const stepLabels: Record<string, StepLabel> = {
  latency: {label: 'Latency', value: '0ms', bgColor: 'bg-green-50', textColor: 'text-green-700', icon: '↓' },
  download: { label: 'Download Speed', value: '0Mbps', bgColor: 'bg-green-50', textColor: 'text-green-700', icon: '↓' },
  upload: { label: 'Upload Speed', value: '0Mbps', bgColor: 'bg-orange-50', textColor: 'text-orange-700', icon: '↑' },
  web: { label: 'Web Browsing Delay', value: '0Mbps', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', icon: '🌐' },
  streaming: { label: 'Video Streaming Delay', value: '0ms', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', icon: '▶' }
};

const progressMetrics: Record<string, ProgressMetric> = {
  latency: { label: 'Latency', value: '0ms', unit: 'ms' },
  download: { label: 'Download Speed', value: '0', unit: 'Mbps' },
  upload: { label: 'Upload Speed', value: '0', unit: 'Mbps' },
  web: { label: 'Web Browsing Delay', value: '0', unit: 'ms' },
  streaming: { label: 'Video Streaming Delay', value: '0', unit: 'ms' },
};

const stepOrder = ['latency', 'download', 'upload', 'web', 'streaming'];

export function ProgressIndicator({ currentStep, progress, liveResults, completedSteps = [] }: ProgressIndicatorProps) {
  // Handle multiple web tests (web1, web2, etc.) by treating them as 'web'
  const normalizedStep = currentStep.match(/^web\d+$/) ? 'web' : currentStep;
  
  const currentStepIndex = stepOrder.indexOf(normalizedStep);
  
  // Track progress for each step individually
  const [stepProgress, setStepProgress] = React.useState<StepProgress>({});
  
  // Update the current step's progress
  React.useEffect(() => {
    if (normalizedStep && progress !== undefined) {
      setStepProgress(prev => ({
        ...prev,
        [normalizedStep]: progress
      }));
    }
  }, [normalizedStep, progress]);
  
  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col gap-3 w-full max-w-xl">
        {stepOrder.map((step, index) => {
          const isCompleted = completedSteps.includes(step) || index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const currentProgress = stepProgress[step] || 0;
          const metric = progressMetrics[step] || { label: step, value: '0', unit: '' };

          const hasValue = metric.value !== '00' && metric.value !== '0';
          const colorDot = isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300';
          const colorBg = isCompleted ? 'bg-green-50/50' : isCurrent ? 'bg-blue-50/50' : 'bg-gray-50';
          
          return (
            <div key={index} className="flex flex-col gap-2">
              <div
                className={`flex items-center justify-between px-6 py-4 rounded-xl ${hasValue ? colorBg : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${colorDot}`} />
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900">{metric.value}</span>
                  <span className="text-sm text-gray-500 ml-1.5">{metric.unit}</span>
                </div>
              </div>
              
              {/* Show individual progress bar for current test OR completed tests */}
              {(isCurrent || (isCompleted && currentProgress === 100)) && (
                <div className="px-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ease-out ${
                        isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(Math.max(currentProgress, 0), 100)}%` }}
                    />
                  </div>
                  <div className={`text-xs mt-1 text-right ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                    {isCompleted ? '100% Complete' : `${Math.round(currentProgress)}%`}
                  </div>
                </div>
              )}
              
              {/* Show completed checkmark for finished tests */}
              {isCompleted && (
                <div className="px-6">
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Completed</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>




        {/* {results?.latency && results?.latency.packetLoss && results?.latency.jitter && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              Latency: <strong>{results?.latency.average.toFixed(2)}</strong>
            </span>
            <span className="px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              Packet Loss: <strong>{results.latency.packetLoss.toFixed(2)}%</strong>
            </span>
            <span className="px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              Jitter: <strong>{results.latency.jitter.toFixed(2)} ms</strong>
            </span>
          </div>
        )} */}

      {currentStep === 'authentication' && (
        <div className="mt-4 text-sm text-gray-600">
          Authenticating with TRAI API server...
        </div>
      )}

      {currentStep === 'latency' && (
        <div className="mt-4 text-sm text-gray-600">
          Testing network latency, jitter, and packet loss...
        </div>
      )}
      
      {currentStep === 'download' && (
        <div className="mt-4 text-sm text-gray-600">
          Downloading test files using multiple concurrent connections...
        </div>
      )}
      
      {currentStep === 'upload' && (
        <div className="mt-4 text-sm text-gray-600">
          Uploading test data using multiple concurrent connections...
        </div>
      )}
      
      {currentStep === 'web' && (
        <div className="mt-4 text-sm text-gray-600">
          Loading web page and measuring page load time...
        </div>
      )}
      
      {currentStep === 'streaming' && (
        <div className="mt-4 text-sm text-gray-600">
          Streaming video and measuring quality, buffering, and lag events...
        </div>
      )}
    </div>
  );

  // const finalResults = [
  //     { label: 'Authentication', value: results?.download, bgColor: 'bg-green-50', textColor: 'text-green-700', icon: '↓' },
  //     { label: 'Latency', value: results?.download, bgColor: 'bg-green-50', textColor: 'text-green-700', icon: '↓' },
  //     { label: 'Download Speed', value: results?.download, bgColor: 'bg-green-50', textColor: 'text-green-700', icon: '↓' },
  //     { label: 'Upload Speed', value: results?.upload, bgColor: 'bg-orange-50', textColor: 'text-orange-700', icon: '↑' },
  //     { label: 'Web Browsing Delay', value: results?.latency, bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', icon: '🌐' },
  //     { label: 'Video Streaming Delay', value: results?.streaming?.totalDelay.toFixed(0)+'ms', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', icon: '▶' },
  //   ];

  //   return (
  //     <div className="w-full max-w-4xl">
  //       <p className="text-center text-gray-600 mb-8 text-base">Here are the results -</p>
  //       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  //         {finalResults.map((result, index) => (
  //           <div key={index} className={`flex flex-col items-center justify-center p-6 rounded-xl ${result.bgColor}`}>
  //             <div className="flex items-baseline gap-1 mb-3">
  //               <span className={`text-3xl font-bold ${result.textColor}`}>{result.value}</span>
  //               <span className={`text-sm font-semibold ${result.textColor}`}>{result.value}</span>
  //             </div>
  //             <span className="text-xs text-center font-medium text-gray-600">{result.label}</span>
  //           </div>
  //         ))}
  //       </div>
  //       {results?.latency && results?.latency.packetLoss && results?.latency.jitter && (
  //         <div className="flex items-center justify-center gap-3 flex-wrap">
  //           <span className="px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
  //             Latency: <strong>{results?.latency.average.toFixed(2)}</strong>
  //           </span>
  //           <span className="px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
  //             Packet Loss: <strong>{results.latency.packetLoss.toFixed(2)}%</strong>
  //           </span>
  //           <span className="px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
  //             Jitter: <strong>{results.latency.jitter.toFixed(2)} ms</strong>
  //           </span>
  //         </div>
  //       )}
  //     </div>
  //   );
}