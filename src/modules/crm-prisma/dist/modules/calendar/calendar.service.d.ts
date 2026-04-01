export declare function getBlockedDates(month: string): Promise<string[]>;
export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    color?: string;
    isAllDay?: boolean;
    source?: 'google' | 'task';
}
export declare function listEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]>;
export interface CreateEventInput {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    isAllDay?: boolean;
}
export declare function createEvent(input: CreateEventInput): Promise<CalendarEvent>;
export declare function deleteEvent(eventId: string): Promise<void>;
//# sourceMappingURL=calendar.service.d.ts.map