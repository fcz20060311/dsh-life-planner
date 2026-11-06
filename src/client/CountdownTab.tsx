/**
 * 倒计时页签：记录「距离某个日期还有几天」的目标（如六级考试、生日）。
 * @module dsh-life-planner/client/CountdownTab
 */

import { useState, useSyncExternalStore, type ReactElement } from 'react'
import { todoStore } from './todo-store.ts'

/** 目标日期距今天的天数（本地自然日，向上取整）。 */
function daysLeft(targetDate: string, now: number): number {
  const target = new Date(`${targetDate}T00:00:00`).getTime()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target - today.getTime()) / 86_400_000)
}

function label(days: number): string {
  if (days > 0) return `还有 ${days} 天`
  if (days === 0) return '就是今天'
  return `已过 ${-days} 天`
}

export function CountdownTab(): ReactElement {
  const { data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [busy, setBusy] = useState(false)
  const now = data?.now ?? Date.now()
  const countdowns = data?.countdowns ?? []

  const submit = async (): Promise<void> => {
    const t = title.trim()
    if (t === '' || targetDate === '' || busy) return
    setBusy(true)
    try {
      await todoStore.addCountdown({ title: t, targetDate })
      setTitle('')
      setTargetDate('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="life-tab">
      <div className="todo-form-row">
        <input
          className="todo-input"
          placeholder="目标名称，如：六级考试"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
        />
        <input
          className="todo-input"
          style={{ flex: 'none', minWidth: 150 }}
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
        <button
          type="button"
          className="todo-btn primary"
          disabled={busy || title.trim() === '' || targetDate === ''}
          onClick={() => void submit()}
        >
          添加
        </button>
      </div>

      <div className="todo-list">
        {countdowns.length === 0 ? (
          <div className="todo-empty">还没有倒计时。加一个目标日期，这里每天显示还剩几天。</div>
        ) : (
          countdowns.map((c) => {
            const d = daysLeft(c.targetDate, now)
            return (
              <div className="todo-item" key={c.id}>
                <div className="todo-item-main">
                  <div className="todo-item-title">{c.title}</div>
                  <div className="todo-item-meta">
                    <span className="todo-badge" data-style={d < 0 ? 'danger' : d <= 3 ? 'warning' : 'info'}>
                      {label(d)}
                    </span>
                    <span>{c.targetDate}</span>
                  </div>
                </div>
                <div className="todo-actions">
                  <button type="button" className="todo-btn danger" title="删除" onClick={() => void todoStore.removeCountdown(c.id)}>
                    删除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
