import { Worker, Queue } from 'bullmq';
export interface CleanupJobData {
    triggeredBy?: string;
}
export declare const cleanupQueue: Queue<CleanupJobData, any, string, CleanupJobData, any, string>;
declare const cleanupWorker: Worker<CleanupJobData, any, string>;
export declare function setupCleanupSchedule(): Promise<void>;
export declare function closeCleanupQueue(): Promise<void>;
export { cleanupWorker };
//# sourceMappingURL=cleanup.job.d.ts.map