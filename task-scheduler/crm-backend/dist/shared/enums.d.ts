export declare const LEAD_STATUS: readonly ["new", "contacted", "replied", "interested", "negotiating", "won", "lost"];
export type LeadStatus = typeof LEAD_STATUS[number];
export declare const LEAD_TEMPERATURE: readonly ["cold", "warm", "hot"];
export type LeadTemperature = typeof LEAD_TEMPERATURE[number];
export declare const LEAD_SOURCE: readonly ["manual", "csv_import", "whatsapp_inbound", "email_inbound", "instagram_inbound"];
export type LeadSource = typeof LEAD_SOURCE[number];
export declare const MESSAGE_CHANNEL: readonly ["whatsapp", "email"];
export type MessageChannel = typeof MESSAGE_CHANNEL[number];
export declare const MESSAGE_DIRECTION: readonly ["inbound", "outbound"];
export type MessageDirection = typeof MESSAGE_DIRECTION[number];
export declare const MESSAGE_STATUS: readonly ["pending", "queued", "sent", "delivered", "read", "failed"];
export type MessageStatus = typeof MESSAGE_STATUS[number];
export declare const CAMPAIGN_STATUS: readonly ["draft", "active", "paused", "completed"];
export type CampaignStatus = typeof CAMPAIGN_STATUS[number];
export declare const CAMPAIGN_LEAD_STATUS: readonly ["active", "paused", "completed", "failed"];
export type CampaignLeadStatus = typeof CAMPAIGN_LEAD_STATUS[number];
//# sourceMappingURL=enums.d.ts.map