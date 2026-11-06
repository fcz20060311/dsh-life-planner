/**
 * 生活面板：单页多栏布局（待办 / 倒计时 / 日历 / 专注 / 统计 同屏）。
 * 待办区只保留核心：标题、备注、到期时间、完成、删除。
 * @module dsh-life-planner/client/TodoPanel
 */

import { useEffect, useSyncExternalStore, useState, type ReactElement } from 'react'
import { todoStore } from './todo-store.ts'
import { type TodoItem } from '../types.ts'
import { CountdownTab } from './CountdownTab.tsx'
import { CalendarTab } from './CalendarTab.tsx'
import { FocusTab } from './FocusTab.tsx'
import { StatsTab } from './StatsTab.tsx'

/** 把 datetime-local 字符串转 epoch ms（无效返回 undefined）。 */
function toEpoch(value: string): number | undefined {
  if (value === '') return undefined
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

function formatDue(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 待办区：极简表单 + 列表。 */
function TodoSection(): ReactElement {
  const { data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [notifPermission, setNotifPermission] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    setNotifPermission(Notification.permission)
  }, [])

  const requestNotification = async (): Promise<void> => {
    if (typeof Notification === 'undefined') return
    try {
      setNotifPermission(await Notification.requestPermission())
    } catch {
      setNotifPermission(Notification.permission)
    }
  }

  const todos = data?.todos ?? []
  const pending = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  const submit = async (): Promise<void> => {
    const trimmed = title.trim()
    if (trimmed === '' || busy) return
    setBusy(true)
    try {
      await todoStore.addTodo({ title: trimmed, note: note.trim(), dueAt: toEpoch(dueAt) })
      setTitle('')
      setNote('')
      setDueAt('')
    } finally {
      setBusy(false)
    }
  }

  const renderItem = (todo: TodoItem): ReactElement => (
    <div key={todo.id} className="todo-item" data-done={todo.done ? 'true' : undefined}>
      <div className="todo-item-main">
        <div className="todo-item-title">{todo.title}</div>
        {todo.note !== '' ? <div className="todo-item-note">{todo.note}</div> : null}
        {todo.dueAt !== undefined ? (
          <div className="todo-item-meta">
            <span className="todo-badge">{formatDue(todo.dueAt)}</span>
            {todo.advanceAt !== undefined ? <span>提前一天提醒</span> : null}
          </div>
        ) : null}
      </div>
      <div className="todo-actions">
        {!todo.done ? (
          <button type="button" className="todo-btn primary" onClick={() => void todoStore.completeTodo(todo)}>
            完成
          </button>
        ) : null}
        <button type="button" className="todo-btn danger" onClick={() => void todoStore.removeTodo(todo.id)}>
          删除
        </button>
      </div>
    </div>
  )

  return (
    <div className="life-tab">
      {notifPermission !== 'granted' ? (
        <div className="todo-settings">
          <span className="todo-settings-hint">开启系统通知后，切出窗口也能收到 Windows 通知。</span>
          <button type="button" className="todo-btn" onClick={() => void requestNotification()}>
            {notifPermission === 'denied' ? '系统通知已阻止' : '开启系统通知'}
          </button>
        </div>
      ) : null}

      <div className="todo-form">
        <div className="todo-form-row">
          <input
            className="todo-input"
            placeholder="要提醒自己什么？"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
          />
          <button type="button" className="todo-btn primary" disabled={busy || title.trim() === ''} onClick={() => void submit()}>
            添加
          </button>
        </div>
        <div className="todo-form-row">
          <input
            className="todo-input"
            placeholder="备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <input
            className="todo-input"
            type="datetime-local"
            title="到期时间（可选，到点会提醒）"
            value={dueAt}
            style={{ flex: '0 1 auto', minWidth: 0 }}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
      </div>

      <div className="todo-list">
        {pending.length === 0 && done.length === 0 ? (
          <div className="todo-empty">还没有待办。加一条，设个时间，到期会提醒你。</div>
        ) : null}
        {pending.length > 0 ? <div className="todo-section-title">待办</div> : null}
        {pending.map(renderItem)}
        {done.length > 0 ? <div className="todo-section-title">已完成</div> : null}
        {done.map(renderItem)}
      </div>
    </div>
  )
}

export function TodoPanel(props: { onClose?: () => void }): ReactElement {
  const onClose = props.onClose
  const { data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)

  const pending = (data?.todos ?? []).filter((t) => !t.done).length
  const countdowns = (data?.countdowns ?? []).length

  // Esc 随时返回对话，避免面板「关不掉」。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="todo-panel">
      <div className="todo-topbar">
        <button type="button" className="todo-back" onClick={() => onClose?.()} title="返回对话（Esc）">
          ← 返回
        </button>
        <span className="todo-count">{pending} 待办{countdowns > 0 ? ` · ${countdowns} 倒计时` : ''}</span>
        <button
          type="button"
          className="todo-close"
          title="关闭面板（Esc 也可以）"
          aria-label="关闭"
          onClick={() => { onClose?.() }}
        >
          ✕
        </button>
      </div>

      <div className="life-board">
        <section className="life-cell life-cell-tasks">
          <div className="life-cell-head">待办</div>
          <TodoSection />
        </section>
        <section className="life-cell life-cell-cal">
          <div className="life-cell-head">日历</div>
          <CalendarTab />
        </section>
        <section className="life-cell life-cell-countdown">
          <div className="life-cell-head">倒计时</div>
          <CountdownTab />
        </section>
        <section className="life-cell life-cell-focus">
          <div className="life-cell-head">专注</div>
          <FocusTab />
        </section>
        <section className="life-cell life-cell-stats">
          <div className="life-cell-head">统计</div>
          <StatsTab />
        </section>
      </div>
    </div>
  )
}
