import { Worker } from 'bullmq';
import { SendWhatsAppJobData } from './queue';
declare const sendWhatsAppWorker: Worker<SendWhatsAppJobData, any, string>;
export { sendWhatsAppWorker };
//# sourceMappingURL=send-whatsapp.job.d.ts.map