import { Worker } from 'bullmq';
import { SendEmailJobData } from './queue';
declare const sendEmailWorker: Worker<SendEmailJobData, any, string>;
export { sendEmailWorker };
//# sourceMappingURL=send-email.job.d.ts.map