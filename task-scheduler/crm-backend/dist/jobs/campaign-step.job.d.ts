import { Worker } from 'bullmq';
import { CampaignStepJobData } from './queue';
declare const campaignStepWorker: Worker<CampaignStepJobData, any, string>;
export { campaignStepWorker };
//# sourceMappingURL=campaign-step.job.d.ts.map