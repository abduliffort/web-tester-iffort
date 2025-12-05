import { ServerEndpoint } from "../types/speed-test";
import { NETWORK_CONFIG } from "../constants";

export class ServerSelector {
  private servers: ServerEndpoint[];

  constructor(servers: ServerEndpoint[]) {
    this.servers = servers.sort((a, b) => a.priority - b.priority);
  }

  async selectBest(): Promise<ServerEndpoint> {
    // For now, use the first available server (highest priority)
    // In a full implementation, this would test latency to each server
    // and select the one with the best performance

    for (const server of this.servers) {
      try {
        // Simple connectivity test
        const testUrl = `${server.downloadUrl}/ping`;
        const response = await fetch(testUrl, {
          method: "HEAD",
          timeout: NETWORK_CONFIG.SERVER_PING_TIMEOUT_MS,
        } as RequestInit);

        if (response.ok) {
          return server;
        }
      } catch {
        // console.warn(`Server ${server.id} unreachable`);
        continue;
      }
    }

    // Fallback to first server if none respond to ping
    if (this.servers.length > 0) {
      return this.servers[0];
    }

    throw new Error("No servers available");
  }

  async testServerLatency(server: ServerEndpoint): Promise<number> {
    const start = performance.now();

    try {
      const response = await fetch(`${server.downloadUrl}/ping`, {
        method: "HEAD",
        timeout: NETWORK_CONFIG.SERVER_LATENCY_TIMEOUT_MS,
      } as RequestInit);

      if (response.ok) {
        return performance.now() - start;
      }
    } catch {
      // Return high latency for unreachable servers
      return NETWORK_CONFIG.HIGH_LATENCY_VALUE_MS;
    }

    return NETWORK_CONFIG.HIGH_LATENCY_VALUE_MS;
  }
}
