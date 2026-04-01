export const LEAD_STATUS = ['new', 'contacted', 'replied', 'interested', 'negotiating', 'won', 'lost'] as const;
export type LeadStatus = typeof LEAD_STATUS[number];

export const LEAD_TEMPERATURE = ['cold', 'warm', 'hot'] as const;
export type LeadTemperature = typeof LEAD_TEMPERATURE[number];

export const LEAD_SOURCE = ['manual', 'csv_import', 'whatsapp_inbound', 'email_inbound', 'instagram_inbound'] as const;
export type LeadSource = typeof LEAD_SOURCE[number];

export const MESSAGE_CHANNEL = ['whatsapp', 'email'] as const;
export type MessageChannel = typeof MESSAGE_CHANNEL[number];

export const MESSAGE_DIRECTION = ['inbound', 'outbound'] as const;
export type MessageDirection = typeof MESSAGE_DIRECTION[number];

export const MESSAGE_STATUS = ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'] as const;
export type MessageStatus = typeof MESSAGE_STATUS[number];

export const CAMPAIGN_STATUS = ['draft', 'active', 'paused', 'completed'] as const;
export type CampaignStatus = typeof CAMPAIGN_STATUS[number];

export const CAMPAIGN_LEAD_STATUS = ['active', 'paused', 'completed', 'failed'] as const;
export type CampaignLeadStatus = typeof CAMPAIGN_LEAD_STATUS[number];
