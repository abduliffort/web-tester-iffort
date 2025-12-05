interface ProgressIndicatorProps {
  currentStep: string;
  progress: number;
  completedSteps: string[]; // Added completedSteps property
}

const stepLabels: Record<string, string> = {
  latency: 'Testing Latency & Jitter',
  download: 'Testing Download Speed',
  upload: 'Testing Upload Speed',
  web: 'Testing Web Page Load Time',
  streaming: 'Testing Video Streaming'
};

const stepOrder = ['latency', 'download', 'upload', 'web', 'streaming'];

export function ProgressIndicator({ currentStep, progress, completedSteps }: ProgressIndicatorProps) {
  // Handle multiple web tests (web1, web2, etc.) by treating them as 'web'
  const normalizedStep = currentStep.match(/^web\d+$/) ? 'web' : currentStep;

  const currentStepIndex = stepOrder.indexOf(normalizedStep);
  const overallProgress = currentStepIndex >= 0 
    ? ((currentStepIndex * 100) + progress) / stepOrder.length 
    : progress;

  // For display, show which web test is running if multiple
  const displayLabel = currentStep.match(/^web\d+$/) 
    ? `Testing Web Page Load Time (${currentStep.replace('web', 'URL ')})`
    : stepLabels[currentStep] || currentStep;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900">
            {displayLabel}
          </h3>
          <span className="text-sm text-gray-500">
            {Math.round(overallProgress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {stepOrder.map((step, index) => {
          const isCompleted = completedSteps.includes(step); // Updated to use completedSteps
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                isCompleted 
                  ? 'bg-green-100 text-green-600' 
                  : isCurrent 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`text-xs text-center leading-tight ${
                isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {stepLabels[step]?.replace('Testing ', '') || step}
              </span>
            </div>
          );
        })}
      </div>

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
}