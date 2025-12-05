import { TestResults } from '@/lib/types/speed-test';
import { Download, Upload, Wifi, Globe, Play } from 'lucide-react';
import { API_CONFIG } from '@/lib/constants';

interface ResultsDisplayProps {
  results: TestResults;
}

// Helper function to get all web test results
const getAllWebTestResults = (results: TestResults) => {
  const webResults: any[] = [];
  
  // Check for single web result (backward compatibility)
  if (results.web) {
    webResults.push({ ...results.web, testName: 'Web Test' });
  }
  
  // Check for multiple web results (web1, web2, web3, etc.)
  let webIndex = 1;
  while ((results as any)[`web${webIndex}`]) {
    const webResult = (results as any)[`web${webIndex}`];
    webResults.push({ 
      ...webResult, 
      testName: `Web Test ${webIndex}`,
      hostname: new URL(webResult.url).hostname 
    });
    webIndex++;
  }
  
  return webResults;
};

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Results</h2>
        <p className="text-gray-600">
          Completed at {new Date(results.timestamp).toLocaleString()}
        </p>
        {results.scenario && (
          <p className="text-sm text-gray-500 mt-1">
            Scenario: {results.scenario.name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Download Speed */}
        {results.download && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Download</h3>
              </div>
              <span className="text-xs text-gray-500">
                {results.download.threads.length} threads
              </span>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {Math.round(results.download.speed)}
              </div>
              <div className="text-sm text-gray-500 mb-3">Mbps</div>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div>Duration: {(results.download.duration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(2)}s</div>
                <div>Data: {(results.download.bytes / (API_CONFIG.CONVERSIONS.BYTES_TO_MB)).toFixed(2)} MB</div>
              </div>
            </div>

            {/* Thread breakdown */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-gray-500 mb-2">Thread Performance:</div>
              <div className="space-y-1">
                {results.download.threads.map((thread) => (
                  <div key={thread.threadId} className="flex justify-between text-xs">
                    <span>Thread {thread.threadId + 1}</span>
                    <span>{thread.speed} Mbps</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload Speed */}
        {results.upload && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Upload</h3>
              </div>
              <span className="text-xs text-gray-500">
                {results.upload.threads.length} threads
              </span>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {Math.round(results.upload.speed)}
              </div>
              <div className="text-sm text-gray-500 mb-3">Mbps</div>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div>Duration: {(results.upload.duration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(2)}s</div>
                <div>Data: {(results.upload.bytes / (API_CONFIG.CONVERSIONS.BYTES_TO_MB)).toFixed(2)} MB</div>
              </div>
            </div>

            {/* Thread breakdown */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-gray-500 mb-2">Thread Performance:</div>
              <div className="space-y-1">
                {results.upload.threads.map((thread) => (
                  <div key={thread.threadId} className="flex justify-between text-xs">
                    <span>Thread {thread.threadId + 1}</span>
                    <span>{thread.speed} Mbps</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Latency */}
        {results.latency && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Wifi className="h-5 w-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">Latency</h3>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {results.latency.average.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">ms average</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Min</div>
                  <div className="font-medium">{results.latency.min.toFixed(2)} ms</div>
                </div>
                <div>
                  <div className="text-gray-500">Max</div>
                  <div className="font-medium">{results.latency.max.toFixed(2)} ms</div>
                </div>
                <div>
                  <div className="text-gray-500">Jitter</div>
                  <div className="font-medium">{results.latency.jitter.toFixed(2)} ms</div>
                </div>
                <div>
                  <div className="text-gray-500">Packet Loss</div>
                  <div className="font-medium">{results.latency.packetLoss.toFixed(2)}%</div>
                </div>
              </div>

              <div className="pt-3 border-t text-xs text-gray-600">
                <div>Packets sent: {results.latency.packetsSent}</div>
                <div>Packets received: {results.latency.packetsReceived}</div>
              </div>
            </div>
          </div>
        )}

        {/* Web Tests */}
        {(() => {
          const webResults = getAllWebTestResults(results);
          return webResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="h-5 w-5 text-orange-600" />
                <h3 className="font-medium text-gray-900">
                  Web Test{webResults.length > 1 ? 's' : ''} ({webResults.length})
                </h3>
              </div>
              
              {webResults.length === 1 ? (
                // Single web test - original layout
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {(webResults[0].browsingDelay / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Browsing Delay (seconds)</div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">URL</div>
                      <div className="font-medium text-xs break-all">
                        {webResults[0].hostname || new URL(webResults[0].url).hostname}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Data Transferred</div>
                      <div className="font-medium">
                        {(webResults[0].bytes_transferred / API_CONFIG.CONVERSIONS.BYTES_TO_KB).toFixed(1)} KB
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Throughput</div>
                      <div className="font-medium">{webResults[0].bytes_sec.toFixed(1)} Bytes/sec</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t text-xs text-gray-600">
                    <div>Duration: {webResults[0].duration.toFixed(1)}s</div>
                    <div>Status: {webResults[0].success ? '✓ Success' : '✗ Failed'}</div>
                    {webResults[0].error && (
                      <div className="text-red-600">Error: {webResults[0].error}</div>
                    )}
                  </div>
                </div>
              ) : (
                // Multiple web tests - compact layout
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="text-center bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-semibold text-orange-600">
                      {(webResults.reduce((sum, web) => sum + web.browsingDelay, 0) / webResults.length / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Average Browsing Delay (seconds)</div>
                  </div>

                  {/* Individual Results */}
                  <div className="grid gap-3">
                    {webResults.map((web, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">{web.testName}</div>
                          <div className="text-sm font-semibold text-orange-600">
                            {(web.browsingDelay / API_CONFIG.CONVERSIONS.MS_TO_SECONDS).toFixed(2)}s
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>{web.url}</span>
                            <span>{web.success ? '✓ Success' : '✗ Failed'}</span>
                          </div>
                          {web.error && (
                            <div className="text-red-600">Error: {web.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Streaming Test */}
        {results.streaming && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Play className="h-5 w-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">Streaming Test</h3>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {results.streaming.totalDelay.toFixed(0)}ms
                </div>
                <div className="text-sm text-gray-500">Total Delay</div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Video Start Time</div>
                  <div className="font-medium">{results.streaming.videoStartTime.toFixed(0)}ms</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Bytes Transferred</div>
                  <div className="font-medium">{(results.streaming.totalBytesTransferred / API_CONFIG.CONVERSIONS.BYTES_TO_KB).toFixed(1)} KB</div>
                </div>
              </div>

              <div className="pt-3 border-t text-xs text-gray-600">
                <div>Status: {results.streaming.success ? '✓ Success' : '✗ Failed'}</div>
                {results.streaming.error && (
                  <div className="text-red-600">Error: {results.streaming.error}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Environment Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Test Environment</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Browser</div>
            <div className="font-mono text-xs break-all">
              {results.environment.userAgent.split(' ')[0]}
            </div>
          </div>
          
          {results.environment.connection && (
            <div>
              <div className="text-gray-500">Connection Type</div>
              <div>
                {results.environment.connection.effectiveType || 'Unknown'}
                {results.environment.connection.downlink && (
                  <span className="text-gray-400">
                    {' '}({results.environment.connection.downlink} Mbps)
                  </span>
                )}
              </div>
            </div>
          )}
          
          {results.environment.geolocation && (
            <div>
              <div className="text-gray-500">Location</div>
              <div className="font-mono text-xs">
                {results.environment.geolocation.latitude.toFixed(4)}, {results.environment.geolocation.longitude.toFixed(4)}
              </div>
            </div>
          )}
          
          {results.environment.isp && (
            <div>
              <div className="text-gray-500">ISP</div>
              <div>{results.environment.isp.isp}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}