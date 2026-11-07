/**
 * TodoService：待办 CRUD + 到期提醒调度 + 设置 + 订阅（SSE 推送源）。纯框架无关
 * （不 extend cordis Service、不依赖 @deepseek-ai/* 运行时），只依赖 node: 内置 +
 * 本地 store/types，因此 host 半 tsc 产物自包含、任何装配路径都能加载。
 * @module dsh-life-planner/service
 */

import { randomUUID } from 'node:crypto'
import { loadDoc, saveDoc, todoDataFile, type PersistedTodoDoc } from './store.js'
import { clampNumber, DEFAULT_TODO_SETTINGS, isDateString, isReminderStyle, REMINDER_STYLES, sanitizeMinutesList, type CountdownAddInput, type CountdownItem, type DockSettings, type FocusRun, type FocusSession, type FocusStartInput, type HeatmapCell, type ReminderEvent, type ReminderStyle, type SoundSettings, type TodoAddInput, type TodoItem, type TodoPatch, type TodoSettings, type TodoState } from './types.js'

export interface TodoServiceConfig {
  /** 调度 tick 间隔（ms）。 */
  tickMs?: number
}

/** 默认调度间隔：5 秒。 */
export const DEFAULT_TICK_MS = 5000

/** 提前提醒的启用条件：建/改任务时截止时间距今至少 2 天。 */
export const ADVANCE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000

/** 提前提醒的提前量：截止前一天。 */
export const ADVANCE_LEAD_MS = 24 * 60 * 60 * 1000

/**
 * 按截止时间算提前提醒时刻：
 * 截止距今 ≥2 天才启用，否则 undefined（只在到期时刻提醒）。
 */
export function computeAdvanceAt(dueAt: number | undefined, now: number): number | undefined {
  if (dueAt === undefined) return undefined
  if (dueAt - now < ADVANCE_WINDOW_MS) return undefined
  return dueAt - ADVANCE_LEAD_MS
}

type StateListener = (state: TodoState) => void

/** 设置补丁（按字段允许部分更新）。 */
export interface TodoSettingsPatch {
  soundByStyle?: Partial<Record<ReminderStyle, boolean>>
  snoozeMinutes?: number[]
  sound?: Partial<SoundSettings>
  dock?: Partial<DockSettings>
}

export class TodoService {
  private doc: PersistedTodoDoc
  private readonly dataFile: string
  private readonly subscribers = new Set<StateListener>()

  constructor(dataFile?: string) {
    this.dataFile = dataFile ?? todoDataFile()
    this.doc = loadDoc(this.dataFile)
  }

  /** 订阅状态变化（SSE 推送用）。返回取消订阅函数。 */
  subscribe(listener: StateListener): () => void {
    this.subscribers.add(listener)
    return () => {
      this.subscribers.delete(listener)
    }
  }

  /** 完整状态快照。 */
  state(): TodoState {
    return {
      todos: this.doc.todos.map((t) => ({ ...t })),
      countdowns: this.doc.countdowns.map((c) => ({ ...c })),
      focusSessions: this.doc.focusSessions.map((s) => ({ ...s })),
      focusRunning: this.doc.focusRunning === null ? null : { ...this.doc.focusRunning },
      reminders: this.doc.reminders.map((r) => ({ ...r })),
      settings: this.settings(),
      now: Date.now(),
    }
  }

  /** 新建待办。 */
  add(input: TodoAddInput): TodoItem {
    const title = (input.title ?? '').trim()
    if (title === '') throw new Error('title-empty')
    const now = Date.now()
    const dueAt = typeof input.dueAt === 'number' && Number.isFinite(input.dueAt) ? input.dueAt : undefined
    const todo: TodoItem = {
      id: randomUUID(),
      title,
      note: (input.note ?? '').trim(),
      done: false,
      createdAt: now,
      dueAt,
      reminderStyle: isReminderStyle(input.reminderStyle) ? input.reminderStyle : 'info',
      confirmOnComplete: input.confirmOnComplete === true,
      reminded: false,
      advanceAt: computeAdvanceAt(dueAt, now),
      advanceReminded: false,
      repeat: input.repeat === 'daily' ? 'daily' : undefined,
      repeatDone: input.repeat === 'daily' ? 0 : undefined,
    }
    this.doc.todos.unshift(todo)
    this.flush()
    return { ...todo }
  }

