import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<{
    log: ({
        emit: "event";
        level: "query";
    } | {
        emit: "event";
        level: "error";
    })[];
}, "error" | "query", import("@prisma/client/runtime/library").DefaultArgs>;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
//# sourceMappingURL=database.d.ts.map