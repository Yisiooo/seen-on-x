# Seen on X

Find posts you saw before the X timeline refreshed.  
找回你在 X 时间线里看见过、却因为刷新再也找不到的帖子。

Seen on X is a local-first Chrome/Edge extension for keeping a searchable record of X posts that actually entered your browser viewport.

Seen on X 是一个本地优先的 Chrome/Edge 扩展，用来记录真正出现在你浏览器视口里的 X 帖子，并让你之后可以搜索找回。

![Popup showing searchable local archive](docs/assets/popup.png)

![Settings page with local retention controls](docs/assets/options.png)

## English

### Install

For normal use, download the prebuilt extension package from [Releases](https://github.com/Yisiooo/seen-on-x/releases).

1. Download `seen-on-x-extension.zip`.
2. Unzip it.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable Developer mode.
5. Choose **Load unpacked**.
6. Select the unzipped folder.

Chrome and Edge developer mode load unpacked folders, not zip files directly. The zip is only the download package.

### Why

Sometimes you refresh or navigate away from X right after seeing something useful. Because you never opened the individual post URL, it does not appear in browser history and can be hard to find again.

Seen on X gives your timeline a small local memory. It records visible posts, stores them locally, and lets you search them later.

### Privacy model

- Local-first: captured posts stay in your browser storage.
- No X API usage.
- No auto-scroll, bulk crawling, or background timeline fetching.
- No remote sync or analytics.
- No direct message capture by design.

This project is not affiliated with X Corp.

### Features

- Capture visible X timeline posts after a short viewport dwell.
- Search by text, author, handle, or URL.
- Filter by recent time window.
- Open original posts when a status URL is available.
- Copy captured text.
- Configure retention hours, maximum entries, and text length.
- Export JSON or CSV.

## 中文

### 安装

普通用户建议直接从 [Releases](https://github.com/Yisiooo/seen-on-x/releases) 下载已经打包好的扩展。

1. 下载 `seen-on-x-extension.zip`。
2. 解压这个 zip。
3. 打开 `chrome://extensions` 或 `edge://extensions`。
4. 打开开发者模式。
5. 点击 **加载已解压的扩展程序**。
6. 选择解压后的文件夹。

Chrome 和 Edge 的开发者模式加载的是文件夹，不是直接加载 zip。zip 只是方便下载和发布的压缩包。

### 为什么做这个

有时候你在 X 上刚刷到一个有用的帖子，下一秒刷新、跳转或时间线重排，它就再也找不到了。因为你没有点进单条帖子，浏览器历史里也不会留下对应 URL。

Seen on X 给你的 X 时间线加一个本地记忆。它只记录你真正看见过的帖子，保存在本机浏览器里，之后可以搜索找回。

### 隐私模型

- 本地优先：捕获的帖子只保存在浏览器本地存储里。
- 不调用 X API。
- 不自动滚动、不批量抓取、不在后台请求时间线。
- 不做远程同步或数据分析。
- 默认设计上不捕获私信。

本项目与 X Corp. 没有从属或官方关联。

### 功能

- 帖子进入视口并停留一小段时间后自动记录。
- 支持按正文、作者、handle 或 URL 搜索。
- 支持按最近时间范围筛选。
- 如果能识别到原帖链接，可以直接打开原帖。
- 支持复制帖子正文。
- 可配置保留小时数、最大记录条数和单条文本长度。
- 支持导出 JSON 或 CSV。

## Build from source / 从源码构建

```bash
pnpm install
pnpm build
```

Then load the `dist` directory as an unpacked extension.

然后把 `dist` 目录作为已解压扩展加载。

## Development / 开发

```bash
pnpm test
pnpm typecheck
pnpm build
```

The extension is built with TypeScript, Vite, Manifest V3, and IndexedDB.

技术栈：TypeScript、Vite、Manifest V3、IndexedDB。

## Current limitations / 当前限制

- First version targets Chrome and Edge. / 第一版面向 Chrome 和 Edge。
- DOM extraction can break if X changes its markup. / 如果 X 修改页面结构，DOM 提取逻辑可能需要更新。
- There is no screenshot/OCR fallback. / 暂无截图或 OCR 兜底。
- There is no cloud sync. / 暂无云同步。
