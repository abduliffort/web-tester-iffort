import { Play, Square, RotateCcw } from 'lucide-react';

interface TestControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset?: () => void;
}

export function TestControls({ isRunning, onStart, onStop, onReset }: TestControlsProps) {
  return (
    <div className="flex justify-center space-x-4">
      {!isRunning ? (
        <>
          <button
            onClick={onStart}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Play className="h-5 w-5" />
            <span>Start Speed Test</span>
          </button>
          
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          )}
        </>
      ) : (
        <button
          onClick={onStop}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Square className="h-5 w-5" />
          <span>Stop Test</span>
        </button>
      )}
    </div>
  );
}