/**
 * Todo HTTP 路由：浏览器经同源 /api/life/* JSON 端点读写（与 dsh-pet 的
 * /api/pet/* 同模式），另加 /api/life/events SSE 事件流实时推送状态变化。
 * host 用 ctx.webServer.register 注册这些 exact 路由。
 * @module dsh-life-planner/routes
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TodoService } from './service.js';
/** webServer 路由描述（局部类型，避免 host 运行时依赖 @deepseek-ai/dsh-host-webserver）。 */
export interface WebRoute {
    kind: 'exact' | 'prefix';
    path: string;
    handler(req: IncomingMessage, res: ServerResponse): void | Promise<void>;
}
/** Browser-facing base path. */
export declare const TODO_API_PREFIX = "/api/life";
/** 构建完整路由族。 */
export declare function makeTodoRoutes(service: TodoService): WebRoute[];
