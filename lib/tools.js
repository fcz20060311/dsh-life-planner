/**
 * Agent 工具：让 assistant 直接增删查改「同一份全局个人待办列表」。
 * 手写工具 descriptor（name/description/parameters JSON Schema/output/execute），
 * 不 import @deepseek-ai/dsh-tools —— 保持 host 半自包含、tsc 直编、免打包。
 * @module dsh-life-planner/tools
 */
import { isDateString, isReminderStyle } from './types.js';
/** 字符串输出的通用 render。 */
function textRender(_args, value) {
    return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }];
}
const STRING_SCHEMA = { type: 'string' };
function asArgs(args) {
    return typeof args === 'object' && args !== null ? args : {};
}
/** 按 id（精确）或 title（精确/子串）定位一条待办。 */
function findTodo(service, args) {
    const id = typeof args.id === 'string' ? args.id : '';
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const todos = service.state().todos;
    if (id !== '') {
        const byId = todos.find((t) => t.id === id);
        if (byId !== undefined)
            return byId;
    }
    if (title !== '') {
        const exact = todos.find((t) => t.title === title);
        if (exact !== undefined)
            return exact;
        const sub = todos.find((t) => t.title.includes(title));
        if (sub !== undefined)
            return sub;
    }
    return undefined;
}
function fmtTime(ms) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function renderList(state, status) {
    const todos = state.todos.filter((t) => {
        if (status === 'pending')
            return !t.done;
        if (status === 'done')
            return t.done;
        return true;
    });
    if (todos.length === 0)
        return '（无）';
    return todos.map((t) => {
        const mark = t.done ? '✓' : '·';
        const parts = [`${mark} ${t.repeat === 'daily' ? '🔁 ' : ''}${t.title}`];
        if (t.dueAt !== undefined)
            parts.push(`提醒 ${fmtTime(t.dueAt)}`);
        if (t.confirmOnComplete)
            parts.push('完成需确认');
        parts.push(`id=${t.id}`);
        return parts.join('  ');
    }).join('\n');
}
/** 构建全部工具（注册时逐个 ctx.tools.register）。 */
export function makeTodoTools(service) {
    const addTool = {
        name: 'life_add_task',
        description: '在用户的「个人待办/提醒」列表（全局，跨所有会话，持久化）中添加一条。用户说"提醒我 X 分钟后做 Y"、"加个待办"、"帮我记一下"等时使用。到期后会在 DSH 里弹提醒（切出到别的窗口也会弹系统通知）。',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: '待办标题（要提醒的事，简短）' },
                note: { type: 'string', description: '备注（可选）' },
                dueInMinutes: { type: 'integer', description: '相对提醒：多少分钟后提醒（与 dueAt 二选一，优先用这个，如 30）' },
                dueAt: { type: 'integer', description: '绝对提醒时间（epoch 毫秒），与 dueInMinutes 二选一' },
                confirmOnComplete: { type: 'boolean', description: '完成前是否需要用户确认，默认 false' },
                repeat: { type: 'string', enum: ['daily'], description: '填 daily 表示每天重复：完成后自动顺延到第二天同一时间。' },
            },
            required: ['title'],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const a = asArgs(args);
            const title = typeof a.title === 'string' ? a.title.trim() : '';
            if (title === '')
                throw new Error('title 不能为空');
            const dueInMinutes = typeof a.dueInMinutes === 'number' && Number.isFinite(a.dueInMinutes) ? a.dueInMinutes : undefined;
            const dueAt = typeof a.dueAt === 'number' && Number.isFinite(a.dueAt) ? a.dueAt : undefined;
            const effectiveDueAt = dueAt ?? (dueInMinutes !== undefined && dueInMinutes > 0 ? Date.now() + dueInMinutes * 60_000 : undefined);
            const todo = service.add({
                title,
                note: typeof a.note === 'string' ? a.note : '',
                dueAt: effectiveDueAt,
                reminderStyle: isReminderStyle(a.reminderStyle) ? a.reminderStyle : 'info',
                confirmOnComplete: a.confirmOnComplete === true,
                repeat: a.repeat === 'daily' ? 'daily' : undefined,
            });
            const tail = todo.dueAt !== undefined ? `，将在 ${fmtTime(todo.dueAt)} 提醒` : '（未设提醒时间，仅记入待办）';
            const rep = todo.repeat === 'daily' ? '，每天重复' : '';
            return `已添加待办「${todo.title}」${tail}${rep}`;
        },
    };
    const listTool = {
        name: 'life_list_tasks',
        description: '列出用户的「个人待办/提醒」列表（全局，跨会话）。',
        parameters: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['pending', 'done', 'all'], description: 'pending 待办 / done 已完成 / all 全部，默认 pending' },
            },
            required: [],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const a = asArgs(args);
            const status = a.status === 'done' || a.status === 'all' ? a.status : 'pending';
            const state = service.state();
            const count = state.todos.filter((t) => (status === 'all' ? true : status === 'done' ? t.done : !t.done)).length;
            return `待办列表（${count} 条）：\n${renderList(state, status)}`;
        },
    };
    const completeTool = {
        name: 'life_complete_task',
        description: '完成一条待办（按 id 或标题匹配）。',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: '待办 id（life_list_tasks 返回的 id）' },
                title: { type: 'string', description: '或按标题匹配（精确/子串）' },
            },
            required: [],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const todo = findTodo(service, asArgs(args));
            if (todo === undefined)
                throw new Error('找不到该待办（请用 life_list_tasks 查看 id 或标题）');
            const updated = service.complete(todo.id);
            if (updated?.repeat === 'daily') {
                return `已完成今天的「${updated.title}」，明天 ${fmtTime(updated.dueAt ?? Date.now())} 还会再提醒你`;
            }
            return `已完成「${todo.title}」`;
        },
    };
    const snoozeTool = {
        name: 'life_snooze',
        description: '把一条待办的提醒延后（稍后提醒）。',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: '待办 id' },
                title: { type: 'string', description: '或按标题匹配' },
                minutes: { type: 'integer', description: '延后多少分钟，默认 10' },
            },
            required: [],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const a = asArgs(args);
            const todo = findTodo(service, a);
            if (todo === undefined)
                throw new Error('找不到该待办');
            const minutes = typeof a.minutes === 'number' && Number.isFinite(a.minutes) ? a.minutes : 10;
            service.snooze(todo.id, minutes);
            return `已把「${todo.title}」延后 ${minutes} 分钟提醒`;
        },
    };
    const deleteTool = {
        name: 'life_delete_task',
        description: '删除一条待办（按 id 或标题匹配）。',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: '待办 id' },
                title: { type: 'string', description: '或按标题匹配' },
            },
            required: [],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const todo = findTodo(service, asArgs(args));
            if (todo === undefined)
                throw new Error('找不到该待办');
            service.remove(todo.id);
            return `已删除「${todo.title}」`;
        },
    };
    /** 从 YYYY-MM-DD 算出"距离今天还有几天"（按本地自然日，负数=已过）。 */
    function daysLeft(dateStr) {
        const target = new Date(`${dateStr}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.round((target.getTime() - today.getTime()) / 86_400_000);
    }
    function renderCountdowns(state) {
        if (state.countdowns.length === 0)
            return '（无）';
        return state.countdowns.map((c) => {
            const n = daysLeft(c.targetDate);
            const left = n > 0 ? `还有 ${n} 天` : n === 0 ? '就是今天' : `已过 ${-n} 天`;
            return `· ${c.title}（${c.targetDate}）${left}  id=${c.id}`;
        }).join('\n');
    }
    const addCountdownTool = {
        name: 'life_add_countdown',
        description: '添加一个「倒计时/纪念日倒数」（全局，持久化）。用户说"距离六级考试还有几天""帮我记一下 X 月 X 日是 X"等时使用，日历页签也会显示它。',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: '倒计时标题（要倒数到的事件，简短，如"六级考试"）' },
                targetDate: { type: 'string', description: '目标日期，YYYY-MM-DD（如 2026-12-19）' },
                daysFromNow: { type: 'integer', description: '或按"多少天后"计（与 targetDate 二选一，优先 targetDate）' },
            },
            required: ['title'],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const a = asArgs(args);
            const title = typeof a.title === 'string' ? a.title.trim() : '';
            if (title === '')
                throw new Error('title 不能为空');
            let targetDate = typeof a.targetDate === 'string' ? a.targetDate.trim() : '';
            if (targetDate === '' || !isDateString(targetDate)) {
                const daysFromNow = typeof a.daysFromNow === 'number' && Number.isFinite(a.daysFromNow) ? a.daysFromNow : undefined;
                if (daysFromNow !== undefined) {
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    d.setDate(d.getDate() + daysFromNow);
                    const pad = (n) => String(n).padStart(2, '0');
                    targetDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                }
                else {
                    throw new Error('请提供 targetDate（YYYY-MM-DD）或 daysFromNow');
                }
            }
            const item = service.addCountdown({ title, targetDate });
            return `已添加倒计时「${item.title}」（${item.targetDate}），${daysLeft(item.targetDate) >= 0 ? `还有 ${daysLeft(item.targetDate)} 天` : `已过 ${-daysLeft(item.targetDate)} 天`}`;
        },
    };
    const listCountdownsTool = {
        name: 'life_list_countdowns',
        description: '列出所有倒计时/纪念日倒数（全局）。',
        parameters: { type: 'object', properties: {}, required: [] },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: () => {
            const state = service.state();
            return `倒计时列表（${state.countdowns.length} 条）：\n${renderCountdowns(state)}`;
        },
    };
    const deleteCountdownTool = {
        name: 'life_delete_countdown',
        description: '删除一个倒计时（按 id 或标题匹配）。',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: '倒计时 id（life_list_countdowns 返回）' },
                title: { type: 'string', description: '或按标题匹配（精确/子串）' },
            },
            required: [],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const a = asArgs(args);
            const id = typeof a.id === 'string' ? a.id : '';
            const title = typeof a.title === 'string' ? a.title.trim() : '';
            const list = service.state().countdowns;
            const hit = id !== '' ? list.find((c) => c.id === id) : title !== '' ? list.find((c) => c.title === title) ?? list.find((c) => c.title.includes(title)) : undefined;
            if (hit === undefined)
                throw new Error('找不到该倒计时（请用 life_list_countdowns 查看 id 或标题）');
            service.removeCountdown(hit.id);
            return `已删除倒计时「${hit.title}」`;
        },
    };
    const focusStartTool = {
        name: 'life_focus_start',
        description: '开始一次专注计时（正向计时，无时长上限）。可关联一条待办标题。进行中会累计到统计页的专注时长。',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: '关联的待办标题（可选）' },
                id: { type: 'string', description: '或关联的待办 id（可选）' },
            },
            required: [],
        },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: (args) => {
            const a = asArgs(args);
            const todo = typeof a.id === 'string' && a.id !== '' ? findTodo(service, a) : undefined;
            try {
                service.startFocus(todo?.id);
            }
            catch (error) {
                throw new Error(error instanceof Error ? error.message : '无法开始专注');
            }
            return todo !== undefined ? `已开始专注「${todo.title}」` : '已开始专注计时';
        },
    };
    const focusStopTool = {
        name: 'life_focus_stop',
        description: '结束当前的专注计时，返回本次专注时长。',
        parameters: { type: 'object', properties: {}, required: [] },
        output: { schema: STRING_SCHEMA, render: textRender },
        execute: () => {
            let session;
            try {
                session = service.stopFocus();
            }
            catch (error) {
                throw new Error(error instanceof Error ? error.message : '当前没有进行中的专注');
            }
            const mins = Math.round(session.durationMs / 60_000);
            const fmt = mins >= 60 ? `${Math.floor(mins / 60)} 小时 ${mins % 60} 分` : `${mins} 分钟`;
            return `已结束本次专注，用时 ${fmt}（已计入统计）`;
        },
    };
    return [addTool, listTool, completeTool, snoozeTool, deleteTool, addCountdownTool, listCountdownsTool, deleteCountdownTool, focusStartTool, focusStopTool];
}
//# sourceMappingURL=tools.js.map