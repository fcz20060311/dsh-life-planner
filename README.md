# 拾光笺 · dsh-life-planner

![license](https://img.shields.io/npm/l/dsh-life-planner)
![dsh](https://img.shields.io/badge/dsh-%3E%3D0.2.0--rc.2-blue)

DSH 的**个人生活时间管理**插件 —— 一份跟你所有会话、所有项目都无关的全局清单。
侧边栏进一个「拾光笺」面板，待办、倒计时、日历、专注、统计全在一页。

## 功能

- **单页面板**：侧边栏「拾光笺」入口打开，任何会话下都是同一份内容；左上角「← 返回」或
  `Esc` 回到对话。左中右五块同屏：**待办 / 日历 / 倒计时 / 专注 / 统计**。
- **待办**：标题、备注、到期时间；一天到点的提醒；可开**每天重复**（完成后自动顺延到第二天同一时间）。
  列表按「**今日拾光** / **来日可期**」分区，逾期未完成的留在今日并标红。
- **到点 + 提前提醒**：host 每 5 秒扫一遍到期任务，经 SSE 推到页面弹提醒条（完成 / 稍后 / 忽略）；
  窗口不可见时改发**静音的 Windows 系统通知**。截止距今 **≥ 2 天**的任务会在到期前一天先提醒一次，
  更近的只在到期时提醒一次。
- **倒计时**：记「距离六级考试还有 X 天」这种目标日，日历里也会标出来。
- **日历**：月视图，标记带到期时间的待办和倒计时，每格最多列 4 条。
- **专注**：正向计时（无时长上限），自己填这次在做什么（或关联一条待办）；结束后落一条记录，
  可删除；统计里按名字画用时扇形图（今天 / 本周 / 本月）。
- **统计**：累计专注时长、已完成待办、专注次数 + GitHub 风格 26 周热力图。
- **右侧待办条（Dock）**：窗口右缘常驻，收起时显示下一件要做的事（时间 + 标题），逾期变红。
- **Agent 工具**：`life_add_task` / `life_list_tasks` / `life_complete_task` / `life_snooze` /
  `life_delete_task`（待办）、`life_add_countdown` / `life_list_countdowns` /
  `life_delete_countdown`（倒计时）、`life_focus_start` / `life_focus_stop`（专注）。
  所以一句「我明天九点要交作业」就够了。

> DSH 会话的「跑完 / 提问 / 审批」提醒属于另一个独立插件 **dsh-session-attention**，
> 与本插件无关、数据互不共享。

## 安装

从源码装（仓库已带构建产物 `lib/`，克隆后直接指过去）：

```bash
git clone https://github.com/fcz20060311/dsh-life-planner.git
dsh plugin --profile desktop add link:<克隆目录>
```

或直接用 Release 里的预构建包：

```bash
dsh plugin --profile desktop add file:<下载好的 dsh-life-planner.tgz>
```

装完在 **设置 → 插件** 里确认 `dsh-life-planner` 已启用；侧边栏会出现「拾光笺」入口。

## 设置与数据

| 项 | 位置 |
|---|---|
| 数据文件 | `~/.dsh/life-planner/todos.json`（待办 + 倒计时 + 专注记录，原子写） |
| HTTP 接口 | `/api/life/state`、`/api/life/events`（SSE 提醒流）、`/api/life/{add,update,delete,complete,snooze,dismiss-reminder,set-settings,countdown/add,countdown/delete,focus/start,focus/stop,focus/delete,heatmap}` |

数据全部在本地，插件不联网、不读取任何凭据。

## 提醒怎么走

1. host 每 5 秒 tick 一次，`到期时间 <= 现在` 且没提醒过的任务生成一条提醒事件。
2. 页面开着（含后台标签页）时，通过 SSE 推一条提醒条，带「完成 / 稍后 / 忽略」。
3. 页面不可见时额外发一条静音系统通知；**DSH 完全关闭期间的提醒会暂存，下次打开补弹**。

## 构建

```bash
npm install          # 只需一次
npm run prepack      # host 半 tsc → lib/；client 半 tsdown → lib/client.js
```

host 半只依赖 `node:` 内置模块（自包含）；client 半经 tsdown 打包为 ModuleLoader 客户端，
React 交给宿主运行时。

## 兼容性

本插件依赖 DSH 的一些**内部点**（服务名、事件名、DOM 类名、客户端包格式）。DSH 演进较快，
这些点在版本之间**会变**。仓库里带了一个自检脚本：

```bash
npm run check:compat                        # 检查本机已装的 DSH
node scripts/check-compat.mjs --from <dir>  # 检查指定目录（CI 用）
```

依赖点断掉往往不是插件自己的 bug，而是 DSH 内部点变了 —— 自检脚本会逐条告诉你断哪条、
坏哪个功能。

## 许可证

[Apache-2.0](./LICENSE)。本项目基于
[Meltllsy/dsh-todo-reminder](https://github.com/Meltllsy/dsh-todo-reminder)（Apache-2.0）
二次开发，署名见 [NOTICE](./NOTICE)。
