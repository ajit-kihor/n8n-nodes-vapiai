import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class VapiApi implements ICredentialType {
	name = 'vapiApi';
	displayName = 'Vapi API';
	documentationUrl = 'https://docs.vapi.ai/api-reference';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Vapi API key from dashboard (used as Bearer token)',
		},
	];
}
