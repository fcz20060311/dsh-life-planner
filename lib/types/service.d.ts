/**
 * TodoService：待办 CRUD + 到期提醒调度 + 设置 + 订阅（SSE 推送源）。纯框架无关
 * （不 extend cordis Service、不依赖 @deepseek-ai/* 运行时），只依赖 node: 内置 +
 * 本地 store/types，因此 host 半 tsc 产物自包含、任何装配路径都能加载。
 * @module dsh-life-planner/service
 */
import { type CountdownAddInput, type CountdownItem, type DockSettings, type FocusRun, type FocusSession, type HeatmapCell, type ReminderStyle, type SoundSettings, type TodoAddInput, type TodoItem, type TodoPatch, type TodoSettings, type TodoState } from './types.js';
export interface TodoServiceConfig {
    /** 调度 tick 间隔（ms）。 */
    tickMs?: number;
}
/** 默认调度间隔：5 秒。 */
export declare const DEFAULT_TICK_MS = 5000;
/** 提前提醒的启用条件：建/改任务时截止时间距今至少 2 天。 */
export declare const ADVANCE_WINDOW_MS: number;
/** 提前提醒的提前量：截止前一天。 */
export declare const ADVANCE_LEAD_MS: number;
/**
 * 按截止时间算提前提醒时刻：
 * 截止距今 ≥2 天才启用，否则 undefined（只在到期时刻提醒）。
 */
export declare function computeAdvanceAt(dueAt: number | undefined, now: number): number | undefined;
type StateListener = (state: TodoState) => void;
/** 设置补丁（按字段允许部分更新）。 */
export interface TodoSettingsPatch {
    soundByStyle?: Partial<Record<ReminderStyle, boolean>>;
    snoozeMinutes?: number[];
    sound?: Partial<SoundSettings>;
    dock?: Partial<DockSettings>;
}
export declare class TodoService {
    private doc;
    private readonly dataFile;
    private readonly subscribers;
    constructor(dataFile?: string);
    /** 订阅状态变化（SSE 推送用）。返回取消订阅函数。 */
    subscribe(listener: StateListener): () => void;
    /** 完整状态快照。 */
    state(): TodoState;
    /** 新建待办。 */
    add(input: TodoAddInput): TodoItem;
    /** 更新待办字段。 */
    update(id: string, patch: TodoPatch): TodoItem | null;
    /** 删除待办（并清理其提醒）。 */
    remove(id: string): void;
    /** 完成待办（并清理其提醒）。每天重复的任务不结束，而是顺延到下一天。 */
    complete(id: string): TodoItem | null;
    /** 稍后提醒：把已触发的提醒延后 minutes 分钟。 */
    snooze(id: string, minutes: number): TodoItem | null;
    /** 忽略一条提醒（确认已看到，不再提醒）。 */
    dismissReminder(reminderId: string): void;
    /** 更新用户设置。 */
    setSettings(patch: TodoSettingsPatch): TodoSettings;
    /** 当前设置（深拷贝）。 */
    settings(): TodoSettings;
    /**
     * 调度 tick：扫描到期 / 提前提醒的待办，生成提醒事件。
     * @param now - 当前 epoch ms。
     */
    tick(now: number): void;
    /** 倒计时（如「距离六级考试还有 X 天」）。 */
    addCountdown(input: CountdownAddInput): CountdownItem;
    removeCountdown(id: string): void;
    /** 开始一次专注计时（正向计时，不设时长）。 */
    startFocus(taskId?: string): FocusRun;
    /** 结束当前专注，落一条记录。 */
    stopFocus(): FocusSession;
    /** 删除一条专注记录。 */
    removeFocusSession(id: string): void;
    /** 最近 days 天的热力图：按本地日期聚合「完成待办数 + 专注毫秒」。 */
    heatmap(days?: number): Record<string, HeatmapCell>;
    private pushReminder;
    private clearRemindersFor;
    private flush;
    private notify;
}
export {};
