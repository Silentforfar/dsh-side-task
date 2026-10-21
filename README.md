# 侧边任务（Side task）

<!-- English -->

## English

**Side task** — Opens a temporary chat session in the right sidebar, in the same workspace but with its own context, so it runs in parallel with the main conversation.

A [DSH](https://github.com/deepseek-ai) bundle (DeepSeek Harness plugin).

### Install from the DSH plugin market

1. Open **Plugins** in the DSH Web sidebar, select **More** next to **Experimental plugins**, and switch on **Custom plugin markets**.
2. Open the **Discover** tab and add this index source:

   `https://silentforfar.github.io/dsh-market-index/index.json`

3. Find **Side task** (`@silentforfar/dsh-side-task`) in the list and press install.

### Install straight from this repository

Pass this spec to `plugin_manager`'s `install_bundle` (or the equivalent bundle install in your profile):

```text
git+https://github.com/Silentforfar/dsh-side-task.git#<commit-sha>
```

Use a full 40-character commit SHA from this repository's history so the install stays pinned and reproducible.

**Requirements.** DSH 0.2.1-rc.2 or newer with the Web UI. Closing the tab only closes the view; the session stays in the workspace, stays hidden from the main session list while it is mapped, and can be reopened from the same guide card. Removing it remains the explicit "permanent delete" action.

**License.** MIT. The rest of this README documents the plugin in Chinese.

---

在右侧栏开一个临时会话：和主任务共用同一个工作区，但上下文各自独立。适合"顺手让另一个 agent 查点东西"、"开个小实验"、"两种做法对比着看"。

## 用法

- 展开右侧栏，在引导页点 **侧边任务** 卡片。插件会在同一工作区创建一个空白会话，并在右栏打开它的标签。
- 标签里复用 DSH 自带的会话视图，模型选择、工具、权限都按当前配置走；主任务和侧边任务可以同时运行，互不打断。
- 每个主会话对应一个侧边任务。关掉标签只是关掉视图，会话不会被删除；再点同一张卡片会重新打开它。
- 已映射的侧边会话会从左侧会话列表隐藏，避免和主任务混在一起；要彻底清理，仍走会话菜单里的"永久删除"。

## 实现

- `client.js` 通过 `ctx.sidebarRightTabs.register` 注册页面型标签 `@silentforfar/dsh-side-task/sidetask`，并贡献右栏引导页的"侧边任务"卡片。
- 标签体在 `sidebar.right.pane.tab` 槽位注册，内容复用内置的 `sidebar.chat.conversation` 会话席位；插件不再重复占用这个单占位槽。
- 主会话与侧边会话的映射存在 `localStorage`（`dsh-side-task.mapping.v2`），并按映射把侧边会话行从左侧列表隐藏。
- `index.js` 是空的 Host 半边：这个插件的全部贡献都在浏览器端。
- `locale/*.json` 给 Plugins 页提供标题与描述。
