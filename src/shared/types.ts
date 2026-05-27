export type CapturedPost = {
  key: string;
  statusId?: string;
  authorName?: string;
  handle?: string;
  text: string;
  postUrl?: string;
  sourceUrl: string;
  firstSeenAt: number;
  lastSeenAt: number;
  seenCount: number;
};

export type LoggerSettings = {
  enabled: boolean;
  retentionHours: number;
  maxEntries: number;
  maxTextLength: number;
};

export type QueryPostsRequest = {
  keyword?: string;
  handle?: string;
  from?: number;
  to?: number;
  limit?: number;
};

export type RuntimeMessage =
  | { type: "settings:get" }
  | { type: "settings:update"; settings: Partial<LoggerSettings> }
  | { type: "posts:save"; post: CapturedPost }
  | { type: "posts:query"; query?: QueryPostsRequest }
  | { type: "posts:clear" }
  | { type: "posts:stats" };

export type RuntimeResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