  /** 更新待办字段。 */
  update(id: string, patch: TodoPatch): TodoItem | null {
    const todo = this.doc.todos.find((t) => t.id === id)
    if (todo === undefined) return null
    if (typeof patch.title === 'string') {
      const title = patch.title.trim()
      if (title === '') throw new Error('title-empty')
      todo.title = title
    }
    if (typeof patch.note === 'string') todo.note = patch.note.trim()
    // 只有显式带上 dueAt 键才动提醒时间：缺省键表示「本次不改」，
    // 显式 undefined 表示「清空」。用 in 判断区分二者，否则改标题会连带清掉提醒。
    if ('dueAt' in patch) {
      todo.dueAt = typeof patch.dueAt === 'number' && Number.isFinite(patch.dueAt) ? patch.dueAt : undefined
      todo.reminded = false
      todo.advanceAt = computeAdvanceAt(todo.dueAt, Date.now())
      todo.advanceReminded = false
      todo.snoozedUntil = undefined
    }
    if (isReminderStyle(patch.reminderStyle)) todo.reminderStyle = patch.reminderStyle
    if (typeof patch.confirmOnComplete === 'boolean') todo.confirmOnComplete = patch.confirmOnComplete
    if (typeof patch.done === 'boolean') {
      todo.done = patch.done
      todo.completedAt = patch.done ? Date.now() : undefined
      if (patch.done) this.clearRemindersFor(id)
    }
    this.flush()
    return { ...todo }
  }

  /** 删除待办（并清理其提醒）。 */
  remove(id: string): void {
    this.doc.todos = this.doc.todos.filter((t) => t.id !== id)
    this.clearRemindersFor(id)
    this.flush()
  }

  /** 完成待办（并清理其提醒）。每天重复的任务不结束，而是顺延到下一天。 */
  complete(id: string): TodoItem | null {
    const todo = this.doc.todos.find((t) => t.id === id)
    if (todo === undefined) return null
    if (todo.repeat === 'daily') {
      const now = Date.now()
      const next = new Date(todo.dueAt ?? now)
      next.setDate(next.getDate() + 1)
      while (next.getTime() <= now) next.setDate(next.getDate() + 1)
      todo.dueAt = next.getTime()
      todo.advanceAt = computeAdvanceAt(todo.dueAt, now)
      todo.reminded = false
      todo.advanceReminded = false
      todo.snoozedUntil = undefined
      todo.repeatDone = (todo.repeatDone ?? 0) + 1
      todo.completedAt = now
      this.clearRemindersFor(id)
      this.flush()
      return { ...todo }
    }
    todo.done = true
    todo.completedAt = Date.now()
    todo.reminded = true
    todo.advanceReminded = true
    todo.snoozedUntil = undefined
    this.clearRemindersFor(id)
    this.flush()
    return { ...todo }
  }

  /** 稍后提醒：把已触发的提醒延后 minutes 分钟。 */
  snooze(id: string, minutes: number): TodoItem | null {
    const todo = this.doc.todos.find((t) => t.id === id)
    if (todo === undefined) return null
    const delayMs = Math.max(0, Math.min(24 * 60, minutes)) * 60_000
    todo.snoozedUntil = Date.now() + delayMs
    todo.reminded = false
    todo.advanceReminded = false
    // 撤下当前提醒事件；snooze 到期后由 tick 重新触发。
    this.clearRemindersFor(id)
    this.flush()
    return { ...todo }
  }

