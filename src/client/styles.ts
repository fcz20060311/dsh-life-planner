/**
 * 客户端样式：一段 CSS 字符串（apply 时注入 <style>），配色走 dsh 的
 * --dsw-alias-* token，自动适配明暗主题与皮肤。数据属性作用域隔离，不污染 shell。
 * @module dsh-life-planner/client/styles
 */

import type { ReminderStyle } from '../types.ts'

export const STYLE_META: Record<ReminderStyle, { label: string; icon: string }> = {
  info: { label: '提醒', icon: 'ℹ️' },
  success: { label: '纪念', icon: '✅' },
  warning: { label: '注意', icon: '⚠️' },
  danger: { label: '紧急', icon: '🚨' },
}

export const TODO_CSS = `
/* --- 面板接管中心列（作用域隔离） ---------------------------------------- */
/* --- 面板接管中心列（独立页面式，与任务看板 / SSH 一致） ------------------ */
/* DSH 0.1.6 移除了 data-pane 标记，中心列改用 CSS-module 类名（centerCol）；
   这里同时兼容旧标记与新类名，否则容器定位会失效。 */
/* 只给自己挂载的宿主定位：全局匹配 centerCol 会连带影响其他插件的容器。 */
[data-dsh-todo-host] { position: relative; }

[data-dsh-todo-view] {
  position: absolute;
  inset: 0;
  display: none;
  z-index: 60;
  overflow: auto;
  background: var(--dsw-alias-bg-base);
}
html[data-dsh-todo-active] [data-dsh-todo-view] { display: block; }
html[data-dsh-todo-active] [data-dsh-todo-host] > :not([data-dsh-todo-view]) {
  display: none !important;
}
/* --- 侧边栏入口 ---------------------------------------------------------- */
[data-dsh-todo-entry] {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* 明确左对齐：外壳若覆盖了 flex，也不会变成居中按钮 */
  text-align: left;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  font-family: var(--dsw-font-family);
}
[data-dsh-todo-entry]:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover);
  color: var(--dsw-alias-label-primary);
}
/* 选中态只做「更亮 + 加粗」，不画背景块：面板状态万一过期，也不会在侧边栏留下一块灰底。 */
[data-dsh-todo-entry][data-active] {
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
[data-dsh-todo-entry] .todo-entry-icon { display: inline-flex; align-items: center; justify-content: center; flex: none; }
[data-dsh-todo-entry] .todo-entry-label { overflow: hidden; text-overflow: ellipsis; }
/* 侧边栏收起态：0.1.6 把折叠标记从 [data-dsh-frame] 挪到了 [data-sidebar-collapsed]，
   两种祖先都匹配，避免收起后入口标签溢出。 */
[data-dsh-frame][data-sidebar-collapsed] [data-dsh-todo-entry],
[data-sidebar-collapsed] [data-dsh-todo-entry] { justify-content: center; padding: 0; }
[data-dsh-frame][data-sidebar-collapsed] [data-dsh-todo-entry] .todo-entry-label,
[data-sidebar-collapsed] [data-dsh-todo-entry] .todo-entry-label { display: none; }

/* --- 官方 main 座位里的页面外层（外壳只在选中本面板时挂载它） ----------- */
.todo-panel-page { display: flex; flex-direction: column; height: 100%; max-height: 100%; min-height: 0; overflow: hidden; box-sizing: border-box; padding-top: 30px; }
.todo-panel-page > .todo-panel { flex: 1 1 auto; min-height: 0; }

/* --- 面板主体 ------------------------------------------------------------ */
.todo-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 14px 16px 16px;
  gap: 12px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
}
.todo-topbar { display: flex; align-items: center; gap: 8px; flex: none; flex-wrap: nowrap; min-height: 26px; }
.todo-topbar .todo-count { margin-left: auto; }
.todo-back { flex: none; padding: 4px 10px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); background: transparent; border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; cursor: pointer; font-family: inherit; transition: color .15s, border-color .15s; }
.todo-back:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.todo-close { flex: none; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; padding: 0; font-size: 13px; color: var(--dsw-alias-label-tertiary); background: transparent; border: 1px solid transparent; border-radius: 7px; cursor: pointer; font-family: inherit; transition: color .15s, background .15s; }
.todo-close:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.todo-header { display: flex; align-items: center; gap: 10px; flex: none; }
.todo-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--dsw-alias-label-primary); white-space: nowrap; }
.todo-count { flex: none; font-size: 12px; color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-interactive-bg-hover); border-radius: 999px; padding: 1px 8px; }

.todo-form { display: flex; flex-direction: column; gap: 8px; flex: none; }
.todo-form-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.todo-input { flex: 1; min-width: 160px; padding: 8px 11px; font-size: 14px; color: var(--dsw-alias-label-primary); background: var(--dsw-specific-input-major); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; outline: none; font-family: inherit; }
.todo-input:focus { border-color: var(--dsw-alias-state-business-primary); }
.todo-input::placeholder { color: var(--dsw-alias-label-tertiary); }
.todo-select { padding: 7px 8px; font-size: 12.5px; color: var(--dsw-alias-label-primary); background: var(--dsw-specific-input-major); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; outline: none; }
.todo-select:focus { border-color: var(--dsw-alias-state-business-primary); }
.todo-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--dsw-alias-label-primary); cursor: pointer; user-select: none; }
.todo-check input { accent-color: var(--dsw-alias-state-business-primary); margin: 0; }

/* --- 设置行（响铃 / 稍后提醒分钟数） ------------------------------------ */
.todo-settings { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: none; padding: 8px 10px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; }
.todo-settings-label { font-size: 12px; font-weight: 700; color: var(--dsw-alias-label-tertiary); }
.todo-settings-hint { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.todo-error { font-size: 12px; color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent); border-radius: 8px; padding: 6px 10px; }

.todo-list { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; overflow-y: auto; }
.todo-section-title { margin: 4px 0 0; font-size: 11px; font-weight: 700; color: var(--dsw-alias-label-tertiary); text-transform: none; letter-spacing: .02em; }
.todo-empty { padding: 24px 8px; text-align: center; font-size: 13px; color: var(--dsw-alias-label-tertiary); }

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
}
.todo-item:hover { border-color: var(--dsw-alias-border-l3); }
.todo-item[data-done] { opacity: .6; }
.todo-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.todo-item-title { font-size: 14.5px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.todo-item[data-done] .todo-item-title { text-decoration: line-through; }
.todo-item-note { font-size: 13px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; white-space: pre-wrap; }
.todo-item-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.todo-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; border: 1px solid var(--todo-accent, var(--dsw-alias-border-l2)); color: var(--todo-accent, var(--dsw-alias-label-secondary)); background: transparent; }
.todo-badge[data-style='info'] { --todo-accent: var(--dsw-alias-state-business-primary); }
.todo-badge[data-style='success'] { --todo-accent: var(--dsw-alias-state-success-primary); }
.todo-badge[data-style='warning'] { --todo-accent: var(--dsw-alias-state-warn-primary); }
.todo-badge[data-style='danger'] { --todo-accent: var(--dsw-alias-state-error-primary); }

.todo-actions { display: flex; align-items: center; gap: 4px; flex: none; }
.todo-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 26px; padding: 0 10px;
  background: transparent; border: none; border-radius: 6px;
  color: var(--dsw-alias-label-secondary); cursor: pointer; font-size: 12px; white-space: nowrap;
}
.todo-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.todo-btn.primary { color: #fff; background: var(--dsw-alias-button-info-fill); padding: 0 12px; font-weight: 600; }
.todo-btn.primary:hover { background: var(--dsw-alias-button-info-hover); }
.todo-btn.danger:hover { color: var(--dsw-alias-state-error-primary); background: var(--dsw-alias-state-error-secondary); }
.todo-btn[disabled] { opacity: .5; cursor: default; }

/* --- 提醒 toast ---------------------------------------------------------- */
.todo-toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1400;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}
.todo-toast {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--todo-accent, var(--dsw-alias-border-l2));
  border-left-width: 4px;
  border-radius: 10px;
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  animation: todo-toast-in 220ms ease;
}
.todo-toast[data-style='info'] { --todo-accent: var(--dsw-alias-state-business-primary); }
.todo-toast[data-style='success'] { --todo-accent: var(--dsw-alias-state-success-primary); }
.todo-toast[data-style='warning'] { --todo-accent: var(--dsw-alias-state-warn-primary); }
.todo-toast[data-style='danger'] { --todo-accent: var(--dsw-alias-state-error-primary); animation: todo-toast-in 220ms ease, todo-toast-pulse 1.6s ease-in-out infinite; }
.todo-toast-head { display: flex; align-items: center; gap: 8px; }
.todo-toast-icon { font-size: 16px; line-height: 1; }
.todo-toast-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 700; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.todo-toast-sub { font-size: 11px; color: var(--todo-accent, var(--dsw-alias-label-tertiary)); }
.todo-toast-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
@keyframes todo-toast-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
@keyframes todo-toast-pulse { 0%,100% { box-shadow: var(--dsw-shadow-lv3); } 50% { box-shadow: 0 0 0 3px var(--todo-accent, transparent); } }

/* --- 确认弹窗 ------------------------------------------------------------ */
.todo-modal-backdrop {
  position: fixed; inset: 0; z-index: 1500;
  display: flex; align-items: center; justify-content: center;
  background: var(--dsw-alias-bg-mask-1);
}
.todo-modal {
  display: flex; flex-direction: column; gap: 12px;
  width: min(440px, calc(100vw - 48px));
  padding: 18px;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
}
.todo-modal-title { margin: 0; font-size: 15px; font-weight: 700; }
.todo-modal-message { margin: 0; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.todo-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

/* --- DSH 会话活动悬浮球（独立模块，不含待办内容） ------------------------ */
.todo-ball {
  position: fixed;
  z-index: 1340;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: var(--dsw-shadow-lv2);
  cursor: grab;
  user-select: none;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  touch-action: none;
  --ball-accent: var(--dsw-alias-label-tertiary);
}
.todo-ball:active { cursor: grabbing; }
.todo-ball-icon { font-size: 18px; line-height: 1; pointer-events: none; }
.todo-ball-badge {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 16px; height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--dsw-alias-state-business-primary);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 700;
  pointer-events: none;
}
.todo-ball[data-phase='thinking'] { --ball-accent: var(--dsw-alias-state-business-primary); }
.todo-ball[data-phase='tool'] { --ball-accent: var(--dsw-alias-state-warn-primary); }
.todo-ball[data-phase='done'] { --ball-accent: var(--dsw-alias-state-success-primary); }
.todo-ball[data-active] {
  border-color: var(--ball-accent);
  animation: todo-ball-glow 1.6s ease-in-out infinite;
}
@keyframes todo-ball-glow {
  0%, 100% { box-shadow: var(--dsw-shadow-lv2); }
  50% { box-shadow: 0 0 0 4px var(--ball-accent); }
}
.todo-ball-panel {
  position: fixed;
  z-index: 1340;
  width: 300px;
  max-height: 380px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  overflow-y: auto;
  /* 这是个控件面板而非文档：默认箭头指针，避免鼠标移到文字上变成输入光标。 */
  cursor: default;
  user-select: none;
}
.todo-ball-panel-head { display: flex; align-items: center; gap: 8px; }
.todo-ball-panel-title { margin: 0; font-size: 14px; font-weight: 700; flex: 1; }
.todo-ball-row { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.todo-ball-row:last-child { border-bottom: none; }
.todo-ball-row-icon { flex: none; font-size: 13px; }
.todo-ball-row-title { flex: 1; min-width: 0; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-ball-row-state { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-ball-row[data-navigable] {
  margin: 0 -6px;
  padding: 6px;
  border-radius: 7px;
  cursor: pointer;
}
.todo-ball-row[data-navigable]:hover { background: var(--dsw-alias-fill-secondary); }
.todo-ball-row[data-navigable]:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.todo-ball-row-go { flex: none; font-size: 14px; color: var(--dsw-alias-label-tertiary); }
.todo-ball-empty { padding: 16px 4px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.todo-ball-actions { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 4px; }
.todo-ball-mini { flex: none; padding: 2px 8px; font-size: 11px; }

/* --- 个人待办 Dock（右侧边缘吸附，可收起） ------------------------------- */
.todo-dock {
  position: fixed;
  right: 0;
  /* 硬上限：任何情况下都不许长标题把 Dock 撑开（收起/展开两态共用）。 */
  max-width: min(340px, 82vw);
  z-index: 1350;
  display: flex;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  border-right: none;
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  touch-action: none;
}
/* 收起态：贴边药丸，直接显示下一件要做的事。 */
.todo-dock[data-collapsed='true'] {
  flex-direction: row;
  align-items: center;
  gap: 7px;
  max-width: 220px;
  padding: 7px 10px 7px 13px;
  border-radius: 999px 0 0 999px;
  box-shadow: var(--dsw-shadow-lv2);
  cursor: pointer;
  user-select: none;
}
.todo-dock[data-collapsed='true']:hover { background: var(--dsw-alias-fill-secondary); }
/* 悬停 / 快到点时探出：显示标题（宽度另有内联 style 兜底）。 */
.todo-dock[data-collapsed='true'][data-peek='true'] { max-width: 344px; }
/* 展开态：右侧待办面板。 */
.todo-dock[data-collapsed='false'] {
  flex-direction: column;
  gap: 8px;
  width: 320px;
  padding: 12px;
  border-radius: 12px 0 0 12px;
  /* 同上：控件面板用箭头指针，文字不做选中。 */
  cursor: default;
  user-select: none;
}
/* 表单控件恢复自身的输入光标与可选中，不受面板的 user-select: none 影响。 */
.todo-dock input, .todo-dock select, .todo-dock textarea { cursor: auto; user-select: auto; }
.todo-dock[data-overdue='true'] { border-color: var(--dsw-alias-state-error-primary); }
.todo-dock[data-collapsed='true'][data-overdue='true'] { animation: todo-dock-pulse 1.8s ease-in-out infinite; }
@keyframes todo-dock-pulse {
  0%, 100% { box-shadow: var(--dsw-shadow-lv2); }
  50% { box-shadow: 0 0 0 4px var(--dsw-alias-state-error-primary); }
}

.todo-dock-icon { flex: none; font-size: 14px; line-height: 1; }
.todo-dock-time { flex: none; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
.todo-dock-time[data-overdue='true'] { color: var(--dsw-alias-state-error-primary); }
.todo-dock-next { flex: 1; min-width: 0; max-width: 150px; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-dock-idle { flex: none; font-size: 12px; color: var(--dsw-alias-label-tertiary); }

.todo-dock-head { display: flex; align-items: center; gap: 8px; cursor: grab; user-select: none; }
.todo-dock-head:active { cursor: grabbing; }
.todo-dock-title { margin: 0; flex: 1; font-size: 14px; font-weight: 700; }
.todo-dock-add { display: flex; gap: 6px; }
.todo-dock-add .todo-input { flex: 1; min-width: 0; }
.todo-dock-when { flex: none; width: 96px; }
.todo-dock-body { display: flex; flex-direction: column; overflow-y: auto; max-height: 46vh; }
.todo-dock-section { padding: 6px 2px 2px; font-size: 11px; font-weight: 700; letter-spacing: .02em; color: var(--dsw-alias-label-tertiary); }
.todo-dock-row { display: flex; align-items: center; gap: 7px; padding: 6px 2px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.todo-dock-row:last-child { border-bottom: none; }
.todo-dock-check {
  flex: none;
  width: 17px; height: 17px;
  padding: 0;
  border: 1.5px solid var(--dsw-alias-border-l3);
  border-radius: 50%;
  background: transparent;
  color: transparent;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}
.todo-dock-check:hover { border-color: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-state-success-primary); }
.todo-dock-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.todo-dock-row-title { font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-dock-row-due { font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.todo-dock-row[data-overdue='true'] .todo-dock-row-due { color: var(--dsw-alias-state-error-primary); font-weight: 700; }
.todo-dock-row-actions { flex: none; display: flex; gap: 4px; opacity: 0; transition: opacity .12s ease; }
.todo-dock-row:hover .todo-dock-row-actions, .todo-dock-row:focus-within .todo-dock-row-actions { opacity: 1; }
.todo-dock-mini { flex: none; padding: 2px 7px; font-size: 11px; }
.todo-dock-empty { padding: 14px 4px; text-align: center; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
.todo-dock-foot { display: flex; gap: 6px; flex-wrap: wrap; }
.todo-settings-group {
  padding: 10px 2px 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--dsw-alias-label-secondary);
}
.todo-range { flex: none; width: 96px; accent-color: var(--dsw-alias-state-business-primary); cursor: pointer; }

/* --- 面板页签 ------------------------------------------------------------ */
.todo-tabs { display: flex; gap: 4px; flex: none; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.todo-tab {
  flex: none;
  padding: 7px 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  margin-bottom: -1px;
}
.todo-tab:hover { color: var(--dsw-alias-label-primary); }
.todo-tab[data-active='true'] { color: var(--dsw-alias-label-primary); font-weight: 600; border-bottom-color: var(--dsw-alias-state-business-primary); }

/* --- 各页签通用 ---------------------------------------------------------- */
.life-tab { display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; overflow-y: auto; }

/* --- 单页多栏布局（待办/倒计时/日历/专注/统计同屏） ---------------------- */
.life-board {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.9fr) minmax(0, 1fr);
  grid-template-rows: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    "tasks cal countdown"
    "tasks cal focus"
    "tasks cal stats";
  gap: 12px;
  overflow: hidden;
}
.life-cell-tasks { grid-area: tasks; }
.life-cell-cal { grid-area: cal; }
.life-cell-countdown { grid-area: countdown; }
.life-cell-focus { grid-area: focus; }
.life-cell-stats { grid-area: stats; }
.life-cell {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 12px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  overflow: hidden;
}
.life-cell-head {
  flex: none;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  color: var(--dsw-alias-label-tertiary);
}
.life-cell .todo-empty { padding: 12px 6px; }
.life-cell .life-focus-clock { font-size: 46px; padding: 8px 0; }
.life-cell .life-heat { flex-wrap: nowrap; }
@media (max-width: 1180px) {
  .life-board {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
    grid-template-areas: none;
    grid-auto-rows: minmax(280px, auto);
    overflow-y: auto;
  }
  .life-cell { grid-area: auto; }
}

/* --- 日历 ---------------------------------------------------------------- */
.life-cal-head { display: flex; align-items: center; gap: 8px; flex: none; }
.life-cal-title { flex: 1; font-size: 15px; font-weight: 700; }
.life-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; flex: none; }
.life-cal-weekday { text-align: center; font-size: 11px; color: var(--dsw-alias-label-tertiary); padding: 4px 0; }
.life-cal-cell { min-height: 96px; padding: 5px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; overflow: hidden; }
.life-cal-cell-empty { background: transparent; border-color: transparent; }
.life-cal-cell[data-today] { border-color: var(--dsw-alias-state-business-primary); }
.life-cal-day { font-size: 12.5px; color: var(--dsw-alias-label-tertiary); margin-bottom: 3px; }
.life-cal-items { display: flex; flex-direction: column; gap: 2px; }
.life-cal-item { font-size: 11.5px; line-height: 1.35; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.life-cal-item[data-danger] { color: var(--dsw-alias-state-error-primary); font-weight: 600; }
.life-cal-more { font-size: 11px; color: var(--dsw-alias-label-tertiary); }

/* --- 专注 ---------------------------------------------------------------- */
.life-focus-clock { text-align: center; font-size: 48px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: .02em; padding: 18px 0; }
.life-focus-clock[data-running] { color: var(--dsw-alias-state-business-primary); }
.life-focus-label { text-align: center; margin-top: -10px; margin-bottom: 8px; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.life-focus-name { background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 2px; opacity: .85; }
.life-focus-name:hover { opacity: 1; color: var(--dsw-alias-state-business-primary); }
.life-focus-rename { max-width: 170px; font-size: 11px; padding: 2px 6px; }

/* --- 统计 ---------------------------------------------------------------- */
.life-stat-line { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.life-stat-cards { display: flex; gap: 10px; flex: none; }
.life-stat-card { flex: 1; padding: 12px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; }
.life-stat-value { font-size: 18px; font-weight: 700; }
.life-stat-label { font-size: 11px; color: var(--dsw-alias-label-tertiary); margin-top: 2px; }
.life-heat-title { font-size: 12px; color: var(--dsw-alias-label-secondary); flex: none; }
.life-heat { display: flex; gap: 3px; flex: none; overflow-x: auto; }
.life-heat-col { display: flex; flex-direction: column; gap: 3px; }
.life-heat-cell { width: 11px; height: 11px; border-radius: 2px; background: var(--dsw-alias-interactive-bg-hover); flex: none; }
.life-heat-cell[data-level='1'] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 30%, transparent); }
.life-heat-cell[data-level='2'] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent); }
.life-heat-cell[data-level='3'] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 75%, transparent); }
.life-heat-cell[data-level='4'] { background: var(--dsw-alias-state-business-primary); }
.life-heat-legend { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--dsw-alias-label-tertiary); flex: none; }

/* --- 用时扇形图（日/周/月） --------------------------------------------- */
.life-pie-head { display: flex; align-items: center; gap: 8px; }
.life-pie-title { flex: 1; font-size: 12.5px; font-weight: 700; color: var(--dsw-alias-label-secondary); }
.life-pie-switch { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--dsw-alias-interactive-bg-hover); }
.life-pie-tab { padding: 2px 9px; font-size: 11.5px; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; font-family: inherit; }
.life-pie-tab[data-active] { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, .16); }
.life-pie { display: flex; align-items: center; gap: 14px; }
.life-pie-svg { width: 118px; height: 118px; flex: none; }
.life-pie-center { font-size: 15px; font-weight: 700; fill: var(--dsw-alias-label-primary); }
.life-pie-center-label { font-size: 8px; fill: var(--dsw-alias-label-tertiary); letter-spacing: .16em; }
.life-pie-legend { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; max-height: 118px; overflow-y: auto; }
.life-pie-row { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
.life-pie-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.life-pie-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); }
.life-pie-val { flex: none; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }
.life-pie-time { flex: none; width: 44px; text-align: right; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }

/* --- 便签墙（Sticky wall）风格 ------------------------------------------- */
.life-board {
  padding: 10px;
  border-radius: 14px;
  background:
    radial-gradient(circle, color-mix(in srgb, var(--dsw-alias-border-l2) 55%, transparent) 1px, transparent 1.2px) 0 0 / 16px 16px,
    var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  box-shadow: inset 0 2px 22px rgba(0, 0, 0, .28);
}
.life-cell {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 40%, transparent);
  border: 1px dashed color-mix(in srgb, var(--dsw-alias-border-l2) 70%, transparent);
  border-radius: 12px;
}
.life-cell-head { display: flex; align-items: center; gap: 6px; font-size: 12.5px; letter-spacing: .1em; }
.life-cell-head::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);
}

/* 便签本体：纸感、胶带、轻微歪斜 */
.todo-item {
  position: relative;
  padding: 15px 12px 10px;
  border: none;
  border-radius: 3px 9px 4px 10px;
  background: var(--note-bg, #f6e2a1);
  color: #332f28;
  transform: rotate(var(--note-rot, 0deg));
  box-shadow: 0 2px 4px rgba(0, 0, 0, .35), 0 10px 22px -14px rgba(0, 0, 0, .6);
  transition: transform .18s ease, box-shadow .18s ease;
}
.todo-item::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  width: 52px;
  height: 13px;
  transform: translateX(-50%) rotate(-2.5deg);
  background: rgba(255, 255, 255, .22);
  border: 1px solid rgba(255, 255, 255, .16);
}
.todo-item:hover {
  transform: rotate(0deg) translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, .4), 0 16px 30px -16px rgba(0, 0, 0, .7);
  z-index: 2;
}
.todo-item .todo-item-title { color: #332f28; }
.todo-item .todo-item-note { color: rgba(51, 47, 40, .74); }
.todo-item .todo-item-meta { color: rgba(51, 47, 40, .58); }
.todo-item .todo-badge { border-color: rgba(0, 0, 0, .18); color: rgba(51, 47, 40, .88); background: rgba(255, 255, 255, .35); }
.todo-item .todo-btn { color: rgba(51, 47, 40, .82); background: rgba(255, 255, 255, .3); border-color: rgba(0, 0, 0, .14); }
.todo-item .todo-btn.primary { background: rgba(0, 0, 0, .08); }
.todo-item .todo-btn.danger { color: #8d2f2f; }

/* 便签配色轮转（颜色 + 歪斜角度） */
.todo-list > .todo-item:nth-child(6n+1) { --note-bg: #f6e2a1; --note-rot: -1.2deg; }
.todo-list > .todo-item:nth-child(6n+2) { --note-bg: #bfe0cb; --note-rot: 0.9deg; }
.todo-list > .todo-item:nth-child(6n+3) { --note-bg: #c3dbee; --note-rot: -0.6deg; }
.todo-list > .todo-item:nth-child(6n+4) { --note-bg: #e0d0f0; --note-rot: 1.4deg; }
.todo-list > .todo-item:nth-child(6n+5) { --note-bg: #f6cfbb; --note-rot: -1.4deg; }
.todo-list > .todo-item:nth-child(6n+6) { --note-bg: #f2c3d2; --note-rot: 0.7deg; }
.todo-list { padding: 6px 2px 8px; }

/* 表单 = 一张待写的空白便签 */
.todo-form {
  padding: 10px;
  background: var(--dsw-alias-bg-layer-2);
  border: 1.5px dashed var(--dsw-alias-border-l2);
  border-radius: 10px;
}
.todo-form .todo-input { background: var(--dsw-alias-bg-base); }

/* 日历格子 / 统计卡片也带点纸片感 */
.life-cal-cell { background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 82%, transparent); border-radius: 6px; }
.life-stat-card { border: none; background: var(--dsw-alias-bg-layer-2); border-radius: 4px 10px 5px 9px; box-shadow: 0 6px 14px -10px rgba(0, 0, 0, .6); }

@media (prefers-reduced-motion: reduce) {
  .todo-toast { animation: none; }
  .todo-toast[data-style='danger'] { animation: none; }
  .todo-dock[data-collapsed='true'][data-overdue='true'] { animation: none; }
  .todo-ball[data-active] { animation: none; }
}
`

/** 注入样式（幂等）。 */
export function injectStyles(): void {
  // 旧节点必须换掉：早期写成「已存在就 return」，升级后新 CSS 永远注入不进去，
  // 入口便退回浏览器默认 button 样式（侧边栏灰底方块就是这个原因）。
  document.querySelectorAll('style[data-dsh-todo-css]').forEach((el) => el.remove())
  const style = document.createElement('style')
  style.dataset.dshTodoCss = ''
  style.textContent = TODO_CSS
  document.head.appendChild(style)
}
