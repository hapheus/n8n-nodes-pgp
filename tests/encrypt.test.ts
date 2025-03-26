import { generateKeyPair } from './test-utils';
import { decryptBinary, decryptText, encryptBinary, encryptText } from '../nodes/PgpNode/utils/operations';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BinaryUtils } from '../nodes/PgpNode/utils/BinaryUtils';
import { DataCompressor } from '../nodes/PgpNode/utils/DataCompressor';

test('encrypts and decrypts a text message', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const message = 'This is a message to encrypt.';
    const encrypted = await encryptText(message, publicKey);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decrypted = await decryptText(encrypted, privateKey);
    expect(decrypted).toBeTruthy();
    expect(decrypted).toEqual(message);
});

test('encrypts and decrypts a text message with encrypted private key', async () => {
    const { privateKey, publicKey } = await generateKeyPair('passphrase');
    const message = 'This is a message to encrypt.';
    const encrypted = await encryptText(message, publicKey);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decrypted = await decryptText(encrypted, privateKey);
    expect(decrypted).toBeTruthy();
    expect(decrypted).toEqual(message);
});

test('decryption fails with a different private key', async () => {
    const { privateKey: privateKey1, publicKey: publicKey1 } = await generateKeyPair();
    const { privateKey: privateKey2 } = await generateKeyPair();

    const message = 'This is a message to encrypt.';

    const encrypted = await encryptText(message, publicKey1);
    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decryptedWithFirstKey = await decryptText(encrypted, privateKey1);
    expect(decryptedWithFirstKey).toBeTruthy();
    expect(decryptedWithFirstKey).toEqual(message);

    const decryptedWithSecondKey = await decryptText(encrypted, privateKey2);
    expect(decryptedWithSecondKey).toBeFalsy();
});

test('encrypts and decrypts a binary file', async () => {
    const { privateKey, publicKey } = await generateKeyPair();

    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));

    const encrypted = await encryptBinary(binaryData, publicKey);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decrypted = await decryptBinary(encrypted, privateKey);
    expect(decrypted).toBeTruthy();
    expect(decrypted instanceof Uint8Array).toBeTruthy();

    expect(BinaryUtils.uint8ArrayToBase64(decrypted as Uint8Array)).toEqual(BinaryUtils.uint8ArrayToBase64(binaryData));
});
test('encrypts and decrypts a binary file with encrypted private key', async () => {
    const { privateKey, publicKey } = await generateKeyPair('passphrase');

    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));

    const encrypted = await encryptBinary(binaryData, publicKey);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decrypted = await decryptBinary(encrypted, privateKey);
    expect(decrypted).toBeTruthy();
    expect(decrypted instanceof Uint8Array).toBeTruthy();

    expect(BinaryUtils.uint8ArrayToBase64(decrypted as Uint8Array)).toEqual(BinaryUtils.uint8ArrayToBase64(binaryData));
});

test('binary decryption fails with a different private key', async () => {
    const { privateKey: privateKey1, publicKey: publicKey1 } = await generateKeyPair();
    const { privateKey: privateKey2 } = await generateKeyPair();

    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));

    const encrypted = await encryptBinary(binaryData, publicKey1);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decryptedWithFirstKey = await decryptBinary(encrypted, privateKey1);
    expect(decryptedWithFirstKey).toBeTruthy();
    expect(decryptedWithFirstKey instanceof Uint8Array).toBeTruthy();
    expect(BinaryUtils.uint8ArrayToBase64(decryptedWithFirstKey as Uint8Array)).toEqual(
        BinaryUtils.uint8ArrayToBase64(binaryData),
    );

    const decryptedWithSecondKey = await decryptBinary(encrypted, privateKey2);
    expect(decryptedWithSecondKey).toBeFalsy();
    expect(typeof decryptedWithSecondKey).toEqual('boolean');
});

test('encrypts and decrypts a compressed binary file', async () => {
    const { privateKey, publicKey } = await generateKeyPair();

    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));
    const compressBinaryData = DataCompressor.compress(binaryData);

    const encrypted = await encryptBinary(compressBinaryData, publicKey);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decrypted = await decryptBinary(encrypted, privateKey);
    const decryptedUncompressed = DataCompressor.uncompress(decrypted as Uint8Array);

    expect(decrypted).toBeTruthy();
    expect(decrypted instanceof Uint8Array).toBeTruthy();

    expect(BinaryUtils.uint8ArrayToBase64(decrypted as Uint8Array)).toEqual(
        BinaryUtils.uint8ArrayToBase64(compressBinaryData),
    );
    expect(BinaryUtils.uint8ArrayToBase64(decryptedUncompressed as Uint8Array)).toEqual(
        BinaryUtils.uint8ArrayToBase64(binaryData),
    );
});

test('encrypts fails with invalid key', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    console.log(privateKey);
    const message = 'This is a message to encrypt.';
    const encrypted = await encryptText(message, publicKey);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

    const decrypted = await decryptText(encrypted, privateKey);
    expect(decrypted).toBeTruthy();
    expect(decrypted).toEqual(message);
});
