import { LatencyResults, ActionConfig, Server } from "../types/speed-test";
import { TEST_CONFIG, API_CONFIG } from "../constants";
import { loggers } from "../utils/logger";

interface WebRTCLatencyTestParams {
  totalDuration: number;
  sendingDuration: number;
  waitingDuration: number;
  interPacketInterval: number;
  maxPackets: number;
  packetTimeout: number;
  packetSize: number;
}

interface SentPacket {
  id: number;
  sendTime: number;
  timeoutId: NodeJS.Timeout;
}

export class WebRTCLatencyTester {
  private config: ActionConfig;
  private server: Server | null;
  private logger = loggers.latency;

  // For live updates
  public currentLatency: number = 0;
  public currentJitter: number = 0;
  public currentPacketLoss: number = 0;

  constructor(config: ActionConfig, server: Server | null = null) {
    this.config = config;
    this.server = server;
  }

  async runTest(
    onProgress: (progress: number) => void,
    signal: AbortSignal
  ): Promise<LatencyResults> {
    this.logger.info(
      "Starting WebRTC UDP latency test with WebSocket TCP fallback"
    );

    // Extract parameters from scenario API (same as existing latency test)
    const totalDuration =
      (this.config.timeout || TEST_CONFIG.LATENCY.DEFAULT_TOTAL_DURATION_S) *
      API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
    const sendingDuration =
      (this.config.max_time
        ? parseInt(this.config.max_time)
        : TEST_CONFIG.LATENCY.DEFAULT_SEND_DURATION_S) *
      API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
    const waitingDuration = totalDuration - sendingDuration;
    const interPacketInterval = this.config.inter_packet_time
      ? parseInt(this.config.inter_packet_time)
      : TEST_CONFIG.LATENCY.PACKET_SEND_INTERVAL_MS;
    const maxPackets = this.config.datagrams
      ? parseInt(this.config.datagrams)
      : TEST_CONFIG.LATENCY.DEFAULT_PACKET_COUNT;
    const packetTimeout =
      (this.config.delay_timeout
        ? parseInt(this.config.delay_timeout)
        : TEST_CONFIG.LATENCY.DEFAULT_DELAY_TIMEOUT_S) *
      API_CONFIG.CONVERSIONS.SECONDS_TO_MS;
    const packetSize = TEST_CONFIG.LATENCY.DEFAULT_PACKET_SIZE;

    this.logger.info("TRAI Parameters from Scenario API", {
      totalDurationS: totalDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
      sendingDurationS: sendingDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
      waitingDurationS: waitingDuration / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
      packetSizeBytes: packetSize,
      intervalMs: interPacketInterval,
      maxPackets,
      packetTimeoutS: packetTimeout / API_CONFIG.CONVERSIONS.MS_TO_SECONDS,
    });

    const params: WebRTCLatencyTestParams = {
      totalDuration,
      sendingDuration,
      waitingDuration,
      interPacketInterval,
      maxPackets,
      packetTimeout,
      packetSize,
    };

    // Try WebRTC UDP first, fallback to WebSocket TCP if it fails
    try {
      this.logger.info("🔵 Attempting WebRTC UDP latency test...");
      // console.log("🔵 Trying WebRTC UDP first...");
      const result = await this.runWebRTCUDPLatencyTest(
        onProgress,
        signal,
        params
      );
      this.logger.info("✅ WebRTC UDP latency test completed successfully");
      // console.log("✅ WebRTC UDP successful!");
      return result;
    } catch (error) {
      this.logger.warn("⚠️ WebRTC UDP failed, falling back to WebSocket TCP", {
        error: error instanceof Error ? error.message : String(error),
      });
      // console.warn("⚠️ WebRTC UDP FAILED:", error);
      // console.log("🔄 Falling back to WebSocket TCP...");

      // Reset progress to 0 when falling back
      onProgress(0);

      try {
        const fallbackResult = await this.runWebSocketTCPFallback(
          onProgress,
          signal,
          params
        );

        // Check if WebSocket returned valid results
        if (
          fallbackResult.packetsReceived === 0 ||
          fallbackResult.average === 0
        ) {
          this.logger.warn(
            "[Latency] WebSocket TCP fallback returned 0, using HTTP ping fallback"
          );

          // Reset progress again for HTTP fallback
          onProgress(0);

          try {
            return await this.runHTTPPingFallback(onProgress, signal, params);
          } catch (httpError) {
            // console.error("❌ HTTP ping fallback failed:", httpError);
            // Return WebSocket result even if it's 0, better than crashing
            return fallbackResult;
          }
        }

        // console.log("✅ WebSocket TCP fallback successful!");
        return fallbackResult;
      } catch (fallbackError) {
        // console.error("❌ WebSocket TCP fallback ALSO failed:", fallbackError);
        this.logger.warn(
          "Both WebRTC and WebSocket failed, trying HTTP ping fallback"
        );

        // Reset progress for HTTP fallback
        onProgress(0);

        // Try HTTP ping as last resort
        try {
          return await this.runHTTPPingFallback(onProgress, signal, params);
        } catch (httpError) {
          // console.error("❌ All latency methods failed:", httpError);
          this.logger.error("All latency test methods failed", {
            fallbackError,
            httpError,
          });
          throw new Error(
            `All latency methods failed. WebRTC: ${
              error instanceof Error ? error.message : String(error)
            }, WebSocket: ${fallbackError}, HTTP: ${httpError}`
          );
        }
      }
    }
  }

