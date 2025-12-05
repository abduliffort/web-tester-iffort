import React from 'react';

interface TestPreviewPanelProps {
  currentStep: string;
  progress: number;
  currentValue: number;
  maxValue: number;
  unit: string;
}

export const TestPreviewPanel: React.FC<TestPreviewPanelProps> = ({
  currentStep,
  progress
}) => {
  const getStepLabel = () => {
    switch (currentStep) {
      case 'latency': return 'Latency Test';
      case 'download': return 'Download Speed';
      case 'upload': return 'Upload Speed';
      case 'web': return 'Web Page Load';
      case 'streaming': return 'Video Streaming';
      default: return 'Testing...';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'latency': return 'Testing network latency and jitter';
      case 'download': return 'Measuring download speed from server';
      case 'upload': return 'Measuring upload speed to server';
      case 'web': return 'Loading web page and measuring time';
      case 'streaming': return 'Testing video streaming quality';
      default: return 'Running network performance tests...';
    }
  };

  // Show web iframe or streaming video for those tests
  const showMediaContainer = currentStep === 'web' || currentStep?.startsWith('web') || currentStep === 'streaming';

  if (showMediaContainer) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Media Container */}
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[400px]">
          {(currentStep === 'web' || currentStep?.startsWith('web')) && (
            <div id="web-test-container" className="w-full h-full bg-gray-50 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                <p className="text-sm font-medium">Loading web page...</p>
              </div>
            </div>
          )}
          
          {currentStep === 'streaming' && (
            <div id="streaming-test-container" className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
                <p className="text-sm font-medium">Preparing video stream...</p>
              </div>
            </div>
          )}

          {/* Progress Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="text-white">
              <p className="text-sm font-semibold mb-2">{getStepLabel()}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For non-media tests (latency, download, upload), show circular progress WITHOUT percentage
  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-8">
      {/* Circular Progress - Empty rotating circle */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 lg:w-60 lg:h-60">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-gray-100"
          />
          {/* Progress Circle - Rotating */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 0.45 * 100}`}
            strokeDashoffset={`${2 * Math.PI * 0.45 * 100 * (1 - progress / 100)}`}
            className={`transition-all duration-300 ${
              currentStep === 'latency' ? 'text-yellow-500' :
              currentStep === 'download' ? 'text-green-500' :
              currentStep === 'upload' ? 'text-blue-500' :
              'text-purple-500'
            }`}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Content - Empty, no percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Just the loading animation, no text */}
        </div>
      </div>

      {/* Label and Description */}
      <div className="text-center max-w-xs mt-4">
        <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{getStepLabel()}</p>
        <p className="text-xs sm:text-sm text-gray-600">{getStepDescription()}</p>
      </div>
    </div>
  );
};
