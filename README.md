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

**Requirements.** DSH 0.2.1-rc.2 or newer with the Web UI. Closing the tab releases the view; the session itself stays in the session list, and removing it remains the explicit "permanent delete" action.

**License.** MIT. The rest of this README documents the plugin in Chinese.

---

在右侧栏开一个临时会话：和主任务共用同一个工作区，但上下文各自独立。适合"顺手让另一个 agent 查点东西"、"开个小实验"、"两种做法对比着看"。

## 用法

- 在会话头部点 **侧边任务** 按钮（分栏图标），右栏新开一个标签，里面是一个空白会话；工作目录沿用它所在的会话。
- 右栏用的是 DSH 自带的会话视图，模型选择、工具、权限都按当前配置走，两个会话可以同时跑，互不打断。
- 关掉标签页只是关掉视图：会话本身留在侧边列表里，不会被静默删除；要清理就走会话菜单里的"永久删除"。

## 实现

- `client.js` 在 `sidebar.right.pane.tab` 槽位注册一个标签类型（`dsh-resource://sidetask/session/<id>`），并用资源提供者在标签存活期间 retain 该会话，标签关闭时 release。
- 标签内容直接复用 `sidebar.chat.conversation` 这个内置席位。
- `index.js` 是空的 Host 半边：这个插件的全部贡献都在浏览器端。
- `locale/*.json` 给 Plugins 页提供标题与描述。
