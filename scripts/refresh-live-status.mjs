import fs from "node:fs";

const youtubeChannels = {
  "papaplatte:youtube": { id: "UCDmbhGe7-wC1a55l5ZYAZJw" },
  "montanablack88:youtube": { id: "UCpAMOlA_0hFXopIxMq8ar0w" },
  "trymacs:youtube": { id: "UC6Gc4KQ1ueDnh8x7plaAD3w" },
  "marmok:youtube": { id: "UCkxpiTIU50N3_dNt4WMMZyw" },
  "smetanduck:youtube": { handle: "@smetanaml" }
};

const twitchChannels = [
  ["leb1ga", "leb1ga"], ["dendi", "dendi"], ["rolex9", "rolex9"],
  ["papaplatte", "papaplatte"], ["montanablack88", "montanablack88"],
  ["trymacs", "trymacs"], ["smetanduck", "smetanduck"],
  ["titamin1", "titamin1"], ["dunkelsch4tten", "dunkelsch4tten"],
  ["buster", "buster"], ["zubarefff", "zubareff"]
];

const cachePath = "web/live-status.json";
const existing = JSON.parse(fs.readFileSync(cachePath, "utf8"));
const previousSources = { ...(existing.sources || {}) };
const now = new Date().toISOString();
const sources = {};

for (const key of Object.keys(youtubeChannels)) {
  sources[key] = { online: false, checkedAt: now, mode: "provider-unavailable" };
}
for (const [key] of twitchChannels) {
  sources[`${key}:twitch`] = { online: false, checkedAt: now, mode: "provider-unavailable" };
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function json(url, options = {}) {
  return (await request(url, options)).json();
}

async function text(url, options = {}) {
  return (await request(url, options)).text();
}

function firstYoutubeVideoId(xml) {
  return xml.match(/<yt:videoId[^>]*>([^<]+)<\\/yt:videoId>/)?.[1]?.trim();
}

async function resolveYoutubeHandle(handle) {
  try {
    const html = await text(`https://www.youtube.com/${handle}`);
    return (
      html.match(/"channelId":"(UC[A-Za-z0-9_-]{20,})"/)?.[1] ||
      html.match(/"externalId":"(UC[A-Za-z0-9_-]{20,})"/)?.[1] ||
      html.match(/channel_id=(UC[A-Za-z0-9_-]{20,})/)?.[1]
    );
  } catch (error) {
    console.warn("YouTube handle:", handle, error.message);
    return undefined;
  }
}

async function latestYoutubeUpload(channelId) {
  const xml = await text(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
  return firstYoutubeVideoId(xml);
}

async function refreshYoutube() {
  for (const [key, channel] of Object.entries(youtubeChannels)) {
    try {
      let channelId = channel.id;

      if (!channelId && channel.handle && process.env.YOUTUBE_API_KEY) {
        const url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.search = new URLSearchParams({
          part: "id",
          forHandle: channel.handle,
          key: process.env.YOUTUBE_API_KEY
        });
        channelId = (await json(url)).items?.[0]?.id;
      }

      if (!channelId && channel.handle) channelId = await resolveYoutubeHandle(channel.handle);
      if (!channelId) continue;

      const rssVideoId = await latestYoutubeUpload(channelId);

      if (process.env.YOUTUBE_API_KEY) {
        const liveUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        liveUrl.search = new URLSearchParams({
          part: "snippet", channelId, eventType: "live", type: "video",
          maxResults: "1", key: process.env.YOUTUBE_API_KEY
        });
        const completedUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        completedUrl.search = new URLSearchParams({
          part: "snippet", channelId, eventType: "completed", type: "video",
          order: "date", maxResults: "1", key: process.env.YOUTUBE_API_KEY
        });
        const [live, completed] = await Promise.all([json(liveUrl), json(completedUrl)]);
        const liveVideoId = live.items?.[0]?.id?.videoId;
        const completedVideoId = completed.items?.[0]?.id?.videoId;
        sources[key] = {
          online: Boolean(liveVideoId),
          ...(liveVideoId ? { liveVideoId } : {}),
          ...(completedVideoId ? { fallbackVideoId: completedVideoId } : rssVideoId ? { fallbackVideoId: rssVideoId } : {}),
          checkedAt: now,
          mode: "youtube-api"
        };
      } else {
        sources[key] = {
          online: false,
          ...(rssVideoId ? { fallbackVideoId: rssVideoId } : {}),
          checkedAt: now,
          mode: "rss-fallback"
        };
      }
    } catch (error) {
      console.warn("YouTube:", key, error.message);
    }
  }
}

async function latestTwitchVod(login) {
  try {
    const html = await text(`https://www.twitch.tv/${encodeURIComponent(login)}/videos?filter=archives&sort=time`);
    return [...html.matchAll(/(?:\\/videos\\/|videoId["':]+\\s*["'])(\\d{6,})/g)].map(match => match[1])[0];
  } catch (error) {
    console.warn("Twitch VOD fallback:", login, error.message);
    return undefined;
  }
}

async function refreshTwitch() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    for (const [key, login] of twitchChannels) {
      const fallbackVideoId = await latestTwitchVod(login);
      sources[`${key}:twitch`] = {
        online: false,
        ...(fallbackVideoId ? { fallbackVideoId } : {}),
        checkedAt: now,
        mode: "public-vod-fallback"
      };
    }
    return;
  }

  try {
    const token = await json("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials"
      })
    });

    const headers = {
      Authorization: `Bearer ${token.access_token}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID
    };

    const usersUrl = new URL("https://api.twitch.tv/helix/users");
    for (const [, login] of twitchChannels) usersUrl.searchParams.append("login", login);
    const users = await json(usersUrl, { headers });
    const userIds = new Map((users.data || []).map(user => [user.login.toLowerCase(), user.id]));

    const streamUrl = new URL("https://api.twitch.tv/helix/streams");
    for (const [, login] of twitchChannels) streamUrl.searchParams.append("user_login", login);
    const streams = await json(streamUrl, { headers });
    const online = new Map((streams.data || []).map(stream => [stream.user_login.toLowerCase(), stream]));

    for (const [key, login] of twitchChannels) {
      const stream = online.get(login.toLowerCase());
      const userId = stream?.user_id || userIds.get(login.toLowerCase());
      let fallbackVideoId;

      if (userId) {
        try {
          const vodUrl = new URL("https://api.twitch.tv/helix/videos");
          vodUrl.searchParams.set("user_id", userId);
          vodUrl.searchParams.set("type", "archive");
          vodUrl.searchParams.set("first", "1");
          fallbackVideoId = (await json(vodUrl, { headers })).data?.[0]?.id;
        } catch (error) {
          console.warn("Twitch VOD:", key, error.message);
        }
      }

      sources[`${key}:twitch`] = {
        online: Boolean(stream),
        ...(stream?.id ? { liveVideoId: stream.id } : {}),
        ...(fallbackVideoId ? { fallbackVideoId } : {}),
        checkedAt: now,
        mode: "twitch-api"
      };
    }
  } catch (error) {
    console.warn("Twitch API:", error.message);
  }
}

await Promise.allSettled([refreshYoutube(), refreshTwitch()]);

const refreshed = Object.keys(sources).length;
const finalSources = refreshed > 0 ? sources : previousSources;
if (Object.keys(finalSources).length === 0) {
  throw new Error("LIVE refresh produced no sources");
}

const result = { generatedAt: now, sources: finalSources };
fs.writeFileSync(cachePath, JSON.stringify(result, null, 2) + "\n");
console.log("LIVE cache prepared:", Object.keys(finalSources).length, "sources");
