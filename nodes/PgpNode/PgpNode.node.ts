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
						name: 'Decrypt',
						value: 'decrypt',
					},
					{
						name: 'Sign',
						value: 'sign',
					},
					{
						name: 'Verify',
						value: 'verify',
					}
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
						'/operation': ['verify'],
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
						const encryptResult = await openpgp.encrypt({
							message: await openpgp.createMessage({text: message}),
							encryptionKeys: pubKey,
						});

						item.json = {
							encrypted: encryptResult,
						};
						break;
					case 'decrypt':
						const decryptResult = (await openpgp.decrypt({
							message: await openpgp.readMessage({armoredMessage: message}),
							decryptionKeys: priKey
						})).data;

						item.json = {
							decrypted: decryptResult,
						};
						break;
					case 'sign':
						const signResult = await openpgp.sign({
							message: await openpgp.createMessage({text: message}),
							signingKeys: priKey,
							detached: true,
						});

						item.json = {
							signature: signResult,
						};
						break;
					case 'verify':
						signature = this.getNodeParameter('signature', itemIndex) as string;
						const verification = await openpgp.verify({
							message: await openpgp.createMessage({text: message}),
							signature: await openpgp.readSignature({armoredSignature: signature}),
							verificationKeys: pubKey,
						});
						const { verified } = verification.signatures[0];
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
