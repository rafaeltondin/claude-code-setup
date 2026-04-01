import Redis from 'ioredis';
export declare const redis: {
    get(key: string): Promise<string | null>;
    setex(key: string, ttl: number, value: string): Promise<void>;
    del(...keys: string[]): Promise<void>;
    exists(key: string): Promise<number>;
    ping(): Promise<string>;
    quit(): Promise<void>;
    readonly available: boolean;
    /** Instancia ioredis real (pode ser null) — usar APENAS para BullMQ connection */
    readonly ioredis: Redis | null;
};
//# sourceMappingURL=redis.d.ts.map