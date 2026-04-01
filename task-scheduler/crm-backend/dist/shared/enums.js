"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPAIGN_LEAD_STATUS = exports.CAMPAIGN_STATUS = exports.MESSAGE_STATUS = exports.MESSAGE_DIRECTION = exports.MESSAGE_CHANNEL = exports.LEAD_SOURCE = exports.LEAD_TEMPERATURE = exports.LEAD_STATUS = void 0;
exports.LEAD_STATUS = ['new', 'contacted', 'replied', 'interested', 'negotiating', 'won', 'lost'];
exports.LEAD_TEMPERATURE = ['cold', 'warm', 'hot'];
exports.LEAD_SOURCE = ['manual', 'csv_import', 'whatsapp_inbound', 'email_inbound', 'instagram_inbound'];
exports.MESSAGE_CHANNEL = ['whatsapp', 'email'];
exports.MESSAGE_DIRECTION = ['inbound', 'outbound'];
exports.MESSAGE_STATUS = ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'];
exports.CAMPAIGN_STATUS = ['draft', 'active', 'paused', 'completed'];
exports.CAMPAIGN_LEAD_STATUS = ['active', 'paused', 'completed', 'failed'];
//# sourceMappingURL=enums.js.map