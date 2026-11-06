# dsh-life-planner 实现计划

> **For agentic workers:** 按 Phase 顺序执行；每个 Phase 结束都应能在 DSH 里看到可见进展。步骤用 `- [ ]` 跟踪。

**Goal:** 在 DSH 侧边栏提供「生活时间管理」：一句话记任务、到点 Windows 通知、倒计时、日历视图、正向计时专注、专注时长与打卡热力图。

**Architecture:** 基于 `dsh-todo-reminder@0.3.0`（Apache-2.0）的成熟双半结构做二次开发——host 半（cordis 插件：`LifePlannerService` + HTTP/SSE 路由 + 定时调度 + agent 工具，只用 node 内置）与 client 半（`window.__ModuleLoader__` 包装的 React 面板）。数据存 `$DSH_HOME/life-planner/data.json`。

**Tech Stack:** TypeScript、cordis、`@deepseek-ai/dsh-client-runtime`（client）、`tsc`（host）、`tsdown`（client）。

**Spec:** `C:\Users\35610\Desktop\dsh-life-planner\docs\design.md`

**Base 源码副本:** `C:\Users\35610\Desktop\_lpb-base`（Meltllsy/dsh-todo-reminder，main@0.3.0）

## Global Constraints
- `dsh.engines.dsh` = `>=0.2.0-rc.2`（本机 0.2.2-rc.1）。
- 包名 `dsh-life-planner`；cordis insert id `life-planner`；`tsdown.config.ts` 的 `PLUGIN_ID` 必须等于包名。
- host 半不 import `@deepseek-ai/*`，只依赖 `node:` 内置 + 本地模块。
- 数据文件 `$DSH_HOME/life-planner/data.json`；原子写（写 `.tmp` 再 rename）。
- 提醒规则：截止距今 **≥2 天** → **截止前一天**再提醒一次；**<2 天**（明天/当天）→ 只在到期时刻提醒。
- 逾期（`now > dueAt` 且未完成）标红并置顶。
- 本期不做：优先级、子任务、开始时间、语音、音乐、周报月报、外部日历、导出、云端同步。
- UI 全中文；治愈系视觉最后再调。

## 重命名映射（base → 本插件）

| base | 本插件 |
|------|--------|
| 包名 `dsh-todo-reminder` | `dsh-life-planner` |
| cordis id `todo-reminder` | `life-planner` |
| HTTP `/api/todo/*` | `/api/life/*` |
| 数据目录 `todo-reminder` | `life-planner` |
| 工具 `todo_*` | `life_*` |
| `TodoService` 等类型 | `LifePlannerService` 等 |

## 文件结构（目标）

```
src/
  index.ts          # host 入口：apply(ctx, config)、注册路由/工具/调度/公告
  types.ts          # Task / Countdown / FocusSession / Settings 等类型
  store.ts          # data.json 持久化（原子写）
  service.ts        # LifePlannerService：todo + countdown + focus + settings + tick
  routes.ts         # HTTP 路由 + SSE
  tools.ts          # agent 工具 life_*
  client/
    index.tsx       # 客户端入口：注册侧边栏入口 + Dock + 提醒层
    api.ts          # 调 /api/life/*
    store.ts        # 浏览器端 store（useSyncExternalStore）
    panel-seat.tsx  # 侧边栏座位挂载
    ReminderLayer.tsx
    sound.ts
    styles.ts
    TodoPanel.tsx   # 待办 tab
    TodoDock.tsx    # 右侧 Dock
    CountdownTab.tsx
    CalendarTab.tsx
    FocusTab.tsx
    StatsTab.tsx
    Heatmap.tsx
```

---

## Phase 0：脚手架与重命名（可见进展：侧边栏出现「生活」面板）

**Task 0.1 复制源码并改名**
- [ ] 复制 base 的 `src/ scripts/ tsconfig*.json tsdown.config.ts cordis.patch.yml LICENSE .gitignore` 到项目根（不复制 `.git`、`lib`、`.github`、`docs`）
- [ ] 全局改名：`dsh-todo-reminder` → `dsh-life-planner`；`todo-reminder` → `life-planner`；`/api/todo` → `/api/life`
- [ ] `package.json`：改 name/description/keywords/repository（指向你的 GitHub）
- [ ] `tsdown.config.ts`：`PLUGIN_ID = 'dsh-life-planner'`
- [ ] `cordis.patch.yml`：`id: life-planner`、`name: 'dsh-life-planner'`

**Task 0.2 构建并装进 profile**
- [ ] `npm install`（需要 tsdown、typescript、react 等 devDeps）
- [ ] `npm run build && npm run build:client`
- [ ] 把包安装到 `C:\Users\35610\.dsh\profiles\desktop`（与其它插件同一 node_modules）
- [ ] 重启/刷新 DSH，确认侧边栏出现「生活」入口、面板能打开

