/**
 * dsh-life-planner host 半 —— 挂载 TodoService、HTTP 路由（含 SSE 推送）、定时调度、
 * agent 工具与 systemPrompt 公告。
 *
 * 本插件是**全局个人待办**：一份清单、与 DSH 会话无关，不监听任何 session 事件。
 * DSH 会话的完成 / 提问 / 审批提醒是另一个独立插件 dsh-session-attention。
 * host 半只依赖 node: 内置模块（自包含）。
 * @module dsh-life-planner
 */
import { DEFAULT_TICK_MS, TodoService } from './service.js';
import { makeTodoRoutes } from './routes.js';
import { makeTodoTools } from './tools.js';
/** 稳定的 cordis 插件名（与 cordis.patch.yml insert id 一致）。 */
export const name = 'life-planner';
/** host 半需要的注入服务。 */
export const inject = ['webServer', 'timer', 'tools', 'systemPrompt'];
/** 面向模型的公告：插件存在性、能力、限制（拾光笺）。 */
export const TODO_GUIDANCE = '本机已安装 dsh-life-planner 插件（拾光笺 · 个人生活时间管理）：一份【全局】任务清单，与 DSH 会话、与任何具体任务无关。侧边栏「拾光笺」入口打开单页面板（全局视图，任何会话下都一样），同屏分五区：待办 / 倒计时 / 日历 / 专注 / 统计。窗口右侧边缘常驻一个可收起的待办条（Dock），收起时显示下一件要做的事（到期时间 + 标题），逾期变红。任务可设到期时间；截止时间距今 ≥2 天的任务会在到期前一天先提醒一次，其余只在到期时刻提醒。提醒为静音系统通知（到点弹一条，不响铃）。倒计时记录"距离某日还有 X 天"；日历按月展示每天的任务与倒计时；专注做正向计时（无固定时长）；统计看累计专注时长、完成任务数与热力图。agent 可用工具：life_add_task / life_list_tasks / life_complete_task / life_snooze / life_delete_task（管理待办）、life_add_countdown / life_list_countdowns / life_delete_countdown（管理倒计时）、life_focus_start / life_focus_stop（专注计时）。数据持久化在 ~/.dsh/life-planner/todos.json。限制：提醒需要 DSH 窗口打开（后台亦可）才会弹；完全关闭期间的提醒会暂存，下次打开补弹。用户提到「待办 / todo / 提醒我做事 / 任务清单 / 日程 / 倒计时 / 距离…还有几天」时即指本插件。注意：DSH 会话的「跑完 / 提问 / 审批」提醒属于另一个独立插件 dsh-session-attention，与本插件无关。';
/** 公告 section 在工具引导带的顺序。 */
const SECTION_ORDER = 201;
/**
 * host 装配：创建服务、注册路由、注册工具、启动调度、注入公告。
 * @param ctx - host 上下文（webServer + timer + tools + systemPrompt 已注入）。
 * @param config - 插件配置（缺省用默认值）。
 */
export function apply(ctx, config = {}) {
    const service = new TodoService();
    const tickMs = config.tickMs ?? DEFAULT_TICK_MS;
    // 路由（含 SSE 事件流）：fiber dispose 自动注销。
    ctx.effect(() => {
        const disposers = makeTodoRoutes(service).map((route) => ctx.webServer.register(route));
        return () => {
            for (const dispose of disposers)
                dispose();
        };
    }, 'life-planner: routes');
    // agent 工具：fiber dispose 自动注销。
    ctx.effect(() => {
        const disposers = makeTodoTools(service).map((tool) => ctx.tools.register(tool));
        return () => {
            for (const dispose of disposers)
                dispose();
        };
    }, 'life-planner: tools');
    // 调度：timer 服务返回的 disposer 随 fiber 自动清理。
    ctx.interval(() => {
        try {
            service.tick(Date.now());
        }
        catch (error) {
            // 调度异常不得拖垮 host。
            console.error('[dsh-life-planner] tick failed:', error);
        }
    }, tickMs);
    // 公告：让 agent 知道插件存在（systemPrompt 可选注入，缺失时静默）。
    ctx.effect(() => {
        if (ctx.systemPrompt === undefined)
            return;
        return ctx.systemPrompt.section({
            name: 'plugin:life-planner',
            order: SECTION_ORDER,
            text: TODO_GUIDANCE,
        });
    }, 'life-planner: guidance');
}
export { TodoService } from './service.js';
//# sourceMappingURL=index.js.map