  /** 忽略一条提醒（确认已看到，不再提醒）。 */
  dismissReminder(reminderId: string): void {
    this.doc.reminders = this.doc.reminders.filter((r) => r.id !== reminderId)
    this.flush()
  }

  /** 更新用户设置。 */
  setSettings(patch: TodoSettingsPatch): TodoSettings {
    if (typeof patch.soundByStyle === 'object' && patch.soundByStyle !== null) {
      const sbs = patch.soundByStyle as Partial<Record<ReminderStyle, boolean>>
      for (const key of REMINDER_STYLES) {
        if (typeof sbs[key] === 'boolean') this.doc.settings.soundByStyle[key] = sbs[key]
      }
    }
    if (Array.isArray(patch.snoozeMinutes)) {
      const cleaned = sanitizeMinutesList(patch.snoozeMinutes)
      this.doc.settings.snoozeMinutes = cleaned.length > 0 ? cleaned : [...DEFAULT_TODO_SETTINGS.snoozeMinutes]
    }
    if (typeof patch.sound === 'object' && patch.sound !== null) {
      const snd = patch.sound
      if (typeof snd.inPage === 'boolean') this.doc.settings.sound.inPage = snd.inPage
      if (snd.volume !== undefined) this.doc.settings.sound.volume = clampNumber(snd.volume, 0, 1, this.doc.settings.sound.volume)
      if (snd.dangerRepeat !== undefined) {
        this.doc.settings.sound.dangerRepeat = Math.round(clampNumber(snd.dangerRepeat, 1, 5, this.doc.settings.sound.dangerRepeat))
      }
    }
    if (typeof patch.dock === 'object' && patch.dock !== null) {
      const dock = patch.dock
      if (typeof dock.enabled === 'boolean') this.doc.settings.dock.enabled = dock.enabled
      if (typeof dock.showNext === 'boolean') this.doc.settings.dock.showNext = dock.showNext
    }
    this.flush()
    return this.settings()
  }

  /** 当前设置（深拷贝）。 */
  settings(): TodoSettings {
    return {
      soundByStyle: { ...this.doc.settings.soundByStyle },
      snoozeMinutes: [...this.doc.settings.snoozeMinutes],
      sound: { ...this.doc.settings.sound },
      dock: { ...this.doc.settings.dock },
    }
  }

  /**
   * 调度 tick：扫描到期 / 提前提醒的待办，生成提醒事件。
   * @param now - 当前 epoch ms。
   */
  tick(now: number): void {
    let changed = false
    for (const todo of this.doc.todos) {
      if (todo.done || todo.dueAt === undefined) continue
      if (todo.snoozedUntil !== undefined && todo.snoozedUntil > now) continue

      // 提前提醒：截止距今 ≥2 天时，在截止前一天先提醒一次。
      if (!todo.advanceReminded && todo.advanceAt !== undefined && now >= todo.advanceAt && todo.dueAt > now) {
        todo.advanceReminded = true
        this.pushReminder(todo, 'advance', now)
        changed = true
      }

      // 到期提醒：其余只在到期时刻提醒一次。
      if (!todo.reminded && todo.dueAt <= now) {
        todo.reminded = true
        todo.snoozedUntil = undefined
        this.pushReminder(todo, 'due', now)
        changed = true
      }
    }
    if (changed) this.flush()
  }

  /** 倒计时（如「距离六级考试还有 X 天」）。 */
  addCountdown(input: CountdownAddInput): CountdownItem {
    const title = (input.title ?? '').trim()
    if (title === '') throw new Error('title-empty')
    if (!isDateString(input.targetDate)) throw new Error('bad-date')
    const item: CountdownItem = { id: randomUUID(), title, targetDate: input.targetDate, createdAt: Date.now() }
    this.doc.countdowns.unshift(item)
    this.flush()
    return { ...item }
  }

