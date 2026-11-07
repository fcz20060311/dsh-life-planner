/**
 * 浏览器 → host 的同源 JSON API 封装（与 dsh-pet 的 /api/pet/* 同模式）。
 * @module dsh-life-planner/client/api
 */

import type { CountdownItem, DockSettings, FocusRun, FocusSession, HeatmapCell, ReminderStyle, SoundSettings, TodoState } from '../types.ts'

async function todoFetch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined
    ? {}
    : {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
  if (!response.ok) {
    throw new Error(`todo ${path} failed: ${response.status}`)
  }
  return (await response.json()) as T
}

export interface TodoAddPayload {
  title: string
  note: string
  dueAt?: number
  reminderStyle: ReminderStyle
  confirmOnComplete: boolean
  repeat?: 'daily'
}

export const todoApi = {
  /** 在文件管理器里打开数据目录（自定义音效放这里）。 */
  openDir: () => todoFetch<{ ok: boolean, dir?: string }>('/api/life/open-dir', {}),
  state: () => todoFetch<TodoState>('/api/life/state'),
  add: (input: TodoAddPayload) => todoFetch<{ ok: boolean }>('/api/life/add', input),
  update: (id: string, patch: Record<string, unknown>) =>
    todoFetch<{ ok: boolean }>('/api/life/update', { id, patch }),
  remove: (id: string) => todoFetch<{ ok: boolean }>('/api/life/delete', { id }),
  complete: (id: string) => todoFetch<{ ok: boolean }>('/api/life/complete', { id }),
  snooze: (id: string, minutes: number) => todoFetch<{ ok: boolean }>('/api/life/snooze', { id, minutes }),
  dismissReminder: (reminderId: string) =>
    todoFetch<{ ok: boolean }>('/api/life/dismiss-reminder', { reminderId }),
  setSettings: (settings: {
    soundByStyle?: Partial<Record<ReminderStyle, boolean>>
    snoozeMinutes?: number[]
    sound?: Partial<SoundSettings>
    dock?: Partial<DockSettings>
  }) => todoFetch<{ ok: boolean }>('/api/life/set-settings', { settings }),
  addCountdown: (input: { title: string, targetDate: string }) =>
    todoFetch<{ ok: boolean, countdown: CountdownItem }>('/api/life/countdown/add', input),
  removeCountdown: (id: string) => todoFetch<{ ok: boolean }>('/api/life/countdown/delete', { id }),
  focusStart: (input?: { taskId?: string, label?: string }) =>
    todoFetch<{ ok: boolean, focusRunning: FocusRun }>('/api/life/focus/start', input ?? {}),
  focusStop: () => todoFetch<{ ok: boolean, session: FocusSession }>('/api/life/focus/stop', {}),
  deleteFocus: (id: string) => todoFetch<{ ok: boolean }>('/api/life/focus/delete', { id }),
  renameFocus: (id: string, label: string) => todoFetch<{ ok: boolean }>('/api/life/focus/rename', { id, label }),
  heatmap: () => todoFetch<{ ok: boolean, heatmap: Record<string, HeatmapCell> }>('/api/life/heatmap'),
}
