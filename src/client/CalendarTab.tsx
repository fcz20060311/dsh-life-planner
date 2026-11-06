/**
 * 日历页签：月视图，把带日期的待办（dueAt）与倒计时目标（targetDate）标到对应日期上。
 * @module dsh-life-planner/client/CalendarTab
 */

import { useState, useSyncExternalStore, type ReactElement } from 'react'
import { todoStore } from './todo-store.ts'
import type { CountdownItem, TodoItem } from '../types.ts'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 本地日期键 YYYY-MM-DD。 */
function dayKey(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface MonthCells {
  year: number
  month: number
  /** 42 格，每格是 YYYY-MM-DD 或 null（非本月）。 */
  cells: Array<string | null>
}

function buildMonth(year: number, month: number): MonthCells {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay()
  const cells: Array<string | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) cells.push(dayKey(new Date(year, month, d)))
  while (cells.length < 42) cells.push(null)
  return { year, month, cells }
}

function isToday(key: string, now: number): boolean {
  return key === dayKey(new Date(now))
}

export function CalendarTab(): ReactElement {
  const { data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const now = data?.now ?? Date.now()

  const todos = (data?.todos ?? []).filter((t) => !t.done && t.dueAt !== undefined) as Array<TodoItem & { dueAt: number }>
  const countdowns = data?.countdowns ?? []

  const todosByDay = new Map<string, TodoItem[]>()
  for (const t of todos) {
    const k = dayKey(new Date(t.dueAt))
    const arr = todosByDay.get(k) ?? []
    arr.push(t)
    todosByDay.set(k, arr)
  }
  const countdownsByDay = new Map<string, CountdownItem[]>()
  for (const c of countdowns) {
    const arr = countdownsByDay.get(c.targetDate) ?? []
    arr.push(c)
    countdownsByDay.set(c.targetDate, arr)
  }

  const grid = buildMonth(cursor.year, cursor.month)
  const prev = (): void => {
    const m = cursor.month - 1
    if (m < 0) setCursor({ year: cursor.year - 1, month: 11 })
    else setCursor({ year: cursor.year, month: m })
  }
  const next = (): void => {
    const m = cursor.month + 1
    if (m > 11) setCursor({ year: cursor.year + 1, month: 0 })
    else setCursor({ year: cursor.year, month: m })
  }
  const goToday = (): void => {
    const t = new Date()
    setCursor({ year: t.getFullYear(), month: t.getMonth() })
  }

  return (
    <div className="life-tab">
      <div className="life-cal-head">
        <button type="button" className="todo-btn" onClick={prev}>‹</button>
        <span className="life-cal-title">{cursor.year} 年 {cursor.month + 1} 月</span>
        <button type="button" className="todo-btn" onClick={next}>›</button>
        <button type="button" className="todo-btn" onClick={goToday}>今天</button>
      </div>

      <div className="life-cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="life-cal-weekday">{w}</div>
        ))}
        {grid.cells.map((key, i) => {
          if (key === null) return <div key={i} className="life-cal-cell life-cal-cell-empty" />
          const dayTodos = todosByDay.get(key) ?? []
          const dayCountdowns = countdownsByDay.get(key) ?? []
          const items = [...dayCountdowns.map((c) => ({ tag: '⏳', text: c.title, danger: false })), ...dayTodos.map((t) => ({ tag: '📋', text: t.title, danger: t.dueAt <= now }))]
          return (
            <div key={key} className="life-cal-cell" data-today={isToday(key, now) ? 'true' : undefined}>
              <div className="life-cal-day">{Number(key.slice(8, 10))}</div>
              <div className="life-cal-items">
                {items.slice(0, 4).map((it, j) => (
                  <div key={j} className="life-cal-item" data-danger={it.danger ? 'true' : undefined} title={it.text}>
                    {it.tag} {it.text}
                  </div>
                ))}
                {items.length > 4 ? <div className="life-cal-more">+{items.length - 4}</div> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