  private async runWebRTCUDPLatencyTest(
    onProgress: (progress: number) => void,
    signal: AbortSignal,
    params: WebRTCLatencyTestParams
  ): Promise<LatencyResults> {
    // console.log("=== WEBRTC UDP LATENCY TEST ===");

    const {
      totalDuration,
      sendingDuration,
      waitingDuration,
      interPacketInterval,
      maxPackets,
      packetTimeout,
      packetSize,
    } = params;

    return new Promise((resolve, reject) => {
      let peerConnection: RTCPeerConnection | null = null;
      let dataChannel: RTCDataChannel | null = null;
      let connectionTimeout: NodeJS.Timeout | null = null;
      let testTimeout: NodeJS.Timeout | null = null;
      const sendingInterval: NodeJS.Timeout | null = null;

      const sentPackets = new Map<number, SentPacket>();
      const latencies: number[] = [];
      let packetsSent = 0;
      let packetsReceived = 0;
      let packetsLost = 0;
      let startTime = 0;

      const cleanup = () => {
        if (sendingInterval) clearInterval(sendingInterval);
        if (testTimeout) clearTimeout(testTimeout);
        if (connectionTimeout) clearTimeout(connectionTimeout);

        // Clear all packet timeouts
        sentPackets.forEach((packet) => clearTimeout(packet.timeoutId));
        sentPackets.clear();

        if (dataChannel) {
          dataChannel.close();
          dataChannel = null;
        }

        if (peerConnection) {
          peerConnection.close();
          peerConnection = null;
        }
      };

      const completeTest = () => {
        cleanup();

        // Mark remaining packets as lost
        packetsLost += sentPackets.size;

        const results = this.calculateLatencyResults(
          latencies,
          packetsSent,
          packetsReceived,
          packetsLost
        );
        // console.log("=== WEBRTC LATENCY TEST RESULTS ===");
        // console.log(`Packets Sent: ${packetsSent}`);
        // console.log(`Packets Received: ${packetsReceived}`);
        // console.log(`Packets Lost: ${packetsLost}`);
        // console.log(`Packet Loss: ${results.packetLoss}%`);
        // console.log(`Average Latency: ${results.average}ms`);
        // console.log(`Jitter (TRAI method): ${results.jitter}ms`);

        resolve(results);
      };

      // Handle abort signal
      signal.addEventListener("abort", () => {
        // console.log("WebRTC latency test aborted");
        cleanup();
        reject(new Error("Test aborted"));
      });

      try {
        // Create RTCPeerConnection with STUN servers
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: TEST_CONFIG.LATENCY.FALLBACK_STUN1 },
            { urls: TEST_CONFIG.LATENCY.FALLBACK_STUN2 },
            { urls: TEST_CONFIG.LATENCY.TRAI_STUN1 },
          ],
        });

        // Create data channel for latency testing
        dataChannel = peerConnection.createDataChannel("latency-test", {
          ordered: false,
          maxRetransmits: 0,
        });
        dataChannel.binaryType = "arraybuffer";

        // Connection timeout
        connectionTimeout = setTimeout(() => {
          this.logger.error("WebRTC connection timeout");
          cleanup();
          reject(new Error("WebRTC connection timeout"));
        }, TEST_CONFIG.LATENCY.WEBRTC_TIMEOUT_MS);

        dataChannel.onopen = () => {
          this.logger.info(
            "WebRTC UDP data channel opened, starting latency test"
          );
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }

