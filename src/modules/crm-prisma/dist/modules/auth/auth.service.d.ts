export interface TokenPayload {
    userId: string;
}
export interface AuthResult {
    user: {
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    };
    token: string;
}
export declare function register(name: string, email: string, password: string): Promise<AuthResult>;
export declare function login(email: string, password: string): Promise<AuthResult>;
export declare function getUserById(id: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
}>;
export declare function logout(token: string): Promise<void>;
//# sourceMappingURL=auth.service.d.ts.map