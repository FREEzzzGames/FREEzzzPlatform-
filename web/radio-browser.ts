export interface RadioBrowserStation {
  readonly stationuuid: string;
  readonly name: string;
  readonly url: string;
  readonly url_resolved: string;
  readonly homepage: string;
  readonly favicon: string;
  readonly tags: string;
  readonly country: string;
  readonly countrycode: string;
  readonly language: string;
  readonly codec: string;
  readonly bitrate: number;
  readonly votes: number;
  readonly lastcheckok: number;
}

export interface RadioBrowserTag {
  readonly name: string;
  readonly stationcount: number;
}

const SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info"
] as const;

export const RADIO_GENRES = [
  "pop","rock","dance","electronic","house","techno","trance","hip-hop",
  "jazz","blues","classical","metal","indie","alternative","ambient",
  "disco","funk","soul","reggae","country","folk","oldies","80s","90s",
  "news","talk","chillout","lounge","soundtrack"
] as const;

export interface RadioBrowserSearch {
  readonly genre?: string;
  readonly query?: string;
  readonly country?: string;
  readonly language?: string;
  readonly limit?: number;
}

export class RadioBrowserClient {
  private serverIndex = 0;

  private async request<T>(path: string): Promise<T> {
    let lastError: unknown;
    for (let offset = 0; offset < SERVERS.length; offset += 1) {
      const index = (this.serverIndex + offset) % SERVERS.length;
      try {
        const response = await fetch(SERVERS[index] + path, {
          headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`Radio Browser HTTP ${response.status}`);
        this.serverIndex = index;
        return await response.json() as T;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Radio Browser is unavailable.");
  }

  async getGenres(): Promise<readonly RadioBrowserTag[]> {
    const params = new URLSearchParams({
      order: "stationcount",
      reverse: "true",
      hidebroken: "true",
      limit: "40"
    });
    const tags = await this.request<RadioBrowserTag[]>(`/json/tags?${params}`);
    return tags.filter(tag => tag.name.trim()).slice(0, 40);
  }

  async searchStations(search: RadioBrowserSearch = {}): Promise<readonly RadioBrowserStation[]> {
    const params = new URLSearchParams({
      hidebroken: "true",
      is_https: "true",
      order: "votes",
      reverse: "true",
      limit: String(Math.min(Math.max(search.limit ?? 30, 1), 100))
    });
    if (search.genre) params.set("tag", search.genre);
    if (search.query?.trim()) params.set("name", search.query.trim());
    if (search.country?.trim()) params.set("country", search.country.trim());
    if (search.language?.trim()) params.set("language", search.language.trim());

    const stations = await this.request<RadioBrowserStation[]>(`/json/stations/search?${params}`);
    return stations.filter(station =>
      station.stationuuid &&
      station.name &&
      /^https:\/\//i.test(station.url_resolved || station.url) &&
      station.lastcheckok !== 0
    );
  }

  async registerClick(stationId: string): Promise<void> {
    try {
      await this.request<unknown>(`/json/url/${encodeURIComponent(stationId)}`);
    } catch {
      // Playback must not fail because click telemetry is unavailable.
    }
  }
}
