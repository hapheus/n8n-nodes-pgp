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
                        name: 'Encrypt',
                        value: 'encrypt',
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
                        operation: ['encrypt', 'decrypt'],
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
                        operation: ['verify'],
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
                        operation: ['verify'],
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

        let credentials;
        let priKey: PrivateKey;
        let pubKey: Key;
        try {
            credentials = await this.getCredentials('pgpCredentialsApi');

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

            pubKey = await openpgp.readKey({
                armoredKey: (credentials.public_key as string).trim(),
            });
        } catch (e) {
            return [];
        }

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                operation = this.getNodeParameter('operation', itemIndex) as string;
                inputType = this.getNodeParameter('inputType', itemIndex) as string;
                if (inputType === 'text') {
                    message = this.getNodeParameter('message', itemIndex) as string;
                    binaryPropertyName = '';
                    compressionAlgorithm = 'uncompressed';
                } else {
                    message = '';
                    binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
                    compressionAlgorithm = this.getNodeParameter('compressionAlgorithm', itemIndex) as string;
                }

                item = items[itemIndex];
                if (inputType === 'text') {
                    item.binary = {};
                } else {
                    item.json = {};
                    if (!item.binary) {
                        throw new NodeOperationError(this.getNode(), 'item.binary is not defined');
                    }

                    if (!item.binary[binaryPropertyName]) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `item.binary[${binaryPropertyName}] is not defined`,
                        );
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
                            const isVerified = await verifyBinary(binaryDataVerify, binarySignatureDataVerify, priKey);

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
