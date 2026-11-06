/**
 * 提醒层：body 上的全局 React 根，渲染**待办**提醒 toast 栈 + 完成确认弹窗 + 待办 Dock，
 * 并通过 SSE 实时订阅 host 状态变化；标签页在后台时把新提醒转成系统原生通知
 * （切出到别的窗口也能收到）。DSH 会话的完成/审批提醒不在这里 —— 那是
 * dsh-session-attention 的事。
 * @module dsh-life-planner/client/ReminderLayer
 */

import { useEffect, useSyncExternalStore, type ReactElement } from 'react'
import { todoStore } from './todo-store.ts'
import { STYLE_META } from './styles.ts'
import { TodoDock } from './TodoDock.tsx'
import { DEFAULT_TODO_SETTINGS, type ReminderEvent, type TodoState } from '../types.ts'

function formatTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ReminderToast({ reminder, snoozeMinutes }: { reminder: ReminderEvent; snoozeMinutes: number[] }): ReactElement {
  const meta = STYLE_META[reminder.style]
  return (
    <div className="todo-toast" data-style={reminder.style} key={reminder.id}>
      <div className="todo-toast-head">
        <span className="todo-toast-icon">{meta.icon}</span>
        <span className="todo-toast-title">{reminder.title}</span>
        <span className="todo-toast-sub">{formatTime(reminder.firedAt)}</span>
      </div>
      <div className="todo-toast-actions">
        <button
          type="button"
          className="todo-btn primary"
          onClick={() => {
            const todo = todoStore.getSnapshot().data?.todos.find((t) => t.id === reminder.todoId)
            if (todo !== undefined) void todoStore.completeTodo(todo, reminder.id)
            else void todoStore.dismissReminder(reminder.id)
          }}
        >
          完成
        </button>
        {snoozeMinutes.map((minutes) => (
          <button
            type="button"
            className="todo-btn"
            key={minutes}
            onClick={() => void todoStore.snooze(reminder, minutes)}
          >
            稍后{minutes}分钟
          </button>
        ))}
        <button type="button" className="todo-btn" onClick={() => void todoStore.dismissReminder(reminder.id)}>
          忽略
        </button>
      </div>
    </div>
  )
}

function ConfirmDialog(): ReactElement | null {
  const { confirming } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  if (confirming === null) return null
  return (
    <div className="todo-modal-backdrop">
      <div className="todo-modal">
        <h3 className="todo-modal-title">确认完成</h3>
        <p className="todo-modal-message">
          确定完成「{confirming.todo.title}」吗？
        </p>
        <div className="todo-modal-footer">
          <button type="button" className="todo-btn" onClick={() => todoStore.cancelConfirm()}>
            取消
          </button>
          <button type="button" className="todo-btn primary" onClick={() => void todoStore.confirmComplete()}>
            确认完成
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReminderLayer(): ReactElement {
  const { activeReminders, freshReminders, data } = useSyncExternalStore(todoStore.subscribe, todoStore.getSnapshot)
  const snoozeMinutes: number[] = data?.settings.snoozeMinutes ?? DEFAULT_TODO_SETTINGS.snoozeMinutes

  // SSE 实时订阅 + 回到前台时兜底轮询。
  useEffect(() => {
    const es = new EventSource('/api/life/events')
    es.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { type?: string; state?: TodoState }
        if (message.type === 'state' && message.state !== undefined) {
          todoStore.applyState(message.state)
        }
      } catch {
        // 解析失败忽略，等待下一条或轮询兜底。
      }
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void todoStore.refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      es.close()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // 首次请求系统通知权限（用户点「允许」后，切出也能收到通知）。
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { /* 拒绝静默 */ })
    }
  }, [])

  // 后台（切出）时，把新提醒转成系统原生通知（按样式决定是否响铃）。
  useEffect(() => {
    if (freshReminders.length === 0) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (document.visibilityState !== 'hidden') return
    for (const reminder of freshReminders) {
      try {
        new Notification(`⏰ ${reminder.title}`, {
          body: reminder.kind === 'advance' ? '提前提醒：明天到期' : '到点了',
          tag: `dsh-life-${reminder.id}`,
          silent: true,
        })
      } catch {
        // 个别环境不支持，忽略。
      }
    }
  }, [freshReminders])

  return (
    <>
      {activeReminders.length > 0 ? (
        <div className="todo-toast-stack">
          {activeReminders.map((reminder) => <ReminderToast key={reminder.id} reminder={reminder} snoozeMinutes={snoozeMinutes} />)}
        </div>
      ) : null}
      <ConfirmDialog />
      <TodoDock />
    </>
  )
}
