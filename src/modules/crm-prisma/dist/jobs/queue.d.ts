import { Worker } from 'bullmq';
export declare function getWorkers(): Worker[];
export declare function registerWorker(worker: Worker): void;
export declare function initQueues(): void;
/**
 * Graceful shutdown: fecha todos os workers.
 */
export declare function closeQueues(): Promise<void>;
//# sourceMappingURL=queue.d.ts.map