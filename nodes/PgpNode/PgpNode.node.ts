import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

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
						name: 'Encrypt',
						value: 'encrypt',
					},
					{
						name: 'Sign',
						value: 'sign',
					},
					{
						name: 'Decrypt',
						value: 'decrypt',
					},
					{
						name: 'Verify',
						value: 'verify',
					},
					{
						name: 'Encrypt And Sign',
						value: 'encrypt-and-sign',
					},
					{
						name: 'Verify And Decrypt',
						value: 'verify-and-decrypt',
					},
				],
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				placeholder: 'Message',
				description: 'The message text',
			},
			{
				displayName: 'Signature',
				name: 'signature',
				type: 'string',
				default: '',
				placeholder: '-----BEGIN PGP SIGNATURE-----',
				displayOptions: {
					show: {
						'/operation': ['verify', 'verify-and-decrypt'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const openpgp = require('openpgp');

		let item: INodeExecutionData;
		let operation: string;
		let message: string;
		let signature: string;

		let credentials;
		let priKey: string;
		let pubKey: string;
		try {
			credentials = await this.getCredentials('pgpCredentialsApi');
			if (credentials.passphrase) {
				priKey = await openpgp.decryptKey({
					privateKey: await openpgp.readPrivateKey({armoredKey: (credentials.private_key as string).trim()}),
					passphrase: credentials.passphrase,
				});
			} else {
				priKey = await openpgp.readPrivateKey({armoredKey: (credentials.private_key as string).trim()});
			}

			pubKey = await openpgp.readKey({armoredKey: (credentials.public_key as string).trim()});
		} catch (e) {
			return [];
		}


		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				operation = this.getNodeParameter('operation', itemIndex) as string;
				message = this.getNodeParameter('message', itemIndex) as string;

				item = items[itemIndex];

				switch (operation) {
					case 'encrypt':
						item.json = {
							encrypted: await openpgp.encrypt({
								message: await openpgp.createMessage({text: message}),
								encryptionKeys: pubKey,
							}),
						};
						break;
					case 'encrypt-and-sign':
						item.json = {
							encrypted: await openpgp.encrypt({
								message: await openpgp.createMessage({text: message}),
								encryptionKeys: pubKey,
							}),
							signature: await openpgp.sign({
								message: await openpgp.createMessage({text: message}),
								signingKeys: priKey,
								detached: true,
							}),
						};
						break;
					case 'decrypt':
						item.json = {
							decrypted: (await openpgp.decrypt({
								message: await openpgp.readMessage({armoredMessage: message}),
								decryptionKeys: priKey
							})).data,
						};
						break;
					case 'sign':
						item.json = {
							signature: await openpgp.sign({
								message: await openpgp.createMessage({text: message}),
								signingKeys: priKey,
								detached: true,
							}),
						};
						break;
					case 'verify':
						signature = this.getNodeParameter('signature', itemIndex) as string;
						const verification = await openpgp.verify({
							message: await openpgp.createMessage({text: message}),
							signature: await openpgp.readSignature({armoredSignature: signature}),
							verificationKeys: pubKey,
						});
						const {verified} = verification.signatures[0];
						let isVerified: boolean;
						try {
							await verified;
							isVerified = true;
						} catch (e) {
							isVerified = false;
						}

						item.json = {
							verified: isVerified,
						};

						break;
					case 'verify-and-decrypt':
						signature = this.getNodeParameter('signature', itemIndex) as string;
						const verification2 = await openpgp.verify({
							message: await openpgp.createMessage({text: message}),
							signature: await openpgp.readSignature({armoredSignature: signature}),
							verificationKeys: pubKey,
						});
						const {verified2} = verification2.signatures[0];
						let isVerified2: boolean;
						try {
							await verified2;
							isVerified2 = true;
						} catch (e) {
							isVerified2 = false;
						}

						item.json = {
							verified: isVerified2,
							decrypted: (await openpgp.decrypt({
								message: await openpgp.readMessage({armoredMessage: message}),
								decryptionKeys: priKey
							})).data,
						};
						break;
				}
			} catch (error) {
				if (this.continueOnFail()) {
					items.push({json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex});
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
