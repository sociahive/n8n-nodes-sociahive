import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SociahiveApi implements ICredentialType {
	name = 'sociahiveApi';

	displayName = 'SociaHive API';

	icon: Icon = { light: 'file:../icons/sociahive.svg', dark: 'file:../icons/sociahive.dark.svg' };

	documentationUrl = 'https://github.com/sociahive/n8n-nodes-sociahive?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'sk_...',
			description:
				'Your SociaHive API key (starts with sk_). Create one in SociaHive under Settings, API keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://www.sociahive.com/api/v1',
			description: 'The SociaHive API base URL, without a trailing slash. Leave the default unless SociaHive support tells you otherwise.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/connected-accounts',
			method: 'GET',
		},
	};
}
