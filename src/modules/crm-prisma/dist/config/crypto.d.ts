export interface EncryptedData {
    encrypted: string;
    iv: string;
    tag: string;
}
export declare function encrypt(plaintext: string): EncryptedData;
export declare function decrypt(encrypted: string, iv: string, tag: string): string;
//# sourceMappingURL=crypto.d.ts.map