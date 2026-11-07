/**
 * 统计页签：累计专注时长 + 用时扇形图（日/周/月切换）+ 近半年热力图（GitHub 风格）。
 * 全部由客户端从 focusSessions + 已完成待办的 completedAt 直接聚合，无需额外接口。
 * @module dsh-life-planner/client/StatsTab
 */

import { useSyncExternalStore, useState, type ReactElement } from 'react'
import { todoStore } from './todo-store.ts'
import type { FocusSession } from '../types.ts'

function dayKey(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`
  return `${m} 分钟`
}

/** 图例里的短时长：1h20m / 25m。 */
function shortDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`
  return `${m}m`
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** 本周一 0 点。 */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay() // 0=周日
  x.setDate(x.getDate() - ((day + 6) % 7))
  return x
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

type Range = 'day' | 'week' | 'month'

const RANGES: Array<{ key: Range; label: string }> = [
  { key: 'day', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
]

const PIE_COLORS = ['#e0a94f', '#7fbf9a', '#7aa7d4', '#b08ad4', '#e08d6f', '#d47f9d', '#8fa9a0', '#c9b46f']

function rangeStart(range: Range, now: Date): Date {
  if (range === 'day') return startOfDay(now)
  if (range === 'week') return startOfWeek(now)
  return startOfMonth(now)
}

const WEEKS = 26

export function StatsTab(): ReactElement {
  const { data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  const [range, setRange] = useState<Range>('day')
  const todos = data?.todos ?? []
  const sessions = data?.focusSessions ?? []
  const now = data?.now ?? Date.now()

  const totalFocusMs = sessions.reduce((sum, s) => sum + s.durationMs, 0)
  const completedCount = todos.filter((t) => t.done).length + todos.reduce((sum, t) => sum + (t.repeatDone ?? 0), 0)

  // 扇形图：按「自定义名称 / 关联待办」聚合所选时间段的专注时长。
  const titleOf = (session: FocusSession): string => {
    if (session.label !== undefined && session.label !== '') return session.label
    if (session.taskId === undefined) return '未命名'
    const hit = todos.find((t) => t.id === session.taskId)
    return hit === undefined ? '未命名' : hit.title
  }
  const start = rangeStart(range, new Date(now)).getTime()
  const pieMap = new Map<string, number>()
  for (const s of sessions) {
    if (s.endedAt < start || s.durationMs <= 0) continue
    const key = titleOf(s)
    pieMap.set(key, (pieMap.get(key) ?? 0) + s.durationMs)
  }
  const slices = [...pieMap.entries()]
    .map(([title, ms]) => ({ title, ms }))
    .sort((a, b) => b.ms - a.ms)
  const pieTotal = slices.reduce((sum, s) => sum + s.ms, 0)

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
  const columns: Array<string[]> = []
  for (let w = WEEKS - 1; w >= 0; w--) {
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

  const R = 46
  const CIRC = 2 * Math.PI * R

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

      <div className="life-pie-head">
        <span className="life-pie-title">花在哪了</span>
        <div className="life-pie-switch">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className="life-pie-tab"
              data-active={range === r.key ? 'true' : undefined}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {slices.length === 0 ? (
        <div className="todo-empty">这段时间还没有专注记录。</div>
      ) : (
        <div className="life-pie">
          <svg className="life-pie-svg" viewBox="0 0 120 120" role="img" aria-label="用时分布扇形图">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="14" />
            {(() => {
              let offset = 0
              return slices.map((s, i) => {
                const len = (s.ms / pieTotal) * CIRC
                const el = (
                  <circle
                    key={s.title}
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    stroke={PIE_COLORS[i % PIE_COLORS.length]}
                    strokeWidth="14"
                    strokeDasharray={`${Math.max(len - 1.5, 0)} ${CIRC}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 60 60)"
                  >
                    <title>{`${s.title}：${formatDuration(s.ms)}（${Math.round((s.ms / pieTotal) * 100)}%）`}</title>
                  </circle>
                )
                offset += len
                return el
              })
            })()}
            <text x="60" y="57" textAnchor="middle" className="life-pie-center">{shortDuration(pieTotal)}</text>
            <text x="60" y="73" textAnchor="middle" className="life-pie-center-label">合计</text>
          </svg>
          <div className="life-pie-legend">
            {slices.map((s, i) => (
              <div className="life-pie-row" key={s.title} title={formatDuration(s.ms)}>
                <span className="life-pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="life-pie-name">{s.title}</span>
                <span className="life-pie-val">{Math.round((s.ms / pieTotal) * 100)}%</span>
                <span className="life-pie-time">{shortDuration(s.ms)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
