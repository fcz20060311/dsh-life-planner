/**
 * 专注页签：正向计时（不设时长）。开始 / 结束落一条记录，可关联某条待办。
 * @module dsh-life-planner/client/FocusTab
 */

import { useEffect, useState, useSyncExternalStore, type ReactElement } from 'react'
import { todoStore } from './todo-store.ts'
import type { FocusSession } from '../types.ts'

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function formatClock(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function FocusTab(): ReactElement {
  const { data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  const [now, setNow] = useState(() => Date.now())
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const beginEdit = (session: FocusSession): void => {
    setError('')
    setEditingId(session.id)
    setDraft(session.label ?? '')
  }

  const commitEdit = async (): Promise<void> => {
    if (editingId === null) return
    const id = editingId
    setEditingId(null)
    try {
      await todoStore.renameFocus(id, draft)
    } catch {
      setError('改名失败：这条接口要重启一次 DSH 才生效。')
    }
  }

  const remove = async (id: string): Promise<void> => {
    setError('')
    try {
      await todoStore.removeFocus(id)
    } catch {
      setError('删除失败：新加的删除接口还没生效，重启一次 DSH 就好。')
    }
  }

  const running = data?.focusRunning ?? null
  const sessions = data?.focusSessions ?? []

  useEffect(() => {
    if (running === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [running !== null])

  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0)
  const startedAt = running?.startedAt ?? null

  const start = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      const trimmed = label.trim()
      await todoStore.focusStart(trimmed === '' ? {} : { label: trimmed })
      setNow(Date.now())
    } finally {
      setBusy(false)
    }
  }

  const stop = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      await todoStore.focusStop()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="life-tab">
      <div className="life-focus-clock" data-running={startedAt !== null ? 'true' : undefined}>
        {startedAt !== null ? formatDuration(now - startedAt) : '00:00'}
      </div>

      {running?.label !== undefined ? <div className="life-focus-label">{running.label}</div> : null}

      <div className="todo-form-row">
        <input
          className="todo-input"
          value={label}
          maxLength={40}
          placeholder="这次专注做什么？（可留空）"
          disabled={startedAt !== null}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && startedAt === null) void start()
          }}
        />
        {startedAt !== null ? (
          <button type="button" className="todo-btn danger" onClick={() => void stop()}>结束专注</button>
        ) : (
          <button type="button" className="todo-btn primary" onClick={() => void start()}>开始专注</button>
        )}
      </div>

      <div className="life-stat-line">
        累计专注 <b>{formatDuration(totalMs)}</b> · 共 {sessions.length} 次
      </div>

      {error !== '' ? <div className="todo-error">{error}</div> : null}

      <div className="todo-list">
        {sessions.length === 0 ? (
          <div className="todo-empty">还没有专注记录。点「开始专注」，结束后这里会有记录。</div>
        ) : (
          sessions.slice(0, 30).map((s: FocusSession) => (
            <div className="todo-item" key={s.id}>
              <div className="todo-item-main">
                <div className="todo-item-title">{formatDuration(s.durationMs)}</div>
                <div className="todo-item-meta">
                  <span>{formatClock(s.startedAt)} – {formatClock(s.endedAt)}</span>
                  {editingId === s.id ? (
                    <input
                      className="todo-input life-focus-rename"
                      autoFocus
                      value={draft}
                      maxLength={40}
                      placeholder="这次专注做了什么？"
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => void commitEdit()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="life-focus-name"
                      title="点击改名"
                      onClick={() => beginEdit(s)}
                    >
                      {s.label ?? (s.taskId !== undefined ? '关联任务' : '未命名 · 点击命名')}
                    </button>
                  )}
                </div>
              </div>
              <div className="todo-actions">
                <button type="button" className="todo-btn danger" title="删除这条记录" onClick={() => void remove(s.id)}>
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
