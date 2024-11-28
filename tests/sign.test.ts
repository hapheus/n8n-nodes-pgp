import { generateKeyPair } from './test-utils';
import { signBinary, signText, verifyBinary, verifyText } from '../nodes/PgpNode/utils/operations';
import fs from 'node:fs';
import path from 'node:path';

test('signs and verifies text message', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const message = 'This is a message to sign.';

    const signature = await signText(message, privateKey);

    expect(signature).toBeTruthy();
    expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');

    const isVerified = await verifyText(message, signature, publicKey);

    expect(isVerified).toBeTruthy();
});

test('signs and verifies text message with encrypted private key', async () => {
    const { privateKey, publicKey } = await generateKeyPair('super secret passphrase');
    const message = 'This is a message to sign.';

    const signature = await signText(message, privateKey);

    expect(signature).toBeTruthy();
    expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');

    const isVerified = await verifyText(message, signature, publicKey);

    expect(isVerified).toBeTruthy();
});

test('verify fails with a different keypair', async () => {
    const { privateKey: privateKey1, publicKey: publicKey1 } = await generateKeyPair();
    const { publicKey: publicKey2 } = await generateKeyPair();
    const message = 'This is a message to sign.';

    const signature = await signText(message, privateKey1);

    expect(signature).toBeTruthy();
    expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');

    const isVerifiedWithFirstKey = await verifyText(message, signature, publicKey1);
    expect(isVerifiedWithFirstKey).toBeTruthy();

    const isVerifiedWithSecondKey = await verifyText(message, signature, publicKey2);
    expect(isVerifiedWithSecondKey).toBeFalsy();
});

test('signs binary data', async () => {
    const { privateKey, publicKey } = await generateKeyPair();

    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));

    const signature = await signBinary(binaryData, privateKey);

    expect(signature).toBeTruthy();
    expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');

    const isVerified = await verifyBinary(binaryData, signature, publicKey);

    expect(isVerified).toBeTruthy();
});

test('verify fails with a different keypair', async () => {
    const { privateKey: privateKey1, publicKey: publicKey1 } = await generateKeyPair();
    const { publicKey: publicKey2 } = await generateKeyPair();

    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));

    const signature = await signBinary(binaryData, privateKey1);

    expect(signature).toBeTruthy();
    expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');

    const isVerifiedWithFirstKey = await verifyBinary(binaryData, signature, publicKey1);
    expect(isVerifiedWithFirstKey).toBeTruthy();

    const isVerifiedWithSecondKey = await verifyBinary(binaryData, signature, publicKey2);
    expect(isVerifiedWithSecondKey).toBeFalsy();
});
