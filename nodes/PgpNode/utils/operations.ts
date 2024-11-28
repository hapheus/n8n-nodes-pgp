import * as openpgp from 'openpgp';
import { Key, PrivateKey } from 'openpgp';

export async function encryptText(message: string, publicKey: Key): Promise<string> {
    return (await openpgp.encrypt({
        message: await openpgp.createMessage({ text: message }),
        encryptionKeys: publicKey,
        format: 'armored',
    })) as string;
}

export async function encryptBinary(data: Uint8Array, publicKey: Key): Promise<string> {
    return (await openpgp.encrypt({
        message: await openpgp.createMessage({ binary: data }),
        encryptionKeys: publicKey,
        format: 'armored',
    })) as string;
}

export async function decryptText(message: string, privateKey: PrivateKey): Promise<string | false> {
    try {
        const decrypted = await openpgp.decrypt({
            message: await openpgp.readMessage({ armoredMessage: message }),
            decryptionKeys: privateKey,
            format: 'utf8',
        });

        return decrypted.data as string;
    } catch {}

    return false;
}

export async function decryptBinary(message: string, privateKey: PrivateKey): Promise<Uint8Array | false> {
    try {
        const decrypted = await openpgp.decrypt({
            message: await openpgp.readMessage({ armoredMessage: message }),
            decryptionKeys: privateKey,
            format: 'binary',
        });

        return decrypted.data as Uint8Array;
    } catch {}

    return false;
}

export async function signText(message: string, privateKey: PrivateKey): Promise<string> {
    const pgpSignature = await openpgp.sign({
        message: await openpgp.createMessage({ text: message }),
        signingKeys: privateKey,
        detached: true,
    });

    return pgpSignature as string;
}

export async function signBinary(binaryData: Uint8Array, privateKey: PrivateKey): Promise<string> {
    const signature = await openpgp.sign({
        message: await openpgp.createMessage({ binary: binaryData }),
        signingKeys: privateKey,
        detached: true,
        format: 'armored',
    });

    return signature as string;
}

export async function verifyText(message: string, armoredSignature: string, publicKey: Key): Promise<boolean> {
    const verification = await openpgp.verify({
        message: await openpgp.createMessage({ text: message }),
        signature: await openpgp.readSignature({ armoredSignature: armoredSignature }),
        verificationKeys: publicKey,
    });
    const { verified } = verification.signatures[0];
    try {
        await verified;
        return true;
    } catch {
        return false;
    }
}

export async function verifyBinary(binaryData: Uint8Array, signature: string, publicKey: Key): Promise<boolean> {
    const verification = await openpgp.verify({
        message: await openpgp.createMessage({ binary: binaryData }),
        signature: await openpgp.readSignature({ armoredSignature: signature }),
        verificationKeys: publicKey,
    });

    const { verified } = verification.signatures[0];
    try {
        await verified;
        return true;
    } catch {
        return false;
    }
}
