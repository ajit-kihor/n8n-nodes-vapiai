import { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class VapiApi implements ICredentialType {
	name = 'vapiApi';
	displayName = 'Vapi API';
	documentationUrl = 'https://docs.vapi.ai/api-reference';
	authenticate = {
		type: 'generic' as const,
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: 'https://api.vapi.ai/assistant',
			qs: {
				limit: 1,
			},
		},
	};

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
