"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedDates = getBlockedDates;
exports.listEvents = listEvents;
exports.createEvent = createEvent;
exports.deleteEvent = deleteEvent;
const logger_1 = require("../../utils/logger");
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
let cachedToken = null;
async function getAccessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
        return cachedToken.token;
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Google Calendar credentials not configured');
    }
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        logger_1.logger.error('[calendar] Falha ao renovar token', { status: res.status, err });
        throw new Error(`Token refresh failed: ${res.status}`);
    }
    const data = (await res.json());
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    logger_1.logger.info('[calendar] Access token renovado com sucesso');
    return cachedToken.token;
}
async function getBlockedDates(month) {
    const token = await getAccessToken();
    const [year, mon] = month.split('-').map(Number);
    const timeMin = new Date(year, mon - 1, 1);
    const timeMax = new Date(year, mon, 0, 23, 59, 59);
    const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: 'America/Sao_Paulo',
        singleEvents: 'true',
        maxResults: '250',
        fields: 'items(start,end,status)',
    });
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const err = await res.text();
        logger_1.logger.error('[calendar] Falha na consulta events.list', { status: res.status, err });
        throw new Error(`Events list failed: ${res.status}`);
    }
    const data = (await res.json());
    const events = (data.items || []).filter((e) => e.status !== 'cancelled');
    const blockedSet = new Set();
    for (const ev of events) {
        const startStr = ev.start?.date || ev.start?.dateTime;
        const endStr = ev.end?.date || ev.end?.dateTime;
        if (!startStr || !endStr)
            continue;
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (ev.end?.date)
            end.setDate(end.getDate() - 1);
        const cursor = new Date(start);
        while (cursor <= end) {
            blockedSet.add(cursor.toISOString().split('T')[0]);
            cursor.setDate(cursor.getDate() + 1);
        }
    }
    const blocked = Array.from(blockedSet).sort();
    logger_1.logger.info('[calendar] Datas bloqueadas para ' + month, { count: blocked.length });
    return blocked;
}
async function listEvents(timeMin, timeMax) {
    const token = await getAccessToken();
    const params = new URLSearchParams({
        timeMin,
        timeMax,
        timeZone: 'America/Sao_Paulo',
        singleEvents: 'true',
        maxResults: '250',
        orderBy: 'startTime',
    });
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const err = await res.text();
        logger_1.logger.error('[calendar] Falha ao listar eventos', { status: res.status, err });
        throw new Error(`Events list failed: ${res.status}`);
    }
    const data = (await res.json());
    const items = (data.items || []).filter(e => e.status !== 'cancelled');
    return items.map(ev => {
        const startStr = ev.start?.dateTime || ev.start?.date || '';
        const endStr = ev.end?.dateTime || ev.end?.date || startStr;
        const isAllDay = !ev.start?.dateTime;
        return {
            id: ev.id,
            title: ev.summary || '(sem título)',
            start: startStr,
            end: endStr,
            description: ev.description,
            location: ev.location,
            isAllDay,
            source: 'google',
        };
    });
}
async function createEvent(input) {
    const token = await getAccessToken();
    const body = {
        summary: input.title,
    };
    if (input.description)
        body.description = input.description;
    if (input.location)
        body.location = input.location;
    if (input.isAllDay) {
        body.start = { date: input.start.split('T')[0] };
        body.end = { date: input.end.split('T')[0] };
    }
    else {
        body.start = { dateTime: input.start, timeZone: 'America/Sao_Paulo' };
        body.end = { dateTime: input.end, timeZone: 'America/Sao_Paulo' };
    }
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.text();
        logger_1.logger.error('[calendar] Falha ao criar evento', { status: res.status, err });
        throw new Error(`Create event failed: ${res.status}`);
    }
    const ev = (await res.json());
    const startStr = ev.start?.dateTime || ev.start?.date || input.start;
    const endStr = ev.end?.dateTime || ev.end?.date || input.end;
    logger_1.logger.info('[calendar] Evento criado', { id: ev.id, title: ev.summary });
    return {
        id: ev.id,
        title: ev.summary || input.title,
        start: startStr,
        end: endStr,
        description: ev.description,
        location: ev.location,
        isAllDay: input.isAllDay,
        source: 'google',
    };
}
async function deleteEvent(eventId) {
    const token = await getAccessToken();
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
        const err = await res.text();
        logger_1.logger.error('[calendar] Falha ao deletar evento', { eventId, status: res.status, err });
        throw new Error(`Delete event failed: ${res.status}`);
    }
    logger_1.logger.info('[calendar] Evento deletado', { eventId });
}
//# sourceMappingURL=calendar.service.js.map