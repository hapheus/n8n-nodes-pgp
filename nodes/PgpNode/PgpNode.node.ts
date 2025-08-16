import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import * as openpgp from 'openpgp';
import { PrivateKey, Key } from 'openpgp';
import {
    encryptText,
    encryptBinary,
    signText,
    signBinary,
    decryptText,
    decryptBinary,
    verifyText,
    verifyBinary,
    encryptTextWithSignature,
    encryptBinaryWithSignature,
    decryptTextWithVerification,
    decryptBinaryWithVerification,
} from './utils/operations';
import { BinaryUtils } from './utils/BinaryUtils';
import { DataCompressor } from './utils/DataCompressor';

export class PgpNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'PGP',
        name: 'pgpNode',
        icon: 'file:key.svg',
        group: ['transform'],
        version: 1,
        description: 'PGP Node',
        defaults: {
            name: 'PGP',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'pgpCredentialsApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                default: 'encrypt',
                required: true,
                options: [
                    {
                        name: 'Decrypt',
                        value: 'decrypt',
                    },
                    {
                        name: 'Decrypt and Verify',
                        value: 'decrypt-and-verify',
                    },
                    {
                        name: 'Encrypt',
                        value: 'encrypt',
                    },
                    {
                        name: 'Encrypt and Sign',
                        value: 'encrypt-and-sign',
                    },
                    {
                        name: 'Sign',
                        value: 'sign',
                    },
                    {
                        name: 'Verify',
                        value: 'verify',
                    },
                ],
            },
            {
                displayName: 'Input Type',
                name: 'inputType',
                type: 'options',
                options: [
                    {
                        name: 'Text',
                        value: 'text',
                    },
                    {
                        name: 'Binary',
                        value: 'binary',
                    },
                ],
                default: 'text',
                description: 'Choose the type of input parameter',
            },
            {
                displayName: 'Compression Algorithm',
                name: 'compressionAlgorithm',
                type: 'options',
                options: [
                    {
                        name: 'Uncompressed',
                        value: 'uncompressed',
                    },
                    {
                        name: 'Zip',
                        value: 'zip',
                    },
                    {
                        name: 'Zlib',
                        value: 'zlib',
                    },
                ],
                default: 'uncompressed',
                description: 'Choose the compression algorithm',
                displayOptions: {
                    show: {
                        operation: ['encrypt', 'decrypt', 'encrypt-and-sign', 'decrypt-and-verify'],
                        inputType: ['binary'],
                    },
                },
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'string',
                default: '',
                placeholder: 'Message',
                description: 'The message text',
                displayOptions: {
                    show: {
                        inputType: ['text'],
                    },
                },
            },
            {
                displayName: 'Binary Property Name',
                name: 'binaryPropertyName',
                type: 'string',
                displayOptions: {
                    show: {
                        inputType: ['binary'],
                    },
                },
                default: 'message',
                description: 'Name of the binary property to process',
            },
            {
                displayName: 'Signature',
                name: 'signature',
                type: 'string',
                default: '',
                placeholder: '-----BEGIN PGP SIGNATURE-----',
                displayOptions: {
                    show: {
                        inputType: ['text'],
                        operation: ['verify', 'decrypt-and-verify'],
                        embeddedSignature: [false],
                    },
                },
            },
            {
                displayName: 'Binary Property Name (Signature)',
                name: 'binaryPropertyNameSignature',
                type: 'string',
                default: 'signature',
                displayOptions: {
                    show: {
                        inputType: ['binary'],
                        operation: ['verify', 'decrypt-and-verify'],
                        embeddedSignature: [false],
                    },
                },
            },
            {
                displayName: 'Embed Signature',
                name: 'embedSignature',
                type: 'boolean',
                default: false,
                description: 'Whether to embed the signature in the encrypted message',
                displayOptions: {
                    show: {
                        operation: ['encrypt-and-sign'],
                    },
                },
            },
            {
                displayName: 'Embedded Signature',
                name: 'embeddedSignature',
                type: 'boolean',
                default: false,
                description: 'Whether the message contains an embedded signature',
                displayOptions: {
                    show: {
                        operation: ['decrypt-and-verify'],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();

        let item: INodeExecutionData;
        let operation: string;
        let signature: string;
        let inputType: string;
        let message: string;
        let binaryPropertyName: string;
        let binaryPropertyNameSignature: string;
        let compressionAlgorithm: string;
        let embedSignature: boolean;
        let embeddedSignature: boolean;

        let credentials;
        let priKey: PrivateKey;
        let pubKey: Key;

        credentials = await this.getCredentials('pgpCredentialsApi');

        try {
            if (credentials.passphrase) {
                priKey = await openpgp.decryptKey({
                    privateKey: await openpgp.readPrivateKey({
                        armoredKey: (credentials.private_key as string).trim(),
                    }),
                    passphrase: credentials.passphrase as string,
                });
            } else {
                priKey = await openpgp.readPrivateKey({
                    armoredKey: (credentials.private_key as string).trim(),
                });
            }
        } catch {
            throw new NodeOperationError(this.getNode(), 'private key is not valid');
        }

        try {
            pubKey = await openpgp.readKey({
                armoredKey: (credentials.public_key as string).trim(),
            });
        } catch {
            throw new NodeOperationError(this.getNode(), 'public key is not valid');
        }

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                operation = this.getNodeParameter('operation', itemIndex) as string;
                inputType = this.getNodeParameter('inputType', itemIndex) as string;
                compressionAlgorithm = 'uncompressed';
                embedSignature = false;
                embeddedSignature = false;
                if (inputType === 'text') {
                    message = this.getNodeParameter('message', itemIndex) as string;
                    binaryPropertyName = '';
                } else {
                    message = '';
                    binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
                    if (operation === 'encrypt' || operation === 'decrypt') {
                        compressionAlgorithm = this.getNodeParameter('compressionAlgorithm', itemIndex) as string;
                    }
                }

                // Extract signature embedding options
                if (operation === 'encrypt-and-sign') {
                    embedSignature = this.getNodeParameter('embedSignature', itemIndex) as boolean;
                } else if (operation === 'decrypt-and-verify') {
                    embeddedSignature = this.getNodeParameter('embeddedSignature', itemIndex) as boolean;
                }

                item = items[itemIndex];
                if (inputType === 'text') {
                    item.binary = {};
                } else {
                    item.json = {};
                    if (!item.binary) {
                        throw new NodeOperationError(this.getNode(), 'binary is missing');
                    }

                    if (!item.binary[binaryPropertyName]) {
                        throw new NodeOperationError(this.getNode(), `binary "${binaryPropertyName}" is not defined`);
                    }
                }

                switch (operation) {
                    case 'encrypt':
                        if (inputType === 'text') {
                            item.json = {
                                encrypted: await encryptText(message, pubKey),
                            };
                        } else {
                            let binaryDataEncrypt = BinaryUtils.base64ToUint8Array(
                                item.binary[binaryPropertyName].data,
                            );
                            if (compressionAlgorithm !== 'uncompressed') {
                                binaryDataEncrypt = DataCompressor.compress(binaryDataEncrypt, compressionAlgorithm);
                            }
                            const encryptedMessage = await encryptBinary(binaryDataEncrypt, pubKey);

                            item.binary = {
                                message: {
                                    data: BinaryUtils.uint8ArrayToBase64(new TextEncoder().encode(encryptedMessage)),
                                    mimeType: 'application/pgp-encrypted',
                                    fileName: `${item.binary[binaryPropertyName].fileName}.pgp`,
                                },
                            };
                        }
                        break;
                    case 'encrypt-and-sign':
                        if (inputType === 'text') {
                            if (embedSignature) {
                                // Use embedded signature
                                item.json = {
                                    encrypted: await encryptTextWithSignature(message, pubKey, priKey),
                                };
                            } else {
                                // Use detached signature (current behavior)
                                item.json = {
                                    encrypted: await encryptText(message, pubKey),
                                    signature: await signText(message, priKey),
                                };
                            }
                        } else {
                            let binaryDataEncryptAndSign = BinaryUtils.base64ToUint8Array(
                                item.binary[binaryPropertyName].data,
                            );
                            if (embedSignature) {
                                // Use embedded signature
                                if (compressionAlgorithm !== 'uncompressed') {
                                    binaryDataEncryptAndSign = DataCompressor.compress(
                                        binaryDataEncryptAndSign,
                                        compressionAlgorithm,
                                    );
                                }
                                const encryptedMessage = await encryptBinaryWithSignature(
                                    binaryDataEncryptAndSign,
                                    pubKey,
                                    priKey,
                                );

                                item.json = {};

                                item.binary = {
                                    message: {
                                        data: BinaryUtils.uint8ArrayToBase64(
                                            new TextEncoder().encode(encryptedMessage),
                                        ),
                                        mimeType: 'application/pgp-encrypted',
                                        fileName: `${item.binary[binaryPropertyName].fileName}.pgp`,
                                    },
                                };
                            } else {
                                // Use detached signature (current behavior)
                                const signatureEncryptAndSign = await signBinary(binaryDataEncryptAndSign, priKey);
                                if (compressionAlgorithm !== 'uncompressed') {
                                    binaryDataEncryptAndSign = DataCompressor.compress(
                                        binaryDataEncryptAndSign,
                                        compressionAlgorithm,
                                    );
                                }
                                const encryptedMessage = await encryptBinary(binaryDataEncryptAndSign, pubKey);

                                item.json = {};

                                item.binary = {
                                    message: {
                                        data: BinaryUtils.uint8ArrayToBase64(
                                            new TextEncoder().encode(encryptedMessage),
                                        ),
                                        mimeType: 'application/pgp-encrypted',
                                        fileName: `${item.binary[binaryPropertyName].fileName}.pgp`,
                                    },
                                    signature: {
                                        data: btoa(signatureEncryptAndSign as string),
                                        mimeType: 'application/pgp-signature',
                                        fileExtension: 'sig',
                                        fileName: item.binary[binaryPropertyName].fileName + '.sig',
                                    },
                                };
                            }
                        }
                        break;
                    case 'decrypt':
                        if (inputType === 'text') {
                            const decrypted = await decryptText(message, priKey);
                            if (decrypted === false) {
                                throw new NodeOperationError(this.getNode(), 'Message could not be decrypted');
                            }

                            item.json = {
                                decrypted: decrypted,
                            };
                        } else {
                            const binaryDataDecrypt = atob(item.binary[binaryPropertyName].data);
                            let decryptedMessage = await decryptBinary(binaryDataDecrypt, priKey);
                            if (decryptedMessage === false) {
                                throw new NodeOperationError(this.getNode(), 'Message could not be decrypted');
                            }
                            if (compressionAlgorithm !== 'uncompressed') {
                                try {
                                    decryptedMessage = DataCompressor.uncompress(
                                        decryptedMessage,
                                        compressionAlgorithm,
                                    );
                                } catch {
                                    throw new NodeOperationError(
                                        this.getNode(),
                                        'Message could not be uncompressed. Please check your compression algorithm.',
                                    );
                                }
                            }

                            item.json = {};

                            item.binary = {
                                decrypted: {
                                    data: BinaryUtils.uint8ArrayToBase64(decryptedMessage as Uint8Array),
                                    mimeType: 'application/octet-stream',
                                    fileName: item.binary[binaryPropertyName]?.fileName?.endsWith('.pgp')
                                        ? item.binary[binaryPropertyName]?.fileName?.replace(/\.pgp$/, '')
                                        : undefined,
                                },
                            };
                        }
                        break;
                    case 'decrypt-and-verify':
                        if (inputType === 'text') {
                            if (embeddedSignature) {
                                // Handle embedded signature
                                const result = await decryptTextWithVerification(message, priKey, pubKey);
                                if (result === false) {
                                    throw new NodeOperationError(this.getNode(), 'Message could not be decrypted');
                                }

                                item.json = {
                                    decrypted: result.data,
                                    verified: result.verified,
                                };
                            } else {
                                // Handle detached signature (current behavior)
                                const decrypted = await decryptText(message, priKey);
                                if (decrypted === false) {
                                    throw new NodeOperationError(this.getNode(), 'Message could not be decrypted');
                                }

                                signature = this.getNodeParameter('signature', itemIndex) as string;
                                const isVerifiedDecryptAndVerify = await verifyText(decrypted, signature, pubKey);

                                item.json = {
                                    decrypted: decrypted,
                                    verified: isVerifiedDecryptAndVerify,
                                };
                            }
                        } else {
                            if (embeddedSignature) {
                                // Handle embedded signature
                                const binaryDataDecryptAndVerify = atob(item.binary[binaryPropertyName].data);
                                let decryptedMessageResult = await decryptBinaryWithVerification(
                                    binaryDataDecryptAndVerify,
                                    priKey,
                                    pubKey,
                                );
                                if (decryptedMessageResult === false) {
                                    throw new NodeOperationError(this.getNode(), 'Message could not be decrypted');
                                }

                                if (compressionAlgorithm !== 'uncompressed') {
                                    try {
                                        decryptedMessageResult.data = DataCompressor.uncompress(
                                            decryptedMessageResult.data,
                                            compressionAlgorithm,
                                        );
                                    } catch {
                                        throw new NodeOperationError(
                                            this.getNode(),
                                            'Message could not be uncompressed. Please check your compression algorithm.',
                                        );
                                    }
                                }

                                item.json = {
                                    verified: decryptedMessageResult.verified,
                                };

                                item.binary = {
                                    decrypted: {
                                        data: BinaryUtils.uint8ArrayToBase64(decryptedMessageResult.data),
                                        mimeType: 'application/octet-stream',
                                        fileName: item.binary[binaryPropertyName]?.fileName?.endsWith('.pgp')
                                            ? item.binary[binaryPropertyName]?.fileName?.replace(/\.pgp$/, '')
                                            : undefined,
                                    },
                                };
                            } else {
                                // Handle detached signature (current behavior)
                                const binaryDataDecryptAndVerify = atob(item.binary[binaryPropertyName].data);
                                let decryptedMessage = await decryptBinary(binaryDataDecryptAndVerify, priKey);
                                if (decryptedMessage === false) {
                                    throw new NodeOperationError(this.getNode(), 'Message could not be decrypted');
                                }

                                if (compressionAlgorithm !== 'uncompressed') {
                                    try {
                                        decryptedMessage = DataCompressor.uncompress(
                                            decryptedMessage,
                                            compressionAlgorithm,
                                        );
                                    } catch {
                                        throw new NodeOperationError(
                                            this.getNode(),
                                            'Message could not be uncompressed. Please check your compression algorithm.',
                                        );
                                    }
                                }
                                binaryPropertyNameSignature = this.getNodeParameter(
                                    'binaryPropertyNameSignature',
                                    itemIndex,
                                ) as string;
                                const binarySignatureDataDecryptAndVerify = atob(
                                    item.binary[binaryPropertyNameSignature].data,
                                );

                                const isVerifiedDecryptAndVerified = await verifyBinary(
                                    decryptedMessage,
                                    binarySignatureDataDecryptAndVerify,
                                    pubKey,
                                );

                                item.json = {
                                    verified: isVerifiedDecryptAndVerified,
                                };

                                item.binary = {
                                    decrypted: {
                                        data: BinaryUtils.uint8ArrayToBase64(decryptedMessage as Uint8Array),
                                        mimeType: 'application/octet-stream',
                                        fileName: item.binary[binaryPropertyName]?.fileName?.endsWith('.pgp')
                                            ? item.binary[binaryPropertyName]?.fileName?.replace(/\.pgp$/, '')
                                            : undefined,
                                    },
                                };
                            }
                        }
                        break;
                    case 'sign':
                        if (inputType === 'text') {
                            item.json = {
                                signature: await signText(message, priKey),
                            };
                        } else {
                            const binaryDataSign = BinaryUtils.base64ToUint8Array(item.binary[binaryPropertyName].data);
                            const signature = await signBinary(binaryDataSign, priKey);

                            item.json = {};

                            item.binary = {
                                signature: {
                                    data: btoa(signature as string),
                                    mimeType: 'application/pgp-signature',
                                    fileExtension: 'sig',
                                    fileName: item.binary[binaryPropertyName].fileName + '.sig',
                                },
                            };
                        }
                        break;
                    case 'verify':
                        if (inputType === 'text') {
                            signature = this.getNodeParameter('signature', itemIndex) as string;
                            const isVerified = await verifyText(message, signature, pubKey);

                            item.json = {
                                verified: isVerified,
                            };
                        } else {
                            binaryPropertyNameSignature = this.getNodeParameter(
                                'binaryPropertyNameSignature',
                                itemIndex,
                            ) as string;
                            const binarySignatureDataVerify = atob(item.binary[binaryPropertyNameSignature].data);
                            const binaryDataVerify = BinaryUtils.base64ToUint8Array(
                                item.binary[binaryPropertyName].data,
                            );
                            const isVerified = await verifyBinary(binaryDataVerify, binarySignatureDataVerify, pubKey);

                            item.json = {
                                verified: isVerified,
                            };
                            item.binary = {};
                        }
                        break;
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    items.push({
                        json: this.getInputData(itemIndex)[0].json,
                        error,
                        pairedItem: itemIndex,
                    });
                } else {
                    if (error.context) {
                        error.context.itemIndex = itemIndex;
                        throw error;
                    }
                    throw new NodeOperationError(this.getNode(), error, {
                        itemIndex,
                    });
                }
            }
        }

        return this.prepareOutputData(items);
    }
}
