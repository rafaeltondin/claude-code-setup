import { Worker } from 'bullmq';
import { CheckInboxJobData } from './queue';
declare const checkInboxWorker: Worker<CheckInboxJobData, any, string>;
/**
 * Agenda um job repetitivo na checkInboxQueue para verificar a caixa de entrada
 * a cada 5 minutos. Usa BullMQ repeat para garantir persistência no Redis.
 */
export declare function setupInboxPolling(): Promise<void>;
export { checkInboxWorker };
//# sourceMappingURL=check-inbox.job.d.ts.map