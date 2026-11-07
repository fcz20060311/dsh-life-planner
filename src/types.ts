/**
 * 共享类型：host 与 client 都引用的数据结构（纯类型 + 少量纯函数）。
 * 本包只管**个人待办** —— 一份全局清单，与 DSH 会话、与任何具体任务无关。
 * 会话的完成/审批提醒在另一个独立插件 dsh-session-attention 里。
 * @module dsh-life-planner/types
 */

/** 提醒样式：决定提醒通知的配色 / 图标 / 动画。 */
export type ReminderStyle = 'info' | 'success' | 'warning' | 'danger'

export const REMINDER_STYLES: readonly ReminderStyle[] = ['info', 'success', 'warning', 'danger']

export function isReminderStyle(value: unknown): value is ReminderStyle {
  return typeof value === 'string' && (REMINDER_STYLES as readonly string[]).includes(value)
}

/** 夹紧数值到 [min,max]；非有限数回退 fallback。 */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** 一条待办。 */
export interface TodoItem {
  id: string
  title: string
  note: string
  done: boolean
  createdAt: number
  completedAt?: number
  /** 到期提醒时间（epoch ms）。缺省表示不提醒。 */
  dueAt?: number
  reminderStyle: ReminderStyle
  /** 完成前需要确认（弹出确认框）。 */
  confirmOnComplete: boolean
  /** 到期提醒是否已触发（防止每个 tick 重复触发）。 */
  reminded: boolean
  /** 提前提醒时间（epoch ms）：仅当建/改任务时截止距今 ≥2 天才设，= 截止前一天。 */
  advanceAt?: number
  /** 提前提醒是否已触发。 */
  advanceReminded: boolean
  /** 稍后提醒：在此时间之前不再次触发。 */
  snoozedUntil?: number
  /** 重复：'daily' 表示每天同一时间；完成时自动顺延到第二天。 */
  repeat?: 'daily'
  /** 重复任务累计完成次数。 */
  repeatDone?: number
}

/** 提醒类型：提前一天 / 到期。 */
export type ReminderKind = 'advance' | 'due'

/** 一条待确认（未处理）的提醒事件，展示给用户。 */
export interface ReminderEvent {
  id: string
  todoId: string
  title: string
  style: ReminderStyle
  kind: ReminderKind
  firedAt: number
}

/** 倒计时（如「距离六级考试还有 X 天」）。 */
export interface CountdownItem {
  id: string
  title: string
  /** 目标日期，本地日期字符串 YYYY-MM-DD。 */
  targetDate: string
  createdAt: number
}

/** 正在进行的专注计时（正向计时，不设时长）。 */
export interface FocusRun {
  startedAt: number
  /** 关联任务（可选）。 */
  taskId?: string
  /** 自定义名称（可选）：这次专注在做什么，自由填写。 */
  label?: string
}

/** 开始专注的入参：可带自定义名称，也可关联待办。 */
export interface FocusStartInput {
  taskId?: string
  label?: string
}

/** 一次已完成的专注记录。 */
export interface FocusSession {
  id: string
  startedAt: number
  endedAt: number
  durationMs: number
  taskId?: string
  /** 自定义名称（可选）。 */
  label?: string
}


/** 提醒音设置：页面内音效引擎（自定义音效文件优先，缺失时 WebAudio 合成）。 */
export interface SoundSettings {
  /** 页面开着时也出声；关闭则退回「只靠系统通知的默认提示音」。 */
  inPage: boolean
  /** 音量 0..1。 */
  volume: number
  /** danger 样式连响次数（1..5），用于强调紧急提醒。 */
  dangerRepeat: number
}

/** 待办 Dock 设置（右侧边缘常驻小窗）。 */
export interface DockSettings {
  /** 是否显示待办 Dock。 */
  enabled: boolean
  /** 收起时显示下一条待办的标题与到期时间。 */
  showNext: boolean
}

/** 用户可自定义的设置（全部属于待办模块）。 */
export interface TodoSettings {
  /** 每种样式是否响铃（页面内音效与系统通知的 silent 取值共用）。 */
  soundByStyle: Record<ReminderStyle, boolean>
  /** 稍后提醒的分钟数选项（GUI toast 的「稍后N分钟」按钮）。 */
  snoozeMinutes: number[]
  /** 提醒音设置。 */
  sound: SoundSettings
  /** 右侧常驻 Dock。 */
  dock: DockSettings
}

export const DEFAULT_TODO_SETTINGS: TodoSettings = {
  soundByStyle: { info: true, success: true, warning: true, danger: true },
  snoozeMinutes: [5, 15, 60],
  sound: { inPage: true, volume: 0.7, dangerRepeat: 3 },
  dock: { enabled: true, showNext: true },
}

/** 清洗分钟数列表：只留 1..1440 的整数、去重、升序、限长 8。空返回空数组。 */
export function sanitizeMinutesList(values: readonly unknown[]): number[] {
  const set = new Set<number>()
  for (const value of values) {
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isInteger(n) && n >= 1 && n <= 1440) set.add(n)
  }
  return [...set].sort((a, b) => a - b).slice(0, 8)
}

/** host 返回给浏览器的完整状态。 */
export interface TodoState {
  todos: TodoItem[]
  countdowns: CountdownItem[]
  focusSessions: FocusSession[]
  focusRunning: FocusRun | null
  reminders: ReminderEvent[]
  settings: TodoSettings
  now: number
}

/** 热力图单元格：某一天的完成数 + 专注毫秒。 */
export interface HeatmapCell {
  tasks: number
  focusMs: number
}


/** SSE 推送信封（待办模块只有状态一种消息）。 */
export type PushMessage = { type: 'state'; state: TodoState }

/** 新建待办的输入。 */
export interface TodoAddInput {
  title: string
  note?: string
  dueAt?: number
  reminderStyle?: ReminderStyle
  confirmOnComplete?: boolean
  /** 'daily' = 每天重复；缺省为一次性。 */
  repeat?: 'daily'
}

/** 新建倒计时的输入。 */
export interface CountdownAddInput {
  title: string
  /** 本地日期字符串 YYYY-MM-DD。 */
  targetDate: string
}

/** 日期字符串校验：YYYY-MM-DD 且为真实日期。 */
export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00`)
  return !Number.isNaN(d.getTime()) && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === value
}


/** 更新待办的补丁。 */
export interface TodoPatch {
  title?: string
  note?: string
  dueAt?: number
  reminderStyle?: ReminderStyle
  confirmOnComplete?: boolean
  done?: boolean
}