          startTime = performance.now();
          onProgress(TEST_CONFIG.LATENCY.PROGRESS.CONNECTION_ESTABLISHED); // Connection established

          // Start precise packet sending with exact inter-packet timing
          const sendNextPacket = () => {
            const now = performance.now();
            const elapsed = now - startTime;

            // Stop sending after sendingDuration or maxPackets
            if (elapsed >= sendingDuration || packetsSent >= maxPackets) {
              // console.log(
              //   `WebRTC packet sending completed: ${packetsSent} packets sent in ${elapsed.toFixed(
              //     1
              //   )}ms`
              // );
              // console.log(
              //   `Expected: ${maxPackets} packets in ${sendingDuration}ms, Actual rate: ${(
              //     packetsSent /
              //     (elapsed / API_CONFIG.CONVERSIONS.MS_TO_SECONDS)
              //   ).toFixed(1)} packets/sec`
              // );
              // console.log("Waiting for remaining responses...");
              return;
            }

            // Create and send packet
            const packetId = packetsSent++;
            const sendTime = performance.now();
            const packet = this.createWebRTCPacket(packetId, packetSize);

            // Set packet timeout
            const timeoutId = setTimeout(() => {
              if (sentPackets.has(packetId)) {
                sentPackets.delete(packetId);
                packetsLost++;
                // console.log(`WebRTC packet ${packetId} timed out (lost)`);
              }
            }, packetTimeout);

            sentPackets.set(packetId, { id: packetId, sendTime, timeoutId });

            try {
              dataChannel!.send(packet);
              // console.log(
              //   `Sent WebRTC binary packet ${packetId} (${
              //     packet.byteLength
              //   } bytes) at ${(sendTime - startTime).toFixed(1)}ms`
              // );

              // Update progress for sending phase
              const sendingProgress =
                TEST_CONFIG.LATENCY.PROGRESS.SENDING_START +
                Math.min(
                  (elapsed / sendingDuration) *
                    (TEST_CONFIG.LATENCY.PROGRESS.SENDING_END_WEBRTC -
                      TEST_CONFIG.LATENCY.PROGRESS.SENDING_START),
                  TEST_CONFIG.LATENCY.PROGRESS.SENDING_END_WEBRTC -
                    TEST_CONFIG.LATENCY.PROGRESS.SENDING_START
                );
              onProgress(sendingProgress);
            } catch (error) {
              // console.error(`Failed to send WebRTC packet ${packetId}:`, error);
              clearTimeout(timeoutId);
              sentPackets.delete(packetId);
              packetsLost++;
            }

            // Schedule next packet with recursive setTimeout for precise timing
            setTimeout(sendNextPacket, interPacketInterval);
          };

          // Start sending the first packet immediately
          setTimeout(sendNextPacket, 0);

