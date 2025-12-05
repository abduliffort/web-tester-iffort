import {
  ScenarioResponse,
  Scenario,
  ActionConfig,
  ScenarioAction,
} from "../types/speed-test";
import { APIClient } from "../auth/api-client";
import { TEST_CONFIG, ENV_CONFIG, URLS } from "../constants";

export class ScenarioLoader {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  async loadScenarios(): Promise<Scenario[]> {
    try {
      const data: ScenarioResponse = await this.apiClient.getScenarios();

      if (data.meta.code !== 200) {
        throw new Error(`Scenarios API error: ${data.meta.code}`);
      }

      return data.content;
    } catch (error) {
      // console.error("Failed to load scenarios:", error);
      throw error;
    }
  }

  async getScenarioById(
    scenarios: Scenario[],
    scenarioId: number
  ): Promise<Scenario | null> {
    return scenarios.find((scenario) => scenario.id === scenarioId) || null;
  }

  getDownloadConfig(scenario: Scenario): ActionConfig | null {
    const downloadAction = scenario.actions.find(
      (action) => action.type === "DOWNLOAD"
    );
    if (!downloadAction || downloadAction.cfg.length === 0) {
      return null;
    }

    // Return the default configuration or first one
    return (
      downloadAction.cfg.find((cfg) => cfg.is_default) || downloadAction.cfg[0]
    );
  }

  getUploadConfig(scenario: Scenario): ActionConfig | null {
    const uploadAction = scenario.actions.find(
      (action) => action.type === "UPLOAD_GENERATED"
    );
    if (!uploadAction || uploadAction.cfg.length === 0) {
      return null;
    }

    // Return the default configuration or first one
    return (
      uploadAction.cfg.find((cfg) => cfg.is_default) || uploadAction.cfg[0]
    );
  }

  getLatencyConfig(scenario: Scenario): ActionConfig | null {
    const latencyAction = scenario.actions.find(
      (action) => action.type === "LATENCY"
    );
    if (!latencyAction || latencyAction.cfg.length === 0) {
      return null;
    }

    // Return the default configuration or first one
    return (
      latencyAction.cfg.find((cfg) => cfg.is_default) || latencyAction.cfg[0]
    );
  }

  getWebConfig(scenario: Scenario): ActionConfig | null {
    const webAction = scenario.actions.find((action) => action.type === "WEB");
    if (!webAction || webAction.cfg.length === 0) {
      return null;
    }

    // Return the default configuration or first one
    return webAction.cfg.find((cfg) => cfg.is_default) || webAction.cfg[0];
  }

  buildDownloadUrl(config: ActionConfig, action: ScenarioAction): string {
    const baseUri = config.uri || "";
    const port = config.port ? `:${config.port}` : "";
    const filename = config.filename || TEST_CONFIG.DOWNLOAD.DEFAULT_FILENAME;
    const extension = config.extension || ".file";
    const resource =
      action.resource || TEST_CONFIG.DOWNLOAD.DEFAULT_RESOURCE_PATH;

    return `${baseUri}${port}${resource}${filename}${extension}`;
  }

  buildUploadUrl(config: ActionConfig, action: ScenarioAction): string {
    const baseUri = config.uri || "";
    const port = config.port ? `:${config.port}` : "";
    const resource = action.resource || TEST_CONFIG.UPLOAD.DEFAULT_ENDPOINT;

    return `${baseUri}${port}${resource}`;
  }

  buildWebTestUrl(config: ActionConfig, action: ScenarioAction): string {
    // Use the URI from config, or fallback to reliable test URLs
    if (action.resource) {
      return action.resource;
    }

    // Use fallback URLs from constants
    const fallbackUrls = URLS.WEB_TEST_URLS;

    // For now, use the first fallback (can be made random or rotation-based later)
    const testUrl = fallbackUrls[0];
    // console.log('Using fallback web test URL:', testUrl);
    return testUrl;
  }

  getStreamingConfig(scenario: Scenario): ActionConfig | null {
    const streamingAction = scenario.actions.find(
      (action) => action.type === "STREAMING"
    );
    if (!streamingAction || streamingAction.cfg.length === 0) {
      return null;
    }

    // Return the default configuration or first one
    return (
      streamingAction.cfg.find((cfg) => cfg.is_default) ||
      streamingAction.cfg[0]
    );
  }

  buildStreamingUrl(
    config: ActionConfig,
    action: ScenarioAction,
    server?: any
  ): string {
    const resource = action.resource || TEST_CONFIG.STREAMING.DEFAULT_RESOURCE;
    // console.log('sever url: ' + server.url);
    // console.log('sever resource: ' + resource);
    // Priority 1: Use server URL + resource path
    if (server && server.url) {
      return `${server.url}${resource}`;
    }

    // Priority 2: Use config URI + resource path
    if (config.uri) {
      return `${config.uri}${resource}`;
    }

    // Final fallback: Use global default host
    return `${ENV_CONFIG.API.DEFAULT_HOST}${resource}`;
  }
}
