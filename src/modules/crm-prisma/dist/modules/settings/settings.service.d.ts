export interface SettingRecord {
    key: string;
    value: string;
    updatedAt: Date;
}
export declare function getSetting(key: string): Promise<string | null>;
export declare function setSetting(key: string, value: string): Promise<SettingRecord>;
export declare function getAllSettings(): Promise<SettingRecord[]>;
export declare function deleteSetting(key: string): Promise<void>;
//# sourceMappingURL=settings.service.d.ts.map