**验收：** 面板打开、无报错；数据文件在 `$DSH_HOME/life-planner/data.json` 生成。

---

## Phase 1：数据模型与存储（Task 等）

- [ ] `types.ts` 增加：
  - `TaskItem`（沿用 TodoItem，去掉优先级相关，`advanceAt?: number`、`advanceReminded: boolean`）
  - `CountdownItem { id, title, targetDate, createdAt }`
  - `FocusSession { id, startedAt, endedAt, taskId? }`
  - `LifeSettings`（沿用 TodoSettings + 专注/热力图相关）
  - `LifeState { tasks, countdowns, focusSessions, reminders, settings, now }`
- [ ] `store.ts`：`PersistedLifeDoc`、`loadDoc/saveDoc`（原子写）、`dataFile()`
- [ ] `service.ts`：`LifePlannerService`
  - task CRUD（add/update/remove/complete/snooze/dismissReminder）
  - countdown CRUD（add/remove）
  - focus（start/stop → 记录 session；`focus.totalMs` 统计）
  - `tick(now)`：到期提醒 + 提前提醒（见 Phase 2）
  - `heatmap()`：按天聚合（完成数 + 专注毫秒）

**验收：** 单测（node:test）覆盖 CRUD 与 tick；`node --test` 通过。

---

## Phase 2：提醒引擎（核心规则）

- [ ] 在 `add/update` 设置 `dueAt` 时计算：
  ```ts
  const ADVANCE_WINDOW = 2 * 24 * 60 * 60 * 1000
  const ADVANCE_LEAD = 24 * 60 * 60 * 1000
  const advanceEligible = dueAt - Date.now() >= ADVANCE_WINDOW
  task.advanceAt = advanceEligible ? dueAt - ADVANCE_LEAD : undefined
  task.advanceReminded = false
  task.reminded = false
  ```
- [ ] `tick(now)` 增加提前提醒分支：`advanceAt !== undefined && !advanceReminded && now >= advanceAt` → push 一条 `ReminderEvent { kind: 'advance' }`，置 `advanceReminded = true`
- [ ] 到期提醒维持原逻辑（`now >= dueAt` 且未 `reminded`），`ReminderEvent { kind: 'due' }`
- [ ] `ReminderEvent` 增加 `kind: 'advance' | 'due'`，client 据此显示「还有 1 天到期」/「已到期」
- [ ] 单测：≥2 天任务在 `dueAt-1d` 触发 advance；<2 天任务不触发 advance；到期仍触发 due

**验收：** 单测通过；GUI 里能看到两条不同文案的提醒。

---

## Phase 3：客户端——待办 tab + Dock

- [ ] `client/api.ts` 改调 `/api/life/*`
- [ ] `client/store.ts` 改类型与事件名
- [ ] `TodoPanel.tsx` → 待办 tab（增删改完成、逾期标红）
- [ ] `TodoDock.tsx` → 右侧 Dock（收起显示下一件事）
- [ ] 提醒层改成两种 kind 的文案

**验收：** GUI 添加/完成/提醒跑通。

---

## Phase 4：倒计时 tab

- [ ] `CountdownTab.tsx`：输入标题+日期 → 显示「距离 X 还有 Y 天」，每天自动更新（用 `now` 重算）
- [ ] host：countdown CRUD 路由 + `state()` 返回

**验收：** 添加「六级考试」显示剩余天数。

---

## Phase 5：日历 tab

- [ ] `CalendarTab.tsx`：日/周/月三视图，按 `dueAt` 把任务铺到对应日期
- [ ] 点某天 → 该天任务列表
- [ ] 纯前端计算（不需要新 host 接口，用现有 tasks）

**验收：** 日历上能看到任务点。

---

## Phase 6：专注正计时 + 统计/热力图

- [ ] `FocusTab.tsx`：开始/暂停/结束，正向计时；结束时 `life_focus_stop` → 记录 `FocusSession`
- [ ] 可选关联任务
- [ ] `StatsTab.tsx`：累计专注时长 + `Heatmap.tsx` 绿格子（当天完成≥1 任务或专注>0 点亮）
- [ ] host：`focus/start`、`focus/stop` 路由 + `heatmap()` 聚合

**验收：** 计时能停、历史累加、热力图有格子。

---

## Phase 7：agent 工具 + README + 发布

- [ ] `tools.ts`：`life_add_task`、`life_list_tasks`、`life_complete_task`、`life_snooze`、`life_add_countdown`、`life_list_countdowns`
- [ ] `TODO_GUIDANCE` 改写为「生活时间管理」公告
- [ ] `README.md`（中文：安装、功能、截图占位）
- [ ] `LICENSE` 保留 Apache-2.0 + 注明基于 Meltllsy/dsh-todo-reminder
- [ ] 本地安装验证 → GitHub 上传 → 插件市场提交

**验收：** `life_add_task` 等工具在 agent 里可用；README 完整。
