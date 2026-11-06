window.__ModuleLoader__.load({
	id: "dsh-life-planner",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// src/client/api.ts
		async function todoFetch(path, body) {
			const response = await fetch(path, body === void 0 ? {} : {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
			if (!response.ok) throw new Error(`todo ${path} failed: ${response.status}`);
			return await response.json();
		}
		const todoApi = {
			/** 在文件管理器里打开数据目录（自定义音效放这里）。 */
			openDir: () => todoFetch("/api/life/open-dir", {}),
			state: () => todoFetch("/api/life/state"),
			add: (input) => todoFetch("/api/life/add", input),
			update: (id, patch) => todoFetch("/api/life/update", {
				id,
				patch
			}),
			remove: (id) => todoFetch("/api/life/delete", { id }),
			complete: (id) => todoFetch("/api/life/complete", { id }),
			snooze: (id, minutes) => todoFetch("/api/life/snooze", {
				id,
				minutes
			}),
			dismissReminder: (reminderId) => todoFetch("/api/life/dismiss-reminder", { reminderId }),
			setSettings: (settings) => todoFetch("/api/life/set-settings", { settings }),
			addCountdown: (input) => todoFetch("/api/life/countdown/add", input),
			removeCountdown: (id) => todoFetch("/api/life/countdown/delete", { id }),
			focusStart: (taskId) => todoFetch("/api/life/focus/start", taskId === void 0 ? {} : { taskId }),
			focusStop: () => todoFetch("/api/life/focus/stop", {}),
			heatmap: () => todoFetch("/api/life/heatmap")
		};
		// src/client/todo-store.ts
		/**
		* 浏览器端 store：单一实例，持有 host 状态快照 + 面板开合 + 待确认完成 +
		* 当前展示的提醒 + 新提醒（供系统通知消费）。React 组件经 useSyncExternalStore 订阅。
		* @module dsh-life-planner/client/todo-store
		*/
		var TodoStore = class {
			state = {
				data: null,
				error: null,
				activeReminders: [],
				freshReminders: [],
				confirming: null,
				panelOpen: false
			};
			listeners = /* @__PURE__ */ new Set();
			/** 已发过系统通知的提醒 id，避免重复弹。 */
			notifiedReminderIds = /* @__PURE__ */ new Set();
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			getSnapshot = () => this.state;
			set(patch) {
				this.state = {
					...this.state,
					...patch
				};
				for (const listener of this.listeners) listener();
			}
			/** 用一份 host 状态更新 store，并计算本轮新出现的提醒。 */
			applyState(data) {
				const fresh = data.reminders.filter((r) => !this.notifiedReminderIds.has(r.id));
				for (const r of fresh) this.notifiedReminderIds.add(r.id);
				this.set({
					data,
					error: null,
					activeReminders: data.reminders,
					freshReminders: fresh
				});
			}
			/** 拉取 host 状态（轮询兜底 / 标签页回到前台时调用）。 */
			async refresh() {
				try {
					this.applyState(await todoApi.state());
				} catch (error) {
					this.set({ error: error instanceof Error ? error.message : String(error) });
				}
			}
			/** 在文件管理器里打开数据目录（音效文件放这里）。失败静默 —— 打不开文件夹不该报错打扰。 */
			async openSoundDir() {
				try {
					await todoApi.openDir();
				} catch {}
			}
			togglePanel() {
				this.set({ panelOpen: !this.state.panelOpen });
			}
			setPanel(open) {
				if (this.state.panelOpen !== open) this.set({ panelOpen: open });
			}
			async addTodo(input) {
				await todoApi.add(input);
				await this.refresh();
			}
			async updateTodo(id, patch) {
				await todoApi.update(id, patch);
				await this.refresh();
			}
			async removeTodo(id) {
				await todoApi.remove(id);
				await this.refresh();
			}
			async setSoundByStyle(style, enabled) {
				await todoApi.setSettings({ soundByStyle: { [style]: enabled } });
				await this.refresh();
			}
			async setSnoozeMinutes(minutes) {
				await todoApi.setSettings({ snoozeMinutes: minutes });
				await this.refresh();
			}
			async setSound(patch) {
				await todoApi.setSettings({ sound: patch });
				await this.refresh();
			}
			async setDock(patch) {
				await todoApi.setSettings({ dock: patch });
				await this.refresh();
			}
			async addCountdown(input) {
				await todoApi.addCountdown(input);
				await this.refresh();
			}
			async removeCountdown(id) {
				await todoApi.removeCountdown(id);
				await this.refresh();
			}
			async focusStart(taskId) {
				await todoApi.focusStart(taskId);
				await this.refresh();
			}
			async focusStop() {
				await todoApi.focusStop();
				await this.refresh();
			}
			/** 完成待办；若开启「完成需确认」则先弹确认框。 */
			async completeTodo(todo, reminderId) {
				if (todo.confirmOnComplete) {
					this.set({ confirming: {
						todo,
						reminderId
					} });
					return;
				}
				await todoApi.complete(todo.id);
				await this.refresh();
			}
			async confirmComplete() {
				const request = this.state.confirming;
				if (request === null) return;
				this.set({ confirming: null });
				await todoApi.complete(request.todo.id);
				if (request.reminderId !== void 0) await todoApi.dismissReminder(request.reminderId);
				await this.refresh();
			}
			cancelConfirm() {
				this.set({ confirming: null });
			}
			async snooze(reminder, minutes) {
				await todoApi.snooze(reminder.todoId, minutes);
				await this.refresh();
			}
			async dismissReminder(reminderId) {
				await todoApi.dismissReminder(reminderId);
				await this.refresh();
			}
		};
		/** 应用级单例（面板 / 提醒 / 确认框共用）。 */
		const todoStore = new TodoStore();
		// src/client/styles.ts
		const STYLE_META = {
			info: {
				label: "提醒",
				icon: "ℹ️"
			},
			success: {
				label: "纪念",
				icon: "✅"
			},
			warning: {
				label: "注意",
				icon: "⚠️"
			},
			danger: {
				label: "紧急",
				icon: "🚨"
			}
		};
		const TODO_CSS = `
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
.todo-input { flex: 1; min-width: 160px; padding: 7px 10px; font-size: 13px; color: var(--dsw-alias-label-primary); background: var(--dsw-specific-input-major); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; outline: none; font-family: inherit; }
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

.todo-list { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; overflow-y: auto; }
.todo-section-title { margin: 4px 0 0; font-size: 11px; font-weight: 700; color: var(--dsw-alias-label-tertiary); text-transform: none; letter-spacing: .02em; }
.todo-empty { padding: 24px 8px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary); }

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
.todo-item-title { font-size: 13px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.todo-item[data-done] .todo-item-title { text-decoration: line-through; }
.todo-item-note { font-size: 12px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; white-space: pre-wrap; }
.todo-item-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
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
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
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
.life-cell .life-focus-clock { font-size: 40px; padding: 10px 0; }
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
.life-cal-title { flex: 1; font-size: 14px; font-weight: 700; }
.life-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; flex: none; }
.life-cal-weekday { text-align: center; font-size: 11px; color: var(--dsw-alias-label-tertiary); padding: 4px 0; }
.life-cal-cell { min-height: 74px; padding: 4px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; overflow: hidden; }
.life-cal-cell-empty { background: transparent; border-color: transparent; }
.life-cal-cell[data-today] { border-color: var(--dsw-alias-state-business-primary); }
.life-cal-day { font-size: 11px; color: var(--dsw-alias-label-tertiary); margin-bottom: 2px; }
.life-cal-items { display: flex; flex-direction: column; gap: 2px; }
.life-cal-item { font-size: 10px; line-height: 1.3; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.life-cal-item[data-danger] { color: var(--dsw-alias-state-error-primary); font-weight: 600; }
.life-cal-more { font-size: 10px; color: var(--dsw-alias-label-tertiary); }

/* --- 专注 ---------------------------------------------------------------- */
.life-focus-clock { text-align: center; font-size: 48px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: .02em; padding: 18px 0; }
.life-focus-clock[data-running] { color: var(--dsw-alias-state-business-primary); }

/* --- 统计 ---------------------------------------------------------------- */
.life-stat-line { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.life-stat-cards { display: flex; gap: 10px; flex: none; }
.life-stat-card { flex: 1; padding: 12px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; }
.life-stat-value { font-size: 16px; font-weight: 700; }
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
.life-cell-head { display: flex; align-items: center; gap: 6px; font-size: 11.5px; letter-spacing: .1em; }
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
`;
		/** 注入样式（幂等）。 */
		function injectStyles() {
			document.querySelectorAll("style[data-dsh-todo-css]").forEach((el) => el.remove());
			const style = document.createElement("style");
			style.dataset.dshTodoCss = "";
			style.textContent = TODO_CSS;
			document.head.appendChild(style);
		}
		// src/types.ts
		const DEFAULT_TODO_SETTINGS = {
			soundByStyle: {
				info: true,
				success: true,
				warning: true,
				danger: true
			},
			snoozeMinutes: [
				5,
				15,
				60
			],
			sound: {
				inPage: true,
				volume: .7,
				dangerRepeat: 3
			},
			dock: {
				enabled: true,
				showNext: true
			}
		};
		// src/client/TodoDock.tsx
		/**
		* 个人待办 Dock：贴在窗口右侧边缘的常驻小窗，只管你自己的待办事项，与 DSH 会话无关。
		* 收起时是一枚贴边药丸，直接显示下一件要做的事（到期时间 + 标题），逾期变红并脉动；
		* 展开是待办清单，可快速添加、勾完成、稍后提醒。垂直位置可拖动，收起/展开与位置都
		* 记在 localStorage。DSH 活跃会话默认完全不显示，需要时才在设置里打开。
		* @module dsh-life-planner/client/TodoDock
		*/
		const Y_KEY = "dsh.todoReminder.dockY";
		const COLLAPSED_KEY = "dsh.todoReminder.dockCollapsed";
		/** 到期文案每 30 秒刷新一次，避免「还有 5 分钟」长期不动。 */
		const CLOCK_MS = 3e4;
		/** 距到期 ≤ 这个时间就自动探出（不用鼠标也知道该动了）。 */
		const DUE_SOON_MS = 6e5;
		const EDGE = 8;
		/** 快速添加时可选的提醒时机。 */
		const WHEN_OPTIONS = [
			{
				value: "none",
				label: "不提醒"
			},
			{
				value: "10",
				label: "10 分钟后"
			},
			{
				value: "30",
				label: "30 分钟后"
			},
			{
				value: "60",
				label: "1 小时后"
			},
			{
				value: "180",
				label: "3 小时后"
			},
			{
				value: "tomorrow",
				label: "明天 9:00"
			}
		];
		/** 把选项换算成到期时间戳；'none' 表示不提醒。 */
		function resolveWhen(value, now) {
			if (value === "none") return void 0;
			if (value === "tomorrow") {
				const d = new Date(now);
				d.setDate(d.getDate() + 1);
				d.setHours(9, 0, 0, 0);
				return d.getTime();
			}
			const minutes = Number(value);
			return Number.isFinite(minutes) ? now + minutes * 6e4 : void 0;
		}
		function pad(n) {
			return String(n).padStart(2, "0");
		}
		/** 判断两个时间戳是否同一天。 */
		function sameDay(a, b) {
			return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
		}
		/** 收起态药丸上的紧凑时间：今天只给时分，明天/更远带日期前缀。 */
		function shortTime(dueAt, now) {
			const due = new Date(dueAt);
			const today = new Date(now);
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			if (sameDay(due, today)) return `${pad(due.getHours())}:${pad(due.getMinutes())}`;
			if (sameDay(due, tomorrow)) return `明天 ${pad(due.getHours())}:${pad(due.getMinutes())}`;
			return `${due.getMonth() + 1}/${due.getDate()}`;
		}
		/** 清单里的到期文案（逾期给出已过多久）。 */
		function dueLabel(dueAt, now) {
			const due = new Date(dueAt);
			const clock = `${pad(due.getHours())}:${pad(due.getMinutes())}`;
			if (dueAt <= now) {
				const minutes = Math.max(1, Math.round((now - dueAt) / 6e4));
				return minutes < 60 ? `已逾期 ${minutes} 分钟` : `已逾期 ${Math.round(minutes / 60)} 小时`;
			}
			const today = new Date(now);
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			if (sameDay(due, today)) return `今天 ${clock}`;
			if (sameDay(due, tomorrow)) return `明天 ${clock}`;
			return `${due.getMonth() + 1}月${due.getDate()}日 ${clock}`;
		}
		function loadCollapsed() {
			try {
				return localStorage.getItem(COLLAPSED_KEY) !== "false";
			} catch {
				return true;
			}
		}
		function loadY() {
			try {
				const raw = localStorage.getItem(Y_KEY);
				const value = raw === null ? NaN : Number(raw);
				if (Number.isFinite(value)) return value;
			} catch {}
			return Math.round(window.innerHeight * .45);
		}
		/** 收起态标题：超长截断（宽度另有 CSS 硬上限兜底）。 */
		function clip(title, max = 22) {
			return title.length > max ? `${title.slice(0, max)}…` : title;
		}
		function TodoDock() {
			const { data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const [collapsed, setCollapsed] = (0, react.useState)(loadCollapsed);
			const [y, setY] = (0, react.useState)(loadY);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const [draft, setDraft] = (0, react.useState)("");
			const [when, setWhen] = (0, react.useState)("none");
			const [busy, setBusy] = (0, react.useState)(false);
			/** 鼠标是否停在收起态药丸上（停住就探出看标题）。 */
			const [hovered, setHovered] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const yRef = (0, react.useRef)(y);
			const drag = (0, react.useRef)(null);
			const dock = data?.settings.dock ?? DEFAULT_TODO_SETTINGS.dock;
			const snoozeMinutes = data?.settings.snoozeMinutes ?? DEFAULT_TODO_SETTINGS.snoozeMinutes;
			const reminders = data?.reminders ?? [];
			const pending = (data?.todos ?? []).filter((t) => !t.done);
			const sorted = [...pending].sort((a, b) => {
				if (a.dueAt !== void 0 && b.dueAt !== void 0) return a.dueAt - b.dueAt;
				if (a.dueAt !== void 0) return -1;
				if (b.dueAt !== void 0) return 1;
				return b.createdAt - a.createdAt;
			});
			const next = sorted[0];
			const reminderByTodo = new Map(reminders.map((r) => [r.todoId, r]));
			const overdue = reminders.length > 0 || sorted.some((t) => t.dueAt !== void 0 && t.dueAt <= now);
			/** 下一件已经快到点（含逾期）：收起态自动探出。 */
			const soon = next !== void 0 && next.dueAt !== void 0 && next.dueAt - now <= DUE_SOON_MS;
			const clampY = (0, react.useCallback)((value) => {
				const height = rootRef.current?.offsetHeight ?? 48;
				return Math.max(EDGE, Math.min(value, Math.max(EDGE, window.innerHeight - height - EDGE)));
			}, []);
			const commitY = (0, react.useCallback)((value) => {
				yRef.current = value;
				setY(value);
				try {
					localStorage.setItem(Y_KEY, String(value));
				} catch {}
			}, []);
			(0, react.useEffect)(() => {
				const timer = window.setInterval(() => {
					setNow(Date.now());
				}, CLOCK_MS);
				return () => {
					window.clearInterval(timer);
				};
			}, []);
			(0, react.useEffect)(() => {
				const fit = () => {
					const fitted = clampY(yRef.current);
					if (fitted !== yRef.current) commitY(fitted);
				};
				fit();
				window.addEventListener("resize", fit);
				return () => {
					window.removeEventListener("resize", fit);
				};
			}, [
				clampY,
				commitY,
				collapsed
			]);
			const toggleCollapsed = (0, react.useCallback)((value) => {
				setCollapsed(value);
				try {
					localStorage.setItem(COLLAPSED_KEY, String(value));
				} catch {}
			}, []);
			const onPointerDown = (event) => {
				const target = event.target;
				if (target !== null && target.closest("button, input, select, textarea, a") !== null) return;
				drag.current = {
					startY: event.clientY,
					moved: false
				};
				event.currentTarget.setPointerCapture(event.pointerId);
			};
			const onPointerMove = (event) => {
				if (drag.current === null) return;
				const dy = event.clientY - drag.current.startY;
				if (Math.abs(dy) > 4) drag.current.moved = true;
				if (drag.current.moved) {
					commitY(clampY(yRef.current + dy));
					drag.current.startY = event.clientY;
				}
			};
			const finishDrag = (event) => {
				const state = drag.current;
				drag.current = null;
				try {
					event.currentTarget.releasePointerCapture(event.pointerId);
				} catch {}
				return state !== null && state.moved;
			};
			const onPointerUp = (event) => {
				if (!finishDrag(event) && collapsed) toggleCollapsed(false);
			};
			const onPointerCancel = (event) => {
				finishDrag(event);
				commitY(clampY(yRef.current));
			};
			const submit = async () => {
				const title = draft.trim();
				if (title === "" || busy) return;
				setBusy(true);
				try {
					await todoStore.addTodo({
						title,
						note: "",
						dueAt: resolveWhen(when, Date.now()),
						reminderStyle: "info",
						confirmOnComplete: false
					});
					setDraft("");
					setWhen("none");
				} finally {
					setBusy(false);
				}
			};
			const renderRow = (todo) => {
				const isOverdue = todo.dueAt !== void 0 && todo.dueAt <= now;
				const reminder = reminderByTodo.get(todo.id);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-dock-row",
					"data-overdue": isOverdue ? "true" : void 0,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-dock-check",
							title: "标记完成",
							"aria-label": `完成 ${todo.title}`,
							onClick: () => void todoStore.completeTodo(todo),
							children: "✓"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "todo-dock-row-main",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "todo-dock-row-title",
								title: todo.title,
								children: todo.title
							}), todo.dueAt !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "todo-dock-row-due",
								children: dueLabel(todo.dueAt, now)
							}) : null]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "todo-dock-row-actions",
							children: [reminder !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "todo-btn todo-dock-mini",
								title: `稍后 ${snoozeMinutes[0] ?? 10} 分钟再提醒`,
								onClick: () => void todoStore.snooze(reminder, snoozeMinutes[0] ?? 10),
								children: "稍后"
							}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "todo-btn danger todo-dock-mini",
								title: "删除这条待办",
								onClick: () => void todoStore.removeTodo(todo.id),
								children: "✕"
							})]
						})
					]
				}, todo.id);
			};
			if (!dock.enabled) return null;
			if (collapsed) {
				const label = next === void 0 ? "暂无待办" : `${next.title}${next.dueAt !== void 0 ? `（${dueLabel(next.dueAt, now)}）` : ""}`;
				const peek = hovered || soon;
				const showTitle = peek && dock.showNext;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: rootRef,
					className: "todo-dock",
					"data-collapsed": "true",
					"data-peek": peek ? "true" : void 0,
					"data-overdue": overdue ? "true" : void 0,
					style: {
						top: y,
						position: "fixed",
						right: 0,
						display: "flex",
						maxWidth: showTitle ? 344 : 132,
						overflow: "hidden"
					},
					role: "button",
					tabIndex: 0,
					"aria-label": `待办：${label}`,
					title: `${label}\n点击展开清单 · 上下拖动可移动`,
					onPointerEnter: () => setHovered(true),
					onPointerLeave: () => setHovered(false),
					onPointerDown,
					onPointerMove,
					onPointerUp,
					onPointerCancel,
					onKeyDown: (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							toggleCollapsed(false);
						}
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-dock-icon",
							style: { flex: "none" },
							children: overdue ? "⏰" : "📋"
						}),
						next?.dueAt !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-dock-time",
							style: { flex: "none" },
							"data-overdue": next.dueAt <= now ? "true" : void 0,
							children: shortTime(next.dueAt, now)
						}) : null,
						showTitle ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-dock-next",
							style: {
								minWidth: 0,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: next === void 0 ? "无待办" : clip(next.title, 48)
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-dock-idle",
							style: { flex: "none" },
							children: pending.length
						})
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: "todo-dock",
				"data-collapsed": "false",
				"data-overdue": overdue ? "true" : void 0,
				style: {
					top: y,
					maxWidth: 340,
					overflow: "hidden"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "todo-dock-head",
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerCancel,
						title: "拖动可上下移动",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "todo-dock-icon",
								children: overdue ? "⏰" : "📋"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
								className: "todo-dock-title",
								children: ["待办 ", pending.length > 0 ? `(${pending.length})` : ""]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "todo-btn todo-dock-mini",
								title: "收起到边缘",
								"aria-label": "收起",
								onClick: () => toggleCollapsed(true),
								children: "›"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "todo-dock-add",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "todo-input",
							placeholder: "要做什么？回车添加",
							value: draft,
							onChange: (event) => setDraft(event.target.value),
							onKeyDown: (event) => {
								if (event.key === "Enter") submit();
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "todo-select todo-dock-when",
							value: when,
							onChange: (event) => setWhen(event.target.value),
							title: "什么时候提醒",
							children: WHEN_OPTIONS.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: option.value,
								children: option.label
							}, option.value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "todo-dock-body",
						children: sorted.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "todo-dock-empty",
							children: [
								"没有待办。",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								"上面加一条，到点会提醒你。"
							]
						}) : sorted.map(renderRow)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "todo-dock-foot",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn todo-dock-mini",
							onClick: () => {
								todoStore.setPanel(true);
								toggleCollapsed(true);
							},
							children: "打开完整面板"
						})
					})
				]
			});
		}
		// src/client/ReminderLayer.tsx
		/**
		* 提醒层：body 上的全局 React 根，渲染**待办**提醒 toast 栈 + 完成确认弹窗 + 待办 Dock，
		* 并通过 SSE 实时订阅 host 状态变化；标签页在后台时把新提醒转成系统原生通知
		* （切出到别的窗口也能收到）。DSH 会话的完成/审批提醒不在这里 —— 那是
		* dsh-session-attention 的事。
		* @module dsh-life-planner/client/ReminderLayer
		*/
		function formatTime(ms) {
			const d = new Date(ms);
			const pad = (n) => String(n).padStart(2, "0");
			return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
		}
		function ReminderToast({ reminder, snoozeMinutes }) {
			const meta = STYLE_META[reminder.style];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "todo-toast",
				"data-style": reminder.style,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-toast-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-toast-icon",
							children: meta.icon
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-toast-title",
							children: reminder.title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-toast-sub",
							children: formatTime(reminder.firedAt)
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-toast-actions",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn primary",
							onClick: () => {
								const todo = todoStore.getSnapshot().data?.todos.find((t) => t.id === reminder.todoId);
								if (todo !== void 0) todoStore.completeTodo(todo, reminder.id);
								else todoStore.dismissReminder(reminder.id);
							},
							children: "完成"
						}),
						snoozeMinutes.map((minutes) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "todo-btn",
							onClick: () => void todoStore.snooze(reminder, minutes),
							children: [
								"稍后",
								minutes,
								"分钟"
							]
						}, minutes)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn",
							onClick: () => void todoStore.dismissReminder(reminder.id),
							children: "忽略"
						})
					]
				})]
			}, reminder.id);
		}
		function ConfirmDialog() {
			const { confirming } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			if (confirming === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "todo-modal-backdrop",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-modal",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: "todo-modal-title",
							children: "确认完成"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "todo-modal-message",
							children: [
								"确定完成「",
								confirming.todo.title,
								"」吗？"
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "todo-modal-footer",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "todo-btn",
								onClick: () => todoStore.cancelConfirm(),
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "todo-btn primary",
								onClick: () => void todoStore.confirmComplete(),
								children: "确认完成"
							})]
						})
					]
				})
			});
		}
		function ReminderLayer() {
			const { activeReminders, freshReminders, data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const snoozeMinutes = data?.settings.snoozeMinutes ?? DEFAULT_TODO_SETTINGS.snoozeMinutes;
			(0, react.useEffect)(() => {
				const es = new EventSource("/api/life/events");
				es.onmessage = (event) => {
					try {
						const message = JSON.parse(event.data);
						if (message.type === "state" && message.state !== void 0) todoStore.applyState(message.state);
					} catch {}
				};
				const onVisibility = () => {
					if (document.visibilityState === "visible") todoStore.refresh();
				};
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					es.close();
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, []);
			(0, react.useEffect)(() => {
				if (typeof Notification === "undefined") return;
				if (Notification.permission === "default") Notification.requestPermission().catch(() => {});
			}, []);
			(0, react.useEffect)(() => {
				if (freshReminders.length === 0) return;
				if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
				if (document.visibilityState !== "hidden") return;
				for (const reminder of freshReminders) try {
					new Notification(`⏰ ${reminder.title}`, {
						body: reminder.kind === "advance" ? "提前提醒：明天到期" : "到点了",
						tag: `dsh-life-${reminder.id}`,
						silent: true
					});
				} catch {}
			}, [freshReminders]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				activeReminders.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "todo-toast-stack",
					children: activeReminders.map((reminder) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReminderToast, {
						reminder,
						snoozeMinutes
					}, reminder.id))
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfirmDialog, {}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TodoDock, {})
			] });
		}
		// src/client/CountdownTab.tsx
		/**
		* 倒计时页签：记录「距离某个日期还有几天」的目标（如六级考试、生日）。
		* @module dsh-life-planner/client/CountdownTab
		*/
		/** 目标日期距今天的天数（本地自然日，向上取整）。 */
		function daysLeft(targetDate, now) {
			const target = (/* @__PURE__ */ new Date(`${targetDate}T00:00:00`)).getTime();
			const today = new Date(now);
			today.setHours(0, 0, 0, 0);
			return Math.ceil((target - today.getTime()) / 864e5);
		}
		function label(days) {
			if (days > 0) return `还有 ${days} 天`;
			if (days === 0) return "就是今天";
			return `已过 ${-days} 天`;
		}
		function CountdownTab() {
			const { data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const [title, setTitle] = (0, react.useState)("");
			const [targetDate, setTargetDate] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const now = data?.now ?? Date.now();
			const countdowns = data?.countdowns ?? [];
			const submit = async () => {
				const t = title.trim();
				if (t === "" || targetDate === "" || busy) return;
				setBusy(true);
				try {
					await todoStore.addCountdown({
						title: t,
						targetDate
					});
					setTitle("");
					setTargetDate("");
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "life-tab",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-form-row",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "todo-input",
							placeholder: "目标名称，如：六级考试",
							value: title,
							onChange: (e) => setTitle(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") submit();
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "todo-input",
							style: {
								flex: "none",
								minWidth: 150
							},
							type: "date",
							value: targetDate,
							onChange: (e) => setTargetDate(e.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn primary",
							disabled: busy || title.trim() === "" || targetDate === "",
							onClick: () => void submit(),
							children: "添加"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "todo-list",
					children: countdowns.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "todo-empty",
						children: "还没有倒计时。加一个目标日期，这里每天显示还剩几天。"
					}) : countdowns.map((c) => {
						const d = daysLeft(c.targetDate, now);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "todo-item",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "todo-item-main",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "todo-item-title",
									children: c.title
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "todo-item-meta",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "todo-badge",
										"data-style": d < 0 ? "danger" : d <= 3 ? "warning" : "info",
										children: label(d)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: c.targetDate })]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "todo-actions",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "todo-btn danger",
									title: "删除",
									onClick: () => void todoStore.removeCountdown(c.id),
									children: "删除"
								})
							})]
						}, c.id);
					})
				})]
			});
		}
		// src/client/CalendarTab.tsx
		/**
		* 日历页签：月视图，把带日期的待办（dueAt）与倒计时目标（targetDate）标到对应日期上。
		* @module dsh-life-planner/client/CalendarTab
		*/
		const WEEKDAYS = [
			"日",
			"一",
			"二",
			"三",
			"四",
			"五",
			"六"
		];
		/** 本地日期键 YYYY-MM-DD。 */
		function dayKey$1(d) {
			const pad = (n) => String(n).padStart(2, "0");
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		}
		function buildMonth(year, month) {
			const startOffset = new Date(year, month, 1).getDay();
			const cells = [];
			for (let i = 0; i < startOffset; i++) cells.push(null);
			const daysInMonth = new Date(year, month + 1, 0).getDate();
			for (let d = 1; d <= daysInMonth; d++) cells.push(dayKey$1(new Date(year, month, d)));
			while (cells.length < 42) cells.push(null);
			return {
				year,
				month,
				cells
			};
		}
		function isToday(key, now) {
			return key === dayKey$1(new Date(now));
		}
		function CalendarTab() {
			const { data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const [cursor, setCursor] = (0, react.useState)(() => {
				const now = /* @__PURE__ */ new Date();
				return {
					year: now.getFullYear(),
					month: now.getMonth()
				};
			});
			const now = data?.now ?? Date.now();
			const todos = (data?.todos ?? []).filter((t) => !t.done && t.dueAt !== void 0);
			const countdowns = data?.countdowns ?? [];
			const todosByDay = /* @__PURE__ */ new Map();
			for (const t of todos) {
				const k = dayKey$1(new Date(t.dueAt));
				const arr = todosByDay.get(k) ?? [];
				arr.push(t);
				todosByDay.set(k, arr);
			}
			const countdownsByDay = /* @__PURE__ */ new Map();
			for (const c of countdowns) {
				const arr = countdownsByDay.get(c.targetDate) ?? [];
				arr.push(c);
				countdownsByDay.set(c.targetDate, arr);
			}
			const grid = buildMonth(cursor.year, cursor.month);
			const prev = () => {
				const m = cursor.month - 1;
				if (m < 0) setCursor({
					year: cursor.year - 1,
					month: 11
				});
				else setCursor({
					year: cursor.year,
					month: m
				});
			};
			const next = () => {
				const m = cursor.month + 1;
				if (m > 11) setCursor({
					year: cursor.year + 1,
					month: 0
				});
				else setCursor({
					year: cursor.year,
					month: m
				});
			};
			const goToday = () => {
				const t = /* @__PURE__ */ new Date();
				setCursor({
					year: t.getFullYear(),
					month: t.getMonth()
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "life-tab",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "life-cal-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn",
							onClick: prev,
							children: "‹"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "life-cal-title",
							children: [
								cursor.year,
								" 年 ",
								cursor.month + 1,
								" 月"
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn",
							onClick: next,
							children: "›"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn",
							onClick: goToday,
							children: "今天"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "life-cal-grid",
					children: [WEEKDAYS.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "life-cal-weekday",
						children: w
					}, w)), grid.cells.map((key, i) => {
						if (key === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "life-cal-cell life-cal-cell-empty" }, i);
						const dayTodos = todosByDay.get(key) ?? [];
						const items = [...(countdownsByDay.get(key) ?? []).map((c) => ({
							tag: "⏳",
							text: c.title,
							danger: false
						})), ...dayTodos.map((t) => ({
							tag: "📋",
							text: t.title,
							danger: t.dueAt <= now
						}))];
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "life-cal-cell",
							"data-today": isToday(key, now) ? "true" : void 0,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "life-cal-day",
								children: Number(key.slice(8, 10))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "life-cal-items",
								children: [items.slice(0, 3).map((it, j) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "life-cal-item",
									"data-danger": it.danger ? "true" : void 0,
									title: it.text,
									children: [
										it.tag,
										" ",
										it.text
									]
								}, j)), items.length > 3 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "life-cal-more",
									children: ["+", items.length - 3]
								}) : null]
							})]
						}, key);
					})]
				})]
			});
		}
		// src/client/FocusTab.tsx
		/**
		* 专注页签：正向计时（不设时长）。开始 / 结束落一条记录，可关联某条待办。
		* @module dsh-life-planner/client/FocusTab
		*/
		function formatDuration$1(ms) {
			const total = Math.max(0, Math.floor(ms / 1e3));
			const h = Math.floor(total / 3600);
			const m = Math.floor(total % 3600 / 60);
			const s = total % 60;
			const pad = (n) => String(n).padStart(2, "0");
			return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
		}
		function formatClock(ms) {
			const d = new Date(ms);
			const pad = (n) => String(n).padStart(2, "0");
			return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		}
		function FocusTab() {
			const { data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const [taskId, setTaskId] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const running = data?.focusRunning ?? null;
			const sessions = data?.focusSessions ?? [];
			const pending = (data?.todos ?? []).filter((t) => !t.done);
			(0, react.useEffect)(() => {
				if (running === null) return;
				const timer = window.setInterval(() => setNow(Date.now()), 1e3);
				return () => window.clearInterval(timer);
			}, [running !== null]);
			const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
			const startedAt = running?.startedAt ?? null;
			const start = async () => {
				if (busy) return;
				setBusy(true);
				try {
					await todoStore.focusStart(taskId === "" ? void 0 : taskId);
					setNow(Date.now());
				} finally {
					setBusy(false);
				}
			};
			const stop = async () => {
				if (busy) return;
				setBusy(true);
				try {
					await todoStore.focusStop();
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "life-tab",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "life-focus-clock",
						"data-running": startedAt !== null ? "true" : void 0,
						children: startedAt !== null ? formatDuration$1(now - startedAt) : "00:00"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "todo-form-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: "todo-select",
							value: taskId,
							onChange: (e) => setTaskId(e.target.value),
							title: "关联一条待办（可选）",
							disabled: startedAt !== null,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: "不关联任务"
							}), pending.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: t.id,
								children: t.title
							}, t.id))]
						}), startedAt !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn danger",
							onClick: () => void stop(),
							children: "结束专注"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn primary",
							onClick: () => void start(),
							children: "开始专注"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "life-stat-line",
						children: [
							"累计专注 ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: formatDuration$1(totalMs) }),
							" · 共 ",
							sessions.length,
							" 次"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "todo-list",
						children: sessions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "todo-empty",
							children: "还没有专注记录。点「开始专注」，结束后这里会有记录。"
						}) : sessions.slice(0, 30).map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "todo-item",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "todo-item-main",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "todo-item-title",
									children: formatDuration$1(s.durationMs)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "todo-item-meta",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										formatClock(s.startedAt),
										" – ",
										formatClock(s.endedAt)
									] }), s.taskId !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "关联任务" }) : null]
								})]
							})
						}, s.id))
					})
				]
			});
		}
		// src/client/StatsTab.tsx
		/**
		* 统计页签：累计专注时长 + 完成数 + 近半年热力图（GitHub 风格）。
		* 热力图由客户端从 focusSessions + 已完成待办的 completedAt 直接聚合，无需额外接口。
		* @module dsh-life-planner/client/StatsTab
		*/
		function dayKey(d) {
			const pad = (n) => String(n).padStart(2, "0");
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		}
		function formatDuration(ms) {
			const total = Math.max(0, Math.floor(ms / 1e3));
			const h = Math.floor(total / 3600);
			const m = Math.floor(total % 3600 / 60);
			return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`;
		}
		const WEEKS = 26;
		function StatsTab() {
			const { data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const todos = data?.todos ?? [];
			const sessions = data?.focusSessions ?? [];
			const now = data?.now ?? Date.now();
			const totalFocusMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
			const completedCount = todos.filter((t) => t.done).length;
			const activity = /* @__PURE__ */ new Map();
			for (const t of todos) {
				if (!t.done || t.completedAt === void 0) continue;
				const k = dayKey(new Date(t.completedAt));
				const cell = activity.get(k) ?? {
					tasks: 0,
					focusMs: 0
				};
				cell.tasks += 1;
				activity.set(k, cell);
			}
			for (const s of sessions) {
				const k = dayKey(new Date(s.endedAt));
				const cell = activity.get(k) ?? {
					tasks: 0,
					focusMs: 0
				};
				cell.focusMs += s.durationMs;
				activity.set(k, cell);
			}
			const levelOf = (k) => {
				const cell = activity.get(k);
				if (cell === void 0) return 0;
				const units = cell.tasks + Math.floor(cell.focusMs / 18e5);
				if (units <= 0) return 0;
				if (units === 1) return 1;
				if (units <= 3) return 2;
				if (units <= 6) return 3;
				return 4;
			};
			const today = new Date(now);
			const endOfWeek = new Date(today);
			endOfWeek.setHours(0, 0, 0, 0);
			const columns = [];
			for (let w = 25; w >= 0; w--) {
				const sunday = new Date(endOfWeek);
				sunday.setDate(endOfWeek.getDate() - w * 7);
				sunday.setDate(sunday.getDate() - sunday.getDay());
				const col = [];
				for (let d = 0; d < 7; d++) {
					const day = new Date(sunday);
					day.setDate(sunday.getDate() + d);
					col.push(dayKey(day));
				}
				columns.push(col);
			}
			const totalUnits = [...activity.values()].reduce((sum, c) => sum + c.tasks + Math.floor(c.focusMs / 18e5), 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "life-tab",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "life-stat-cards",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "life-stat-card",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "life-stat-value",
									children: formatDuration(totalFocusMs)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "life-stat-label",
									children: "累计专注"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "life-stat-card",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "life-stat-value",
									children: completedCount
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "life-stat-label",
									children: "已完成待办"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "life-stat-card",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "life-stat-value",
									children: sessions.length
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "life-stat-label",
									children: "专注次数"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "life-heat-title",
						children: [
							"近 ",
							WEEKS,
							" 周活动（完成任务 + 每 30 分钟专注计 1 格）"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "life-heat",
						children: columns.map((col, ci) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "life-heat-col",
							children: col.map((k) => {
								const level = levelOf(k);
								const cell = activity.get(k);
								const title = cell === void 0 ? k : `${k}：完成 ${cell.tasks} · 专注 ${formatDuration(cell.focusMs)}`;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "life-heat-cell",
									"data-level": level,
									title
								}, k);
							})
						}, ci))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "life-heat-legend",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "少" }),
							[
								0,
								1,
								2,
								3,
								4
							].map((l) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "life-heat-cell",
								"data-level": l
							}, l)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "多" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "life-stat-line",
								style: { marginLeft: "auto" },
								children: [
									"近半年共 ",
									totalUnits,
									" 个活动单位"
								]
							})
						]
					})
				]
			});
		}
		// src/client/TodoPanel.tsx
		/**
		* 生活面板：单页多栏布局（待办 / 倒计时 / 日历 / 专注 / 统计 同屏）。
		* 待办区只保留核心：标题、备注、到期时间、完成、删除。
		* @module dsh-life-planner/client/TodoPanel
		*/
		/** 把 datetime-local 字符串转 epoch ms（无效返回 undefined）。 */
		function toEpoch(value) {
			if (value === "") return void 0;
			const ms = new Date(value).getTime();
			return Number.isFinite(ms) ? ms : void 0;
		}
		function formatDue(ms) {
			const d = new Date(ms);
			const pad = (n) => String(n).padStart(2, "0");
			return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		}
		/** 待办区：极简表单 + 列表。 */
		function TodoSection() {
			const { data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const [title, setTitle] = (0, react.useState)("");
			const [note, setNote] = (0, react.useState)("");
			const [dueAt, setDueAt] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [notifPermission, setNotifPermission] = (0, react.useState)(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
			(0, react.useEffect)(() => {
				if (typeof Notification === "undefined") return;
				setNotifPermission(Notification.permission);
			}, []);
			const requestNotification = async () => {
				if (typeof Notification === "undefined") return;
				try {
					setNotifPermission(await Notification.requestPermission());
				} catch {
					setNotifPermission(Notification.permission);
				}
			};
			const todos = data?.todos ?? [];
			const pending = todos.filter((t) => !t.done);
			const done = todos.filter((t) => t.done);
			const submit = async () => {
				const trimmed = title.trim();
				if (trimmed === "" || busy) return;
				setBusy(true);
				try {
					await todoStore.addTodo({
						title: trimmed,
						note: note.trim(),
						dueAt: toEpoch(dueAt)
					});
					setTitle("");
					setNote("");
					setDueAt("");
				} finally {
					setBusy(false);
				}
			};
			const renderItem = (todo) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "todo-item",
				"data-done": todo.done ? "true" : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-item-main",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "todo-item-title",
							children: todo.title
						}),
						todo.note !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "todo-item-note",
							children: todo.note
						}) : null,
						todo.dueAt !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "todo-item-meta",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "todo-badge",
								"data-style": todo.reminderStyle,
								children: [
									STYLE_META[todo.reminderStyle].icon,
									" ",
									formatDue(todo.dueAt)
								]
							}), todo.advanceAt !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "提前一天提醒" }) : null]
						}) : null
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-actions",
					children: [!todo.done ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "todo-btn primary",
						onClick: () => void todoStore.completeTodo(todo),
						children: "完成"
					}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "todo-btn danger",
						onClick: () => void todoStore.removeTodo(todo.id),
						children: "删除"
					})]
				})]
			}, todo.id);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "life-tab",
				children: [
					notifPermission !== "granted" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "todo-settings",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "todo-settings-hint",
							children: "开启系统通知后，切出窗口也能收到 Windows 通知。"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-btn",
							onClick: () => void requestNotification(),
							children: notifPermission === "denied" ? "系统通知已阻止" : "开启系统通知"
						})]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "todo-form",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "todo-form-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "todo-input",
								placeholder: "要提醒自己什么？",
								value: title,
								onChange: (e) => setTitle(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") submit();
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "todo-btn primary",
								disabled: busy || title.trim() === "",
								onClick: () => void submit(),
								children: "添加"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "todo-form-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "todo-input",
								placeholder: "备注（可选）",
								value: note,
								onChange: (e) => setNote(e.target.value)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "todo-input",
								type: "datetime-local",
								title: "到期时间（可选，到点会提醒）",
								value: dueAt,
								style: {
									flex: "0 1 auto",
									minWidth: 0
								},
								onChange: (e) => setDueAt(e.target.value)
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "todo-list",
						children: [
							pending.length === 0 && done.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "todo-empty",
								children: "还没有待办。加一条，设个时间，到期会提醒你。"
							}) : null,
							pending.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "todo-section-title",
								children: "待办"
							}) : null,
							pending.map(renderItem),
							done.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "todo-section-title",
								children: "已完成"
							}) : null,
							done.map(renderItem)
						]
					})
				]
			});
		}
		function TodoPanel(props) {
			const onClose = props.onClose;
			const { data } = (0, react.useSyncExternalStore)(todoStore.subscribe, todoStore.getSnapshot);
			const pending = (data?.todos ?? []).filter((t) => !t.done).length;
			const countdowns = (data?.countdowns ?? []).length;
			(0, react.useEffect)(() => {
				const onKey = (e) => {
					if (e.key === "Escape") onClose?.();
				};
				document.addEventListener("keydown", onKey);
				return () => document.removeEventListener("keydown", onKey);
			}, [onClose]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "todo-panel",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "todo-topbar",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-back",
							onClick: () => onClose?.(),
							title: "返回对话（Esc）",
							children: "← 返回"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "todo-count",
							children: [
								pending,
								" 待办",
								countdowns > 0 ? ` · ${countdowns} 倒计时` : ""
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "todo-close",
							title: "关闭面板（Esc 也可以）",
							"aria-label": "关闭",
							onClick: () => {
								onClose?.();
							},
							children: "✕"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "life-board",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "life-cell life-cell-tasks",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "life-cell-head",
								children: "待办"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TodoSection, {})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "life-cell life-cell-cal",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "life-cell-head",
								children: "日历"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalendarTab, {})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "life-cell life-cell-countdown",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "life-cell-head",
								children: "倒计时"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CountdownTab, {})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "life-cell life-cell-focus",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "life-cell-head",
								children: "专注"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusTab, {})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "life-cell life-cell-stats",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "life-cell-head",
								children: "统计"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatsTab, {})]
						})
					]
				})]
			});
		}
		// src/client/panel-seat.tsx
		/** 面板 id：侧边栏行与主视图页面共用它，也是 layout.selectPanel 的取值。 */
		const PANEL_ID = "life-planner";
		/** 行序（外壳：插件页 0、定时页 10、任务看板 20）。 */
		const PANEL_ORDER = 30;
		/** 行图标：外壳给尺寸与选中态，本组件只画 glyph。 */
		function PanelIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				"data-dsh-panel-entry": PANEL_ID,
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "2.5",
					y: "3",
					width: "11",
					height: "10.5",
					rx: "2"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5.4 8.2l1.7 1.7 3.5-3.6" })]
			});
		}
		/** 注册侧边栏行 + 主视图页面。 */
		function registerPanel(ctx) {
			const slots = ctx.slots;
			const disposers = [];
			disposers.push(slots.inject("sidebar.panellist", () => slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: PANEL_ORDER,
				label: () => "生活"
			}, PanelIcon)));
			const Page = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "todo-panel-page",
				"data-dsh-todo-view": "",
				"data-dsh-plugin": "life-planner-layer",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TodoPanel, { onClose: () => closePanel(ctx) })
			});
			disposers.push(slots.inject("main", () => slots.register({
				name: "main",
				key: PANEL_ID
			}, Page)));
			return () => {
				for (const dispose of disposers.splice(0)) try {
					dispose();
				} catch {}
			};
		}
		/**
		* 把本插件的面板开关与外壳「当前选中的面板」双向对齐：
		* 外壳那边切换 → 同步进 store（✕ / Esc 才有意义）；
		* store 这边关闭（点 ✕）→ 让外壳切回对话。两边都做等值判断，不会互相触发成环。
		*/
		/**
		* 单向绑定：面板里的 ✕ 关掉自己时，让外壳把主视图切回对话。
		* 刻意不做「外壳 → store」的反向同步：两个真相源互相写会形成死循环，
		* 表现就是高亮卡住、✕ 关不掉。选中态完全由外壳拥有。
		*/
		/**
		* 显式关闭：只在用户点面板里的 ✕ 时调用 —— 让外壳把主视图切回对话。
		* 刻意不做任何自动/订阅式的切换：之前那版订阅在挂载时就触发了一次，
		* 表现就是「插件一加载，界面自己跳回会话」，把你正在看的页面顶掉。
		*/
		function closePanel(ctx) {
			try {
				if (typeof ctx.layout?.selectPanel === "function") {
					ctx.layout.selectPanel(null);
					return;
				}
			} catch (error) {
				console.warn("[dsh-life-planner] 切回对话失败:", error);
			}
			try {
				document.querySelector("[class*=\"newSession\"]")?.click();
			} catch {}
		}
		/**
		* 悬浮层（待办条 / 活动悬浮球 / 提醒 toast）注册进外壳的 shell.overlay 座位：
		* 这是「整帧浮动层，位于所有列之上」。以前是自己 append 到 document.body ——
		* 于是外壳停用插件时只回收了它的座位内容，我们的节点留在页面上（悬浮窗不消失）。
		*/
		function registerOverlay(ctx) {
			const slots = ctx.slots;
			return slots.inject("shell.overlay", () => slots.register({
				name: "shell.overlay",
				id: "life-planner-layer",
				order: 60
			}, ReminderLayer));
		}
		// src/client/index.tsx
		/**
		* 面板挂载：容器插进中心列，打开时占满它（独立页面式，与任务看板 / SSH 一致），
		* 中心列其余内容暂时隐藏；关闭后立刻回到对话。开合由 store 的 panelOpen 驱动。
		*/
		const inject = [
			"sessions",
			"slots",
			"layout"
		];
		function apply(_ctx) {
			injectStyles();
			const disposers = [];
			/** 旧路径：DOM 注入（旧版外壳，或官方座位没生效时的兜底）。 */
			try {
				disposers.push(registerPanel(_ctx));
			} catch (error) {
				console.error("[dsh-life-planner] 面板座位注册失败:", error);
			}
			try {
				disposers.push(registerOverlay(_ctx));
			} catch (error) {
				console.error("[dsh-life-planner] 悬浮层注册失败:", error);
			}
			/** 统一清理：幂等（splice 后为空即无事），dispose 事件与返回值共用。 */
			const cleanup = () => {
				for (const dispose of disposers.splice(0)) try {
					dispose();
				} catch {}
			};
			try {
				const onDispose = _ctx.on;
				if (typeof onDispose === "function") onDispose.call(_ctx, "dispose", cleanup);
			} catch {}
			return cleanup;
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map