import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class PgpCreateKeyNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PGP Create Key',
		name: 'pgpCreateKeyNode',
		icon: 'file:key.svg',
		group: ['transform'],
		version: 1,
		description: 'PGP Create Key',
		defaults: {
			name: 'PGP Create Key',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Passphrase',
				name: 'passphrase',
				type: 'string',
				default: '',
				placeholder: 'Super & Secret !',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'John Doe',
			},
			{
				displayName: 'E-Mail',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'john.doe@example.com',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const openpgp = require('openpgp');

		let item: INodeExecutionData;
		let name: string;
		let email: string;
		let passphrase: string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				item = items[itemIndex];

				name = this.getNodeParameter('name', itemIndex) as string;
				email = this.getNodeParameter('email', itemIndex) as string;
				passphrase = this.getNodeParameter('passphrase', itemIndex) as string;

				const {privateKey, publicKey, revocationCertificate} = await openpgp.generateKey({
					type: 'ecc',
					curve: 'curve25519',
					userIDs: [{name: name, email: email}],
					passphrase: passphrase,
					format: 'armored',
				});
				item.json['privateKey'] = privateKey;
				item.json['publicKey'] = publicKey;
				item.json['revocationCertificate'] = revocationCertificate;
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
