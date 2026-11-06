# dsh-life-planner

![license](https://img.shields.io/npm/l/dsh-life-planner)
![dsh](https://img.shields.io/badge/dsh-%3E%3D0.2.0--rc.2-blue)

DSH 的**个人生活时间管理**插件 —— 一份跟你所有会话、所有项目都无关的全局清单：
任务、提醒、倒计时、日历、专注计时和打卡热力图，都在一个「生活」面板里。

## 功能

- **全局面板 · 5 页签**：侧边栏「生活」入口打开，浮在页面中央（不挂在会话列里），
  任何会话下打开都是同一份内容。页签：**待办 / 倒计时 / 日历 / 专注 / 统计**。
- **待办**：新建（标题 / 备注 / 到期时间 / 提醒样式 / 完成需确认）、完成、删除；
  待办 / 已完成分区展示；Esc 或点空白处关闭。
- **到点 + 提前提醒**：host 每 5 秒扫描到期任务，经 SSE 推到浏览器弹富 toast（完成 /
  稍后提醒 / 忽略）；**切出窗口时转成系统原生通知**。截止时间距今 **≥ 2 天**的任务会
  在到期前一天先提醒一次，其余只在到期时刻提醒。
- **右侧待办条（Dock）**：窗口右缘常驻、可收起；收起时直接显示下一件要做的事
  （到期时间 + 标题），逾期变红；可上下拖动，可在设置里关闭。
- **倒计时**：记「距离六级考试还有 X 天」这种；日历页签也会把它标出来。
- **日历**：月视图，标记带到期时间的待办和倒计时。
- **专注**：正向计时（不设时长上限），可关联一条待办，结束后计入统计。
- **统计**：累计专注时长 / 已完成待办 / 专注次数 + GitHub 风格 26 周热力图。
- **4 种提醒样式**：info（蓝）/ success（绿）/ warning（黄）/ danger（红）。
- **提醒音**：每种样式可单独开关响铃；音量、音色可调；可试听；danger 可连响。
- **完成需确认**：任务可开启，点「完成」先弹确认框。
- **Agent 工具**：`life_add_task` / `life_list_tasks` / `life_complete_task` /
  `life_snooze` / `life_delete_task`（待办）、`life_add_countdown` / `life_list_countdowns` /
  `life_delete_countdown`（倒计时）、`life_focus_start` / `life_focus_stop`（专注）。

> DSH 会话的「跑完 / 提问 / 审批」提醒属于另一个独立插件 **dsh-session-attention**，
> 与本插件无关、数据互不共享。

## 安装

从 npm 装（推荐）：

```bash
dsh plugin --profile desktop add dsh-life-planner    # 桌面端
dsh plugin --profile web     add dsh-life-planner    # 浏览器版
```

从源码装（仓库已带构建产物 `lib/`，克隆后直接指过去）：

```bash
git clone https://github.com/fcz20060311/dsh-life-planner.git
dsh plugin --profile desktop add link:<克隆目录>
```

## 设置与数据

| 项 | 位置 |
|---|---|
| 数据文件 | `~/.dsh/life-planner/todos.json`（待办 + 倒计时 + 专注记录 + 设置，原子写） |
| 自定义提醒音 | `~/.dsh/life-planner/sound.{mp3,wav,ogg,m4a}` |
| HTTP 接口 | `/api/life/state`、`/api/life/events`（SSE）、`/api/life/sound`、`/api/life/{add,update,delete,complete,snooze,dismiss-reminder,set-settings,countdown/add,countdown/delete,focus/start,focus/stop,heatmap}` |

## 提醒音怎么走

1. **自定义音效文件优先**：音频解锁后探测 `/api/life/sound`，命中则解码使用。
2. **内置合成音兜底**：没有文件 / 解码失败时用 WebAudio 现场合成四种音色。
3. **系统通知兜底**：音频尚未解锁时，由系统通知自己出声。

音频解锁靠 document 上的手势监听自动完成（点 DSH 里任何地方即可）。页面内音效在前台/
后台都会响；**页面完全关闭时不会响**，那时只有系统通知，而浏览器通知只能用系统默认音。

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
二次开发。
