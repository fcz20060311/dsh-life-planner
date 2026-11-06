/**
 * 统计页签：累计专注时长 + 完成数 + 近半年热力图（GitHub 风格）。
 * 热力图由客户端从 focusSessions + 已完成待办的 completedAt 直接聚合，无需额外接口。
 * @module dsh-life-planner/client/StatsTab
 */

import { useSyncExternalStore, type ReactElement } from 'react'
import { todoStore } from './todo-store.ts'

function dayKey(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`
}

const WEEKS = 26

export function StatsTab(): ReactElement {
  const { data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  const todos = data?.todos ?? []
  const sessions = data?.focusSessions ?? []
  const now = data?.now ?? Date.now()

  const totalFocusMs = sessions.reduce((sum, s) => sum + s.durationMs, 0)
  const completedCount = todos.filter((t) => t.done).length

  // 聚合每「自然日」的活动量：完成数 + 专注（每满 30 分钟算 1 个单位）。
  const activity = new Map<string, { tasks: number; focusMs: number }>()
  for (const t of todos) {
    if (!t.done || t.completedAt === undefined) continue
    const k = dayKey(new Date(t.completedAt))
    const cell = activity.get(k) ?? { tasks: 0, focusMs: 0 }
    cell.tasks += 1
    activity.set(k, cell)
  }
  for (const s of sessions) {
    const k = dayKey(new Date(s.endedAt))
    const cell = activity.get(k) ?? { tasks: 0, focusMs: 0 }
    cell.focusMs += s.durationMs
    activity.set(k, cell)
  }

  const levelOf = (k: string): number => {
    const cell = activity.get(k)
    if (cell === undefined) return 0
    const units = cell.tasks + Math.floor(cell.focusMs / (30 * 60_000))
    if (units <= 0) return 0
    if (units === 1) return 1
    if (units <= 3) return 2
    if (units <= 6) return 3
    return 4
  }

  // 列 = 周，行 = 周日..周六；从 today 往前回退到所在周的周日，再往前铺 WEEKS 周。
  const today = new Date(now)
  const endOfWeek = new Date(today)
  endOfWeek.setHours(0, 0, 0, 0)
  // 让最后一列是「本周」，向前铺。
  const columns: Array<string[]> = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    // 找到该列的周日（getDay() 0=周日），再顺延 7 天。
    const sunday = new Date(endOfWeek)
    sunday.setDate(endOfWeek.getDate() - w * 7)
    sunday.setDate(sunday.getDate() - sunday.getDay())
    const col: string[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(sunday)
      day.setDate(sunday.getDate() + d)
      col.push(dayKey(day))
    }
    columns.push(col)
  }

  const totalUnits = [...activity.values()].reduce((sum, c) => sum + c.tasks + Math.floor(c.focusMs / (30 * 60_000)), 0)

  return (
    <div className="life-tab">
      <div className="life-stat-cards">
        <div className="life-stat-card">
          <div className="life-stat-value">{formatDuration(totalFocusMs)}</div>
          <div className="life-stat-label">累计专注</div>
        </div>
        <div className="life-stat-card">
          <div className="life-stat-value">{completedCount}</div>
          <div className="life-stat-label">已完成待办</div>
        </div>
        <div className="life-stat-card">
          <div className="life-stat-value">{sessions.length}</div>
          <div className="life-stat-label">专注次数</div>
        </div>
      </div>

      <div className="life-heat-title">近 {WEEKS} 周活动（完成任务 + 每 30 分钟专注计 1 格）</div>
      <div className="life-heat">
        {columns.map((col, ci) => (
          <div key={ci} className="life-heat-col">
            {col.map((k) => {
              const level = levelOf(k)
              const cell = activity.get(k)
              const title = cell === undefined ? k : `${k}：完成 ${cell.tasks} · 专注 ${formatDuration(cell.focusMs)}`
              return <div key={k} className="life-heat-cell" data-level={level} title={title} />
            })}
          </div>
        ))}
      </div>
      <div className="life-heat-legend">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className="life-heat-cell" data-level={l} />)}
        <span>多</span>
        <span className="life-stat-line" style={{ marginLeft: 'auto' }}>近半年共 {totalUnits} 个活动单位</span>
      </div>
    </div>
  )
}