  removeCountdown(id: string): void {
    this.doc.countdowns = this.doc.countdowns.filter((c) => c.id !== id)
    this.flush()
  }

  /** 开始一次专注计时（正向计时，不设时长）。可只带自定义名称，也可关联待办。 */
  startFocus(input?: FocusStartInput | string): FocusRun {
    if (this.doc.focusRunning !== null) throw new Error('focus-already-running')
    const opts: FocusStartInput = typeof input === 'string' ? { taskId: input } : (input ?? {})
    const taskId = typeof opts.taskId === 'string' && opts.taskId !== '' ? opts.taskId : undefined
    const rawLabel = typeof opts.label === 'string' ? opts.label.trim() : ''
    const label = rawLabel === '' ? undefined : rawLabel.slice(0, 40)
    const run: FocusRun = {
      startedAt: Date.now(),
      ...(taskId !== undefined ? { taskId } : {}),
      ...(label !== undefined ? { label } : {}),
    }
    this.doc.focusRunning = run
    this.flush()
    return { ...run }
  }

  /** 结束当前专注，落一条记录。 */
  stopFocus(): FocusSession {
    const run = this.doc.focusRunning
    if (run === null) throw new Error('focus-not-running')
    const endedAt = Date.now()
    const session: FocusSession = {
      id: randomUUID(),
      startedAt: run.startedAt,
      endedAt,
      durationMs: endedAt - run.startedAt,
      ...(typeof run.taskId === 'string' ? { taskId: run.taskId } : {}),
      ...(typeof run.label === 'string' && run.label !== '' ? { label: run.label } : {}),
    }
    this.doc.focusSessions.unshift(session)
    this.doc.focusRunning = null
    this.flush()
    return { ...session }
  }

  /** 删除一条专注记录。 */
  removeFocusSession(id: string): void {
    this.doc.focusSessions = this.doc.focusSessions.filter((s) => s.id !== id)
    this.flush()
  }

  /** 给一条专注记录改名（事后补名字）；空字符串表示清除名字。 */
  renameFocusSession(id: string, label: string): void {
    const hit = this.doc.focusSessions.find((s) => s.id === id)
    if (hit === undefined) throw new Error('focus-not-found')
    const trimmed = label.trim().slice(0, 40)
    if (trimmed === '') delete hit.label
    else hit.label = trimmed
    this.flush()
  }

  /** 最近 days 天的热力图：按本地日期聚合「完成待办数 + 专注毫秒」。 */
  heatmap(days = 365): Record<string, HeatmapCell> {
    const result: Record<string, HeatmapCell> = {}
    const limit = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000
    const key = (ts: number): string => {
      const d = new Date(ts)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const bump = (k: string): HeatmapCell => (result[k] ?? (result[k] = { tasks: 0, focusMs: 0 }))
    for (const todo of this.doc.todos) {
      if (todo.completedAt === undefined || todo.completedAt < limit) continue
      bump(key(todo.completedAt)).tasks += 1
    }
    for (const session of this.doc.focusSessions) {
      if (session.endedAt < limit) continue
      bump(key(session.endedAt)).focusMs += session.durationMs
    }
    return result
  }

  private pushReminder(todo: TodoItem, kind: ReminderEvent['kind'], now: number): void {
    this.doc.reminders.push({
      id: randomUUID(),
      todoId: todo.id,
      title: todo.title,
      style: todo.reminderStyle,
      kind,
      firedAt: now,
    })
  }

  private clearRemindersFor(todoId: string): void {
    this.doc.reminders = this.doc.reminders.filter((r) => r.todoId !== todoId)
  }

  private flush(): void {
    saveDoc(this.doc, this.dataFile)
    this.notify()
  }

  private notify(): void {
    const state = this.state()
    for (const listener of this.subscribers) {
      try {
        listener(state)
      } catch {
        // 单个订阅者异常不得拖垮其它推送。
      }
    }
  }
}