          // Complete test after totalDuration
          testTimeout = setTimeout(() => {
            // console.log("=== WEBRTC LATENCY TEST COMPLETED ===");
            completeTest();
          }, totalDuration);
        };

        dataChannel.onmessage = (event) => {
          const receiveTime = performance.now();

          let sequence: number;
          let timestamp: number;

          // Handle binary responses like in provided script
          if (event.data instanceof ArrayBuffer) {
            if (event.data.byteLength >= 16) {
              const view = new DataView(event.data);
              sequence = view.getFloat64(
                TEST_CONFIG.LATENCY.WEBRTC_SEQUENCE_OFFSET,
                true
              ); // little endian
              timestamp = view.getFloat64(
                TEST_CONFIG.LATENCY.WEBRTC_TIMESTAMP_OFFSET,
                true
              ); // little endian
            } else {
              // console.warn(
              //   "Received binary packet smaller than 16 bytes, cannot parse"
              // );
              return;
            }
          } else {
            try {
              // Fallback to JSON if not binary
              const response = JSON.parse(event.data);
              sequence = response.sequence || response.id;
              timestamp = response.timestamp;
            } catch (error) {
              // console.warn("Invalid WebRTC response:", error);
              return;
            }
          }

          // console.log(
          //   `<- WebRTC PONG Received: Packet Seq=${sequence}, Original Timestamp=${timestamp}`
          // );

          if (sentPackets.has(sequence)) {
            const sentPacket = sentPackets.get(sequence)!;
            const latency = receiveTime - timestamp; // Use original timestamp for RTT calculation

            latencies.push(latency);
            clearTimeout(sentPacket.timeoutId);
            sentPackets.delete(sequence);
            packetsReceived++;

            // console.log(
            //   `Received WebRTC packet ${sequence}: ${latency.toFixed(2)}ms RTT`
            // );

            // Update live metrics
            this.currentLatency =
              latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

            // Calculate live jitter
            if (latencies.length > 1) {
              const variations: number[] = [];
              for (let i = 1; i < latencies.length; i++) {
                variations.push(Math.abs(latencies[i] - latencies[i - 1]));
              }
              this.currentJitter =
                variations.reduce((sum, v) => sum + v, 0) / variations.length;
            }

            // Calculate live packet loss
            if (packetsSent > 0) {
              this.currentPacketLoss = (packetsLost / packetsSent) * 100;
            }

            // Update progress for receiving phase
            const elapsed = receiveTime - startTime;
            const receivingProgress =
              TEST_CONFIG.LATENCY.PROGRESS.SENDING_END_WEBRTC +
              Math.min(
                ((elapsed - sendingDuration) / waitingDuration) *
                  TEST_CONFIG.LATENCY.PROGRESS.RECEIVING_RANGE_WEBRTC,
                TEST_CONFIG.LATENCY.PROGRESS.RECEIVING_RANGE_WEBRTC
              );
            onProgress(Math.min(receivingProgress, 100));
          }
        };

        dataChannel.onerror = (error) => {
          this.logger.error("WebRTC data channel error", { error });
          cleanup();
          reject(new Error("WebRTC data channel error"));
        };

        // Setup ICE connection state monitoring
        peerConnection.oniceconnectionstatechange = () => {
          // console.log(
          //   `ICE connection state changed to: ${
          //     peerConnection!.iceConnectionState
          //   }`
          // );

          if (
            peerConnection!.iceConnectionState === "failed" ||
            peerConnection!.iceConnectionState === "disconnected"
          ) {
            // console.error(
            //   `❌ ICE connection ${
            //     peerConnection!.iceConnectionState
            //   } - STUN server issues`
            // );
            cleanup();
            reject(new Error("ICE connection failed"));
          }

          if (peerConnection!.iceConnectionState === "connected") {
            // console.log("✅ ICE connection established successfully");
          }
        };

        peerConnection.onconnectionstatechange = () => {
          // console.log(
          //   `Peer connection state changed to: ${
          //     peerConnection!.connectionState
          //   }`
          // );
          if (peerConnection!.connectionState === "failed") {
            // console.error("❌ Peer connection failed");
            cleanup();
            reject(new Error("WebRTC connection failed"));
          }
        };

        // Create WebSocket connection for signaling (same as in provided script)
        const signalingUrl = this.getWebSocketUrl();
        const signalingSocket = new WebSocket(signalingUrl);
        signalingSocket.binaryType = "arraybuffer";

        signalingSocket.onopen = () => {
          // console.log("✅ Signaling WebSocket connection opened");

          // Setup ICE candidate handling
          peerConnection!.onicecandidate = (event) => {
            if (event.candidate) {
              // console.log(
              //   "-> Generated ICE candidate. Sending to signaling server"
              // );
              signalingSocket.send(
                JSON.stringify({ candidate: event.candidate })
              );
            } else {
              // console.log("All ICE candidates have been gathered");
            }
          };

          // Create offer and set local description
          peerConnection!
            .createOffer()
            .then((offer) => peerConnection!.setLocalDescription(offer))
            .then(() => {
              // console.log(
              //   "-> Local description set. Sending offer to signaling server"
              // );
              signalingSocket.send(
                JSON.stringify({ sdp: peerConnection!.localDescription })
              );
            })
            .catch((error) => {
              // console.error("WebRTC offer creation failed:", error);
              cleanup();
              reject(error);
            });
        };

        signalingSocket.onmessage = async (event) => {
          try {
            const signal = JSON.parse(event.data);
            if (signal.sdp) {
              // console.log("Received SDP answer. Setting remote description");
              await peerConnection!.setRemoteDescription(
                new RTCSessionDescription(signal.sdp)
              );
            } else if (signal.candidate) {
              // console.log("Received ICE candidate. Adding candidate");
              await peerConnection!.addIceCandidate(
                new RTCIceCandidate(signal.candidate)
              );
            }
          } catch (error) {
            // console.error("Error processing WebRTC message:", error);
          }
        };

        signalingSocket.onerror = (error) => {
          // console.error("❌ Signaling socket error:", error);
          cleanup();
          reject(new Error("Signaling connection failed"));
        };

        signalingSocket.onclose = () => {
          // console.log("🔌 Signaling WebSocket connection closed");
        };
      } catch (error) {
        this.logger.error("WebRTC setup failed", { error });
        cleanup();
        reject(error);
      }
    });
  }

  private async runWebSocketTCPFallback(
    onProgress: (progress: number) => void,
    signal: AbortSignal,
    params: WebRTCLatencyTestParams
  ): Promise<LatencyResults> {
    this.logger.info("Starting WebSocket TCP fallback latency test");

    const {
      totalDuration,
      sendingDuration,
      waitingDuration,
      interPacketInterval,
      maxPackets,
      packetTimeout,
      packetSize,
    } = params;

    // Build WebSocket URL with server API support
    const wsUrl = this.getWebSocketUrl();

    // console.log(`Connecting to WebSocket: ${wsUrl}`);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const startTime = performance.now();

      const sentPackets = new Map<number, number>(); // packetId -> sendTime
      const latencies: number[] = [];
      let packetsSent = 0;
      let packetsReceived = 0;
      let packetsLost = 0;

      const sendingInterval: NodeJS.Timeout | null = null;
      let testTimeout: NodeJS.Timeout | null = null;
      let connectionTimeout: NodeJS.Timeout | null = null;

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        // console.error("❌ WebSocket TCP connection timeout");
        ws.close();
        reject(new Error("WebSocket TCP connection timeout"));
      }, TEST_CONFIG.LATENCY.WEBRTC_TIMEOUT_MS);

      ws.onopen = () => {
        // console.log(
        //   "✅ WebSocket TCP connected, starting fallback latency test"
        // );

        // Clear connection timeout
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }

        // Start precise packet sending with exact inter-packet timing
        const sendNextPacket = () => {
          const now = performance.now();
          const elapsed = now - startTime;

          // Stop sending after sendingDuration or maxPackets
          if (elapsed >= sendingDuration || packetsSent >= maxPackets) {
            // console.log(
            //   `TCP fallback packet sending completed: ${packetsSent} packets sent in ${elapsed.toFixed(
            //     1
            //   )}ms`
            // );
            // console.log(
            //   `Expected: ${maxPackets} packets in ${sendingDuration}ms, Actual rate: ${(
            //     packetsSent /
            //     (elapsed / API_CONFIG.CONVERSIONS.MS_TO_SECONDS)
            //   ).toFixed(1)} packets/sec`
            // );
            // console.log("Waiting for remaining responses...");
            return;
          }

          // Create and send packet
          const packetId = packetsSent++;
          const sendTime = performance.now();
          const payload = this.generateLatencyPacket(packetId, packetSize);

          sentPackets.set(packetId, sendTime);
          ws.send(payload);

          // console.log(
          //   `Sent TCP fallback binary packet ${packetId} (${
          //     payload.byteLength
          //   } bytes) at ${(sendTime - startTime).toFixed(1)}ms`
          // );

          // Update progress for sending phase
          const sendingProgress = Math.min(
            (elapsed / sendingDuration) *
              TEST_CONFIG.LATENCY.PROGRESS.SENDING_END_WEBSOCKET,
            TEST_CONFIG.LATENCY.PROGRESS.SENDING_END_WEBSOCKET
          );
          onProgress(sendingProgress);

          // Set timeout for this packet
          setTimeout(() => {
            if (sentPackets.has(packetId)) {
              sentPackets.delete(packetId);
              packetsLost++;
              // console.log(`TCP fallback packet ${packetId} timed out (lost)`);
            }
          }, packetTimeout);

          // Schedule next packet precisely at inter-packet interval
          setTimeout(sendNextPacket, interPacketInterval);
        };

        // Start sending the first packet immediately
        setTimeout(sendNextPacket, 0);

        // Complete test after totalDuration
        testTimeout = setTimeout(() => {
          // console.log("=== TCP FALLBACK LATENCY TEST COMPLETED ===");
          completeLatencyTest();
        }, totalDuration);
      };

      ws.onmessage = (event) => {
        const receiveTime = performance.now();

        let sequence: number;
        let timestamp: number;

        // Handle binary responses like in provided script
        if (event.data instanceof ArrayBuffer) {
          if (
            event.data.byteLength >=
            TEST_CONFIG.LATENCY.WEBSOCKET_MIN_PACKET_SIZE
          ) {
            const view = new DataView(event.data);
            sequence = view.getFloat64(
              TEST_CONFIG.LATENCY.WEBRTC_SEQUENCE_OFFSET,
              true
            );
            timestamp = view.getFloat64(
              TEST_CONFIG.LATENCY.WEBRTC_TIMESTAMP_OFFSET,
              true
            );
            const marker = view.getUint32(
              TEST_CONFIG.LATENCY.WEBRTC_MARKER_OFFSET,
              true
            );

            if (marker === TEST_CONFIG.LATENCY.WEBSOCKET_MARKER) {
              // 'WSPI' marker
              // console.log(
              //   `<- WebSocket Binary PONG: Seq=${sequence}, Size=${event.data.byteLength} bytes`
              // );
            } else {
              // console.warn("Received binary packet without expected marker");
              return;
            }
          } else {
            // console.warn(
            //   "Received binary packet smaller than 20 bytes, cannot parse"
            // );
            return;
          }
        } else {
          try {
            // Fallback to JSON if not binary
            const response = JSON.parse(event.data);
            sequence = response.sequence || response.id;
            timestamp = response.timestamp;
          } catch (error) {
            // console.warn("Invalid TCP fallback response:", error);
            return;
          }
        }

        if (sentPackets.has(sequence)) {
          const sendTime = sentPackets.get(sequence)!;
          const latency = receiveTime - timestamp; // Use original timestamp for RTT calculation

          latencies.push(latency);
          sentPackets.delete(sequence);
          packetsReceived++;

          // console.log(
          //   `Received TCP fallback packet ${sequence}: ${latency.toFixed(
          //     2
          //   )}ms RTT`
          // );

          // Update live metrics
          this.currentLatency =
            latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

          // Calculate live jitter
          if (latencies.length > 1) {
            const variations: number[] = [];
            for (let i = 1; i < latencies.length; i++) {
              variations.push(Math.abs(latencies[i] - latencies[i - 1]));
            }
            this.currentJitter =
              variations.reduce((sum, v) => sum + v, 0) / variations.length;
          }

          // Calculate live packet loss
          if (packetsSent > 0) {
            this.currentPacketLoss = (packetsLost / packetsSent) * 100;
          }

          // Update progress for receiving phase
          const elapsed = receiveTime - startTime;
          const receivingProgress =
            TEST_CONFIG.LATENCY.PROGRESS.SENDING_END_WEBSOCKET +
            Math.min(
              ((elapsed - sendingDuration) / waitingDuration) *
                TEST_CONFIG.LATENCY.PROGRESS.RECEIVING_RANGE_WEBSOCKET,
              TEST_CONFIG.LATENCY.PROGRESS.RECEIVING_RANGE_WEBSOCKET
            );
          onProgress(Math.min(receivingProgress, 100));
        }
      };

      ws.onerror = (error) => {
        // console.error("WebSocket TCP fallback error:", error);
        reject(new Error("WebSocket TCP connection failed"));
      };

      ws.onclose = () => {
        // console.log("WebSocket TCP connection closed");
      };

      const completeLatencyTest = () => {
        if (sendingInterval) clearInterval(sendingInterval);
        if (testTimeout) clearTimeout(testTimeout);
        if (connectionTimeout) clearTimeout(connectionTimeout);

        // Mark remaining packets as lost
        packetsLost += sentPackets.size;

        const results = this.calculateLatencyResults(
          latencies,
          packetsSent,
          packetsReceived,
          packetsLost
        );
        // console.log("=== TCP FALLBACK LATENCY TEST RESULTS ===");
        // console.log(`Packets Sent: ${packetsSent}`);
        // console.log(`Packets Received: ${packetsReceived}`);
        // console.log(`Packets Lost: ${packetsLost}`);
        // console.log(`Packet Loss: ${results.packetLoss}%`);
        // console.log(`Average Latency: ${results.average}ms`);
        // console.log(`Jitter (TRAI method): ${results.jitter}ms`);

        try {
          ws.close();
        } catch (e) {
          // console.warn("Error closing WebSocket:", e);
        }
        resolve(results);
      };

      // Handle abort signal
      signal.addEventListener("abort", () => {
        // console.log("TCP fallback latency test aborted");
        completeLatencyTest();
      });
    });
  }

  /**
   * HTTP Ping Fallback - Last resort when WebRTC and WebSocket fail
   * Measures latency using simple HTTP HEAD requests
   */
  private async runHTTPPingFallback(
    onProgress: (progress: number) => void,
    signal: AbortSignal,
    params: WebRTCLatencyTestParams
  ): Promise<LatencyResults> {
    // console.log("=== HTTP PING FALLBACK LATENCY TEST ===");
    this.logger.info("Starting HTTP ping fallback latency test");

    const { maxPackets, sendingDuration, totalDuration, interPacketInterval } =
      params;

    // Get server URL for HTTP ping
    const serverUrl = this.server?.url || "https://trai-test-server.mozark.ai/";
    // Use a lightweight endpoint - try /ping or just the root with HEAD request
    const pingUrl = serverUrl.endsWith("/")
      ? `${serverUrl}ping`
      : `${serverUrl}/ping`;

    // console.log(`HTTP Ping URL: ${pingUrl}`);

    const latencies: number[] = [];
    let packetsSent = 0;
    let packetsReceived = 0;
    let packetsLost = 0;
    const startTime = performance.now();

    // Send pings with interval
    const sendPing = async (): Promise<void> => {
      const pingStart = performance.now();

      try {
        // Use fetch with AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          params.packetTimeout
        );

        const response = await fetch(pingUrl, {
          method: "HEAD", // Lightweight request
          cache: "no-cache",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const pingEnd = performance.now();
        const latency = pingEnd - pingStart;

        if (response.ok || response.status === 404) {
          // Accept 404 as successful ping (server responded)
          latencies.push(latency);
          packetsReceived++;
          // console.log(`HTTP Ping ${packetsSent}: ${latency.toFixed(2)}ms`);

          // ✅ UPDATE LIVE METRICS AFTER EACH SUCCESSFUL PING
          this.currentLatency =
            latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

          // Calculate live jitter
          if (latencies.length > 1) {
            const variations: number[] = [];
            for (let i = 1; i < latencies.length; i++) {
              variations.push(Math.abs(latencies[i] - latencies[i - 1]));
            }
            this.currentJitter =
              variations.reduce((sum, v) => sum + v, 0) / variations.length;
          }

          // Calculate live packet loss
          if (packetsSent > 0) {
            this.currentPacketLoss =
              ((packetsLost + (packetsSent - packetsReceived)) /
                (packetsSent + 1)) *
              100;
          }

          // console.log(
          //   `🟠 HTTP Ping Live: Latency=${this.currentLatency.toFixed(
          //     2
          //   )}ms, Packets=${packetsReceived}/${packetsSent + 1}`
          // );
        } else {
          packetsLost++;
          // console.warn(`HTTP Ping ${packetsSent} failed: ${response.status}`);
        }
      } catch (error) {
        packetsLost++;
        // console.warn(`HTTP Ping ${packetsSent} timeout/error:`, error);
      }

      packetsSent++;

      // Update progress
      const elapsed = performance.now() - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 90);
      onProgress(progress);
    };

    // Send pings sequentially with interval
    const pingPromises: Promise<void>[] = [];
    for (let i = 0; i < maxPackets; i++) {
      if (signal.aborted) break;

      pingPromises.push(sendPing());

      // Wait for inter-packet interval
      if (i < maxPackets - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, interPacketInterval)
        );
      }

      // Stop if we've exceeded sending duration
      const elapsed = performance.now() - startTime;
      if (elapsed >= sendingDuration) {
        // console.log(
        //   `HTTP ping sending completed after ${elapsed.toFixed(1)}ms`
        // );
        break;
      }
    }

    // Wait for all pings to complete
    await Promise.all(pingPromises);

    const results = this.calculateLatencyResults(
      latencies,
      packetsSent,
      packetsReceived,
      packetsLost
    );

    // console.log("=== HTTP PING FALLBACK RESULTS ===");
    // console.log(`Packets Sent: ${packetsSent}`);
    // console.log(`Packets Received: ${packetsReceived}`);
    // console.log(`Packets Lost: ${packetsLost}`);
    // console.log(`Packet Loss: ${results.packetLoss}%`);
    // console.log(`Average Latency: ${results.average}ms`);
    // console.log(`Jitter: ${results.jitter}ms`);

    onProgress(100);

    return results;
  }

  private getWebSocketUrl(): string {
    // Build WebSocket URL with server API support
    let wsUrl: string;
    if (this.server?.url) {
      const hostname = this.getServerHostname();
      const latencyPort =
        this.server.websocket_port ||
        TEST_CONFIG.LATENCY.DEFAULT_WEBSOCKET_PORT;
      wsUrl = `${TEST_CONFIG.LATENCY.WEBSOCKET_PROTOCOL}${hostname}:${latencyPort}`;
      // console.log(
      //   `Using server API for WebSocket: ${this.server.name} (${hostname}:${latencyPort})`
      // );
    } else {
      // Fallback for testing
      wsUrl = TEST_CONFIG.LATENCY.FALLBACK_WEBSOCKET_SERVER;
      // console.log(`Using fallback test server for WebSocket: ${wsUrl}`);
    }

    return wsUrl;
  }

  private getServerHostname(): string {
    if (!this.server?.url) {
      throw new Error("No server selected");
    }
    return new URL(this.server.url).hostname;
  }

  private createWebRTCPacket(packetId: number, size: number): ArrayBuffer {
    // Create binary packet exactly like in provided script
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);

    // Set sequence (packet ID) and timestamp as in the sample
    view.setFloat64(TEST_CONFIG.LATENCY.WEBRTC_SEQUENCE_OFFSET, packetId, true); // little endian
    view.setFloat64(
      TEST_CONFIG.LATENCY.WEBRTC_TIMESTAMP_OFFSET,
      performance.now(),
      true
    ); // little endian

    // Fill remaining bytes (if any) with zeros
    // The sample uses 160 bytes, first 16 bytes are sequence + timestamp

    return buffer;
  }

  private generateLatencyPacket(packetId: number, size: number): ArrayBuffer {
    // Create binary packet for WebSocket TCP fallback (same format as WebRTC)
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);

    // Set sequence (packet ID) and timestamp as in the sample
    view.setFloat64(TEST_CONFIG.LATENCY.WEBRTC_SEQUENCE_OFFSET, packetId, true); // little endian
    view.setFloat64(
      TEST_CONFIG.LATENCY.WEBRTC_TIMESTAMP_OFFSET,
      performance.now(),
      true
    ); // little endian
    // Add marker to identify this as a WebSocket binary ping
    view.setUint32(
      TEST_CONFIG.LATENCY.WEBRTC_MARKER_OFFSET,
      TEST_CONFIG.LATENCY.WEBSOCKET_MARKER,
      true
    ); // 'WSPI' marker like in provided script

    return buffer;
  }

  private calculateLatencyResults(
    latencies: number[],
    packetsSent: number,
    packetsReceived: number,
    packetsLost: number
  ): LatencyResults {
    // console.log('=== TRAI JITTER CALCULATION ===');
    // console.log(`Latency samples: [${latencies.slice(0, TEST_CONFIG.LATENCY.SAMPLE_DISPLAY_LIMIT).join(', ')}${latencies.length > TEST_CONFIG.LATENCY.SAMPLE_DISPLAY_LIMIT ? '...' : ''}]`);

    if (latencies.length === 0) {
      return {
        average: 0,
        averageUnit: "ms",
        min: 0,
        max: 0,
        jitter: 0,
        packetLoss: packetsSent > 0 ? (packetsLost / packetsSent) * 100 : 0,
        packetsSent,
        packetsReceived,
        rawLatencies: [],
        duration: 0,
      };
    }

    // Basic statistics
    const average =
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);

    // TRAI Jitter Calculation
    let jitter = 0;
    if (latencies.length > 1) {
      const variations: number[] = [];

      for (let i = 1; i < latencies.length; i++) {
        const variation = Math.abs(latencies[i] - latencies[i - 1]);
        variations.push(variation);
        // console.log(`Variation ${i}: |${latencies[i]} - ${latencies[i-1]}| = ${variation}ms`);
      }

      jitter = variations.reduce((sum, v) => sum + v, 0) / variations.length;
      // console.log(`TRAI Jitter: (${variations.join(' + ')}) / ${variations.length} = ${jitter.toFixed(2)}ms`);
    }

    const packetLoss = packetsSent > 0 ? (packetsLost / packetsSent) * 100 : 0;

    // console.log('=== FINAL LATENCY CALCULATIONS ===');
    // console.log(`Average RTT: ${average.toFixed(2)}ms`);
    // console.log(`Min RTT: ${min}ms`);
    // console.log(`Max RTT: ${max}ms`);
    // console.log(`Jitter (TRAI): ${jitter.toFixed(2)}ms`);
    // console.log(`Packet Loss: ${packetLoss.toFixed(2)}%`);

    return {
      average: Number(average.toFixed(2)),
      averageUnit: "ms",
      min,
      max,
      jitter: Number(jitter.toFixed(2)),
      packetLoss: Number(packetLoss.toFixed(2)),
      packetsSent,
      packetsReceived,
      rawLatencies: latencies,
      duration: Math.round(average * API_CONFIG.CONVERSIONS.MS_TO_MICROSECONDS),
    };
  }
}
