import { cleanupPosts, clearPosts, getPostCount, queryPosts, saveCapturedPost } from "../shared/db";
import { getSettings, updateSettings } from "../shared/settings";
import type { RuntimeMessage, RuntimeResponse } from "../shared/types";
import { savePostToObsidian } from "./obsidian";

chrome.runtime.onInstalled.addListener(() => {
  getSettings().then(cleanupPosts).catch(console.error);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse<unknown>))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown extension error";
      sendResponse({ ok: false, error: message } satisfies RuntimeResponse<unknown>);
    });

  return true;
});

async function handleMessage(message: RuntimeMessage): Promise<unknown> {
  switch (message.type) {
    case "settings:get":
      return getSettings();
    case "settings:update": {
      const settings = await updateSettings(message.settings);
      await cleanupPosts(settings);
      return settings;
    }
    case "posts:save": {
      const settings = await getSettings();
      if (!settings.enabled) return { saved: false };
      const post = await saveCapturedPost(message.post, settings);
      return { saved: true, post };
    }
    case "obsidian:savePost":
      return savePostToObsidian(message.post);
    case "posts:query":
      return queryPosts(message.query);
    case "posts:clear":
      await clearPosts();
      return { cleared: true };
    case "posts:stats":
      return { count: await getPostCount() };
    default:
      return assertNever(message);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported message: ${JSON.stringify(value)}`);
}
