import {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PgpCredentialsApi implements ICredentialType {
	name = 'pgpCredentialsApi';
	displayName = 'PGP API';
	// @ts-ignore
	icon = 'file:key.svg';
	documentationUrl = 'https://openpgpjs.org/';
	properties: INodeProperties[] = [
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
		},
		{
			displayName: 'Public Key',
			name: 'public_key',
			type: 'string',
			typeOptions: {
				rows: 5,
			},
			default: '',
			required: false,
		},
		{
			displayName: 'Private Key',
			name: 'private_key',
			type: 'string',
			typeOptions: {
				rows: 5,
			},
			default: '',
			required: false,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
		},
	};
}
