import { generateKeyPair } from './test-utils';
import {
    encryptTextWithSignature,
    encryptBinaryWithSignature,
    decryptTextWithVerification,
    decryptBinaryWithVerification,
    encryptText,
    signText,
    decryptText,
    verifyText
} from '../nodes/PgpNode/utils/operations';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BinaryUtils } from '../nodes/PgpNode/utils/BinaryUtils';

test('encrypts and decrypts text with embedded signature', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const message = 'This is a message to encrypt and sign.';
    
    // Encrypt with embedded signature
    const encrypted = await encryptTextWithSignature(message, publicKey, privateKey);
    
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    
    // Decrypt with automatic verification
    const result = await decryptTextWithVerification(encrypted, privateKey, publicKey);
    expect(result).toBeTruthy();
    expect(result).not.toBe(false);
    
    if (result !== false) {
        expect(result.data).toEqual(message);
        expect(result.verified).toBeTruthy();
    }
});

test('encrypts and decrypts text with embedded signature using encrypted private key', async () => {
    const { privateKey, publicKey } = await generateKeyPair('passphrase');
    const message = 'This is a message to encrypt and sign.';
    
    // Encrypt with embedded signature
    const encrypted = await encryptTextWithSignature(message, publicKey, privateKey);
    
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    
    // Decrypt with automatic verification
    const result = await decryptTextWithVerification(encrypted, privateKey, publicKey);
    expect(result).toBeTruthy();
    expect(result).not.toBe(false);
    
    if (result !== false) {
        expect(result.data).toEqual(message);
        expect(result.verified).toBeTruthy();
    }
});

test('decrypt fails with wrong private key but embedded signature verification still works', async () => {
    const { privateKey: privateKey1, publicKey: publicKey1 } = await generateKeyPair();
    const { privateKey: privateKey2 } = await generateKeyPair();
    const message = 'This is a message to encrypt and sign.';
    
    // Encrypt with embedded signature using first key pair
    const encrypted = await encryptTextWithSignature(message, publicKey1, privateKey1);
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    
    // Decrypt with second private key should fail
    const result = await decryptTextWithVerification(encrypted, privateKey2, publicKey1);
    expect(result).toBeFalsy();
});

test('encrypts and decrypts binary with embedded signature', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    
    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));
    
    // Encrypt with embedded signature
    const encrypted = await encryptBinaryWithSignature(binaryData, publicKey, privateKey);
    
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    
    // Decrypt with automatic verification
    const result = await decryptBinaryWithVerification(encrypted, privateKey, publicKey);
    expect(result).toBeTruthy();
    expect(result).not.toBe(false);
    
    if (result !== false) {
        expect(result.data instanceof Uint8Array).toBeTruthy();
        expect(BinaryUtils.uint8ArrayToBase64(result.data)).toEqual(BinaryUtils.uint8ArrayToBase64(binaryData));
        expect(result.verified).toBeTruthy();
    }
});

test('encrypts and decrypts binary with embedded signature using encrypted private key', async () => {
    const { privateKey, publicKey } = await generateKeyPair('passphrase');
    
    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));
    
    // Encrypt with embedded signature
    const encrypted = await encryptBinaryWithSignature(binaryData, publicKey, privateKey);
    
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    
    // Decrypt with automatic verification
    const result = await decryptBinaryWithVerification(encrypted, privateKey, publicKey);
    expect(result).toBeTruthy();
    expect(result).not.toBe(false);
    
    if (result !== false) {
        expect(result.data instanceof Uint8Array).toBeTruthy();
        expect(BinaryUtils.uint8ArrayToBase64(result.data)).toEqual(BinaryUtils.uint8ArrayToBase64(binaryData));
        expect(result.verified).toBeTruthy();
    }
});

test('backward compatibility: detached signature still works', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const message = 'This is a message to encrypt and sign.';
    
    // Current behavior with detached signature
    const encrypted = await encryptText(message, publicKey);
    const signature = await signText(message, privateKey);
    
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    expect(signature).toBeTruthy();
    expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');
    
    // Decrypt and verify separately
    const decrypted = await decryptText(encrypted, privateKey);
    expect(decrypted).toBeTruthy();
    expect(decrypted).toEqual(message);
    
    const isVerified = await verifyText(decrypted as string, signature, publicKey);
    expect(isVerified).toBeTruthy();
});

test('embedded signature verification fails with wrong public key', async () => {
    const { privateKey: privateKey1, publicKey: publicKey1 } = await generateKeyPair();
    const { publicKey: publicKey2 } = await generateKeyPair();
    const message = 'This is a message to encrypt and sign.';
    
    // Encrypt with embedded signature using first key pair
    const encrypted = await encryptTextWithSignature(message, publicKey1, privateKey1);
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    
    // Decrypt with automatic verification using second public key (should fail verification)
    const result = await decryptTextWithVerification(encrypted, privateKey1, publicKey2);
    expect(result).toBeTruthy();
    expect(result).not.toBe(false);
    
    if (result !== false) {
        expect(result.data).toEqual(message);
        expect(result.verified).toBeFalsy();
    }
});

test('decryptTextWithVerification handles invalid message gracefully', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const invalidMessage = 'This is not a valid PGP message';
    
    // Try to decrypt an invalid message
    const result = await decryptTextWithVerification(invalidMessage, privateKey, publicKey);
    expect(result).toBeFalsy();
});

test('decryptBinaryWithVerification handles invalid message gracefully', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const invalidMessage = 'This is not a valid PGP message';
    
    // Try to decrypt an invalid message
    const result = await decryptBinaryWithVerification(invalidMessage, privateKey, publicKey);
    expect(result).toBeFalsy();
});

test('decryptTextWithVerification handles message without signature gracefully', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const message = 'This is a plain message';
    
    // Encrypt without signature (plain encryption)
    const encrypted = await encryptText(message, publicKey);
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
    
    // Try to decrypt with verification (should work but verification should be false)
    const result = await decryptTextWithVerification(encrypted, privateKey, publicKey);
    expect(result).toBeTruthy();
    expect(result).not.toBe(false);
    
    if (result !== false) {
        expect(result.data).toEqual(message);
        expect(result.verified).toBeFalsy();
    }
});
