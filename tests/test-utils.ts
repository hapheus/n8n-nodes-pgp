import * as openpgp from 'openpgp';

export async function generateKeyPair(passphrase: string | undefined = undefined) {
    const { privateKey, publicKey } = await openpgp.generateKey({
        userIDs: [{ name: 'Test User', email: 'test@example.test' }],
        curve: 'ed25519',
        passphrase: passphrase,
    });

    const pgpPrivateKey = passphrase
        ? await openpgp.decryptKey({
              privateKey: await openpgp.readPrivateKey({
                  armoredKey: (privateKey as string).trim(),
              }),
              passphrase: passphrase,
          })
        : await openpgp.readPrivateKey({
              armoredKey: (privateKey as string).trim(),
          });

    const pgpPublicKey = await openpgp.readKey({
        armoredKey: (publicKey as string).trim(),
    });

    return { privateKey: pgpPrivateKey, publicKey: pgpPublicKey };
}
