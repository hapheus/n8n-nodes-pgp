import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

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
					displayName: 'Key Method',
					name: 'keyMethod',
					type: 'options',
					options: [
						{
							name: 'Manual',
							value: 'manual',
						},
						{
							name: 'Server',
							value: 'server',
						}
					],
					default: 'manual',
				},
        {
            displayName: 'Public Key',
            name: 'public_key',
            type: 'string',
            // eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
            typeOptions: {
                rows: 5,
            },
            default: '',
            required: false,
						displayOptions:	{
							show: {
								keyMethod: [
									'manual'
								]
							}
						}
        },
        {
            displayName: 'Private Key',
            name: 'private_key',
            type: 'string',
            // eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
            typeOptions: {
                rows: 5,
            },
            default: '',
            required: false,
						displayOptions:	{
							show: {
								keyMethod: [
									'manual'
								]
							}
						}
        },
				{
					displayName: 'Public Key',
					name: 'publicKeyFile',
					// eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
					type: 'string',
					default: '',
					description: 'Point to where you\'re public key is stored',
					displayOptions: {
						show: {
								keyMethod: [
									'server'
								]
							}
					},
				},
				{
					displayName: 'Private Key',
					name: 'privateKeyFile',
					// eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
					type: 'string',
					default: '',
					description: 'Point to where you\'re private key is stored',
					displayOptions: {
						show: {
								keyMethod: [
									'server'
								]
							}
					},
				},
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {},
    };
}
