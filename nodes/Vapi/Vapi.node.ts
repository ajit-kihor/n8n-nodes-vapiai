import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

interface RequestShape {
	method: HttpMethod;
	endpoint: string;
	qs?: IDataObject;
	body?: IDataObject;
	formData?: IDataObject;
	isMultipart?: boolean;
}

const API_BASE_URL = 'https://api.vapi.ai';

const DATE_FILTERS: INodeProperties[] = [
	{ displayName: 'Created After', name: 'createdAtGt', type: 'dateTime', default: '' },
	{ displayName: 'Created Before', name: 'createdAtLt', type: 'dateTime', default: '' },
	{ displayName: 'Created At or After', name: 'createdAtGe', type: 'dateTime', default: '' },
	{ displayName: 'Created At or Before', name: 'createdAtLe', type: 'dateTime', default: '' },
	{ displayName: 'Updated After', name: 'updatedAtGt', type: 'dateTime', default: '' },
	{ displayName: 'Updated Before', name: 'updatedAtLt', type: 'dateTime', default: '' },
	{ displayName: 'Updated At or After', name: 'updatedAtGe', type: 'dateTime', default: '' },
	{ displayName: 'Updated At or Before', name: 'updatedAtLe', type: 'dateTime', default: '' },
];

const listLimit: INodeProperties = {
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	typeOptions: { minValue: 1, maxValue: 1000 },
	default: 100,
	description: 'Maximum number of results to return. Vapi defaults to 100.',
};

const rawBodyField: INodeProperties = {
	displayName: 'Advanced Raw Body (JSON)',
	name: 'rawBody',
	type: 'json',
	default: '',
	description: 'Additional JSON merged after structured fields. Top-level keys in this JSON override structured values.',
};

const providerOptions = [
	{ name: 'BYO Phone Number', value: 'byo-phone-number' },
	{ name: 'Telnyx', value: 'telnyx' },
	{ name: 'Twilio', value: 'twilio' },
	{ name: 'Vapi', value: 'vapi' },
	{ name: 'Vonage', value: 'vonage' },
];

const toolTypeOptions = [
	{ name: 'Function', value: 'function' },
	{ name: 'API Request / Webhook', value: 'apiRequest' },
	{ name: 'Code', value: 'code' },
	{ name: 'Transfer Call', value: 'transferCall' },
	{ name: 'End Call', value: 'endCall' },
	{ name: 'DTMF', value: 'dtmf' },
	{ name: 'Handoff', value: 'handoff' },
	{ name: 'Query', value: 'query' },
	{ name: 'MCP', value: 'mcp' },
	{ name: 'Voicemail', value: 'voicemail' },
	{ name: 'Slack Send Message', value: 'slack.message.send' },
	{ name: 'SMS', value: 'sms' },
	{ name: 'GoHighLevel Calendar Availability', value: 'gohighlevel.calendar.availability.check' },
	{ name: 'GoHighLevel Calendar Event Create', value: 'gohighlevel.calendar.event.create' },
	{ name: 'GoHighLevel Contact Create', value: 'gohighlevel.contact.create' },
	{ name: 'GoHighLevel Contact Get', value: 'gohighlevel.contact.get' },
	{ name: 'Google Calendar Create Event', value: 'google.calendar.event.create' },
	{ name: 'Google Calendar Check Availability', value: 'google.calendar.availability.check' },
	{ name: 'Google Sheets Row Append', value: 'google.sheets.row.append' },
	{ name: 'SIP Request', value: 'sipRequest' },
	{ name: 'Bash', value: 'bash' },
	{ name: 'Computer', value: 'computer' },
	{ name: 'Text Editor', value: 'textEditor' },
	{ name: 'Custom / Raw Body Only', value: 'custom' },
];

export class Vapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vapi',
		name: 'vapi',
		icon: 'file:vapi-icon.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with the Vapi voice AI platform',
		defaults: {
			name: 'Vapi',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'vapiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Assistant', value: 'assistant' },
					{ name: 'Call', value: 'call' },
					{ name: 'File', value: 'file' },
					{ name: 'Phone Number', value: 'phoneNumber' },
					{ name: 'Squad', value: 'squad' },
					{ name: 'Tool', value: 'tool' },
				],
				default: 'call',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['call'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create an outbound call or batch of calls', action: 'Create a call' },
					{ name: 'Delete Data', value: 'deleteData', description: 'Delete call data for retention or compliance', action: 'Delete call data' },
					{ name: 'End', value: 'end', description: 'End an active call', action: 'End a call' },
					{ name: 'Get', value: 'get', description: 'Retrieve a call by ID', action: 'Get a call' },
					{ name: 'List', value: 'list', description: 'List and filter calls', action: 'List calls' },
					{ name: 'Update', value: 'update', description: 'Update mutable call fields', action: 'Update a call' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['assistant'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create an assistant', action: 'Create an assistant' },
					{ name: 'Delete', value: 'delete', description: 'Delete an assistant', action: 'Delete an assistant' },
					{ name: 'Get', value: 'get', description: 'Retrieve an assistant', action: 'Get an assistant' },
					{ name: 'List', value: 'list', description: 'List assistants', action: 'List assistants' },
					{ name: 'Update', value: 'update', description: 'Update an assistant', action: 'Update an assistant' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['phoneNumber'] } },
				options: [
					{ name: 'Buy', value: 'buy', description: 'Provision or import a phone number', action: 'Buy a phone number' },
					{ name: 'Delete', value: 'delete', description: 'Release or delete a phone number', action: 'Delete a phone number' },
					{ name: 'Get', value: 'get', description: 'Get a phone number', action: 'Get a phone number' },
					{ name: 'List', value: 'list', description: 'List phone numbers', action: 'List phone numbers' },
					{ name: 'Update', value: 'update', description: 'Update routing, assistant, provider, or webhook settings', action: 'Update a phone number' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['squad'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a squad', action: 'Create a squad' },
					{ name: 'Delete', value: 'delete', description: 'Delete a squad', action: 'Delete a squad' },
					{ name: 'Get', value: 'get', description: 'Retrieve a squad', action: 'Get a squad' },
					{ name: 'List', value: 'list', description: 'List squads', action: 'List squads' },
					{ name: 'Update', value: 'update', description: 'Update a squad', action: 'Update a squad' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['tool'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a tool', action: 'Create a tool' },
					{ name: 'Delete', value: 'delete', description: 'Delete a tool', action: 'Delete a tool' },
					{ name: 'Get', value: 'get', description: 'Get a tool by ID', action: 'Get a tool' },
					{ name: 'List', value: 'list', description: 'List tools', action: 'List tools' },
					{ name: 'Update', value: 'update', description: 'Update a tool', action: 'Update a tool' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['file'] } },
				options: [
					{ name: 'Upload / Create', value: 'create', description: 'Upload a file for knowledge bases and assistant artifacts', action: 'Upload a file' },
					{ name: 'Delete', value: 'delete', description: 'Delete a file', action: 'Delete a file' },
					{ name: 'Get', value: 'get', description: 'Get a file by ID', action: 'Get a file' },
					{ name: 'List', value: 'list', description: 'List files', action: 'List files' },
					{ name: 'Update', value: 'update', description: 'Update mutable file fields', action: 'Update a file' },
				],
				default: 'list',
			},

			...callProperties(),
			...assistantProperties(),
			...phoneNumberProperties(),
			...squadProperties(),
			...toolProperties(),
			...fileProperties(),
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			try {
				let request: RequestShape;

				// Current support summary:
				// Calls: create/get/list/end plus update and delete-data. Create uses structured fields,
				// then merges Advanced Raw Body after those fields. Existing Raw Body-only workflows still work.
				// Assistants: create/get/list/update/delete with monitorPlan, analysisPlan, artifactPlan, hooks,
				// server and metadata JSON fields. Squads, Tools, Phone Numbers and Files follow the same
				// structured-plus-Raw-Body pattern so newly released Vapi fields can be sent without code changes.
				if (resource === 'call') {
					request = buildCallRequest.call(this, i, operation);
				} else if (resource === 'assistant') {
					request = buildAssistantRequest.call(this, i, operation);
				} else if (resource === 'phoneNumber') {
					request = buildPhoneNumberRequest.call(this, i, operation);
				} else if (resource === 'squad') {
					request = buildSquadRequest.call(this, i, operation);
				} else if (resource === 'tool') {
					request = buildToolRequest.call(this, i, operation);
				} else if (resource === 'file') {
					request = await buildFileRequest.call(this, i, operation, items[i]);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				const headers: IDataObject = {
					Accept: 'application/json',
				};

				if (!request.isMultipart) {
					headers['Content-Type'] = 'application/json';
				}

				const requestOptions: IHttpRequestOptions = {
					method: request.method,
					url: `${API_BASE_URL}${request.endpoint}`,
					headers,
					qs: request.qs ?? {},
					json: !request.isMultipart,
				};

				if (request.formData) {
					(requestOptions as IHttpRequestOptions & { formData?: IDataObject }).formData = request.formData;
				} else if (request.body !== undefined && Object.keys(request.body).length > 0) {
					requestOptions.body = request.body;
				}

				const responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'vapiApi', requestOptions);
				pushResponse(returnData, responseData);
			} catch (error) {
				const errorDetails = formatVapiError(error);
				if (this.continueOnFail()) {
					returnData.push({ json: errorDetails, pairedItem: i });
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return this.prepareOutputData(returnData);
	}
}

function callProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Assistant ID',
			name: 'assistantId',
			type: 'string',
			default: '',
			displayOptions: { show: { resource: ['call'], operation: ['create'] } },
			description: 'Assistant to use for this outbound call. Leave empty when using Squad ID, Workflow ID, Assistant JSON, Squad JSON, or Workflow JSON.',
		},
		{
			displayName: 'Phone Number ID',
			name: 'phoneNumberId',
			type: 'string',
			default: '',
			displayOptions: { show: { resource: ['call'], operation: ['create'] } },
			description: 'Vapi phone number ID to call from. For transient numbers, use Raw Body with phoneNumber.',
		},
		{
			displayName: 'Customer Number',
			name: 'customerNumber',
			type: 'string',
			default: '',
			placeholder: '+11234567890',
			displayOptions: { show: { resource: ['call'], operation: ['create'] } },
			description: 'Single customer phone number in E.164 format. For batch outbound calls, use Customers JSON.',
		},
		{
			displayName: 'Schedule Plan',
			name: 'schedulePlan',
			type: 'fixedCollection',
			placeholder: 'Add schedule plan',
			displayOptions: { show: { resource: ['call'], operation: ['create'] } },
			default: {},
			options: [
				{
					displayName: 'Fields',
					name: 'fields',
					values: [
						{
							displayName: 'Earliest At',
							name: 'earliestAt',
							type: 'dateTime',
							default: '',
							description: 'Earliest time to initiate the call as an ISO 8601 date-time.',
						},
					],
				},
			],
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['call'], operation: ['create'] } },
			options: [
				{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Optional call name for your own reference.' },
				{ displayName: 'Assistant (JSON)', name: 'assistant', type: 'json', default: '', description: 'Transient assistant object for this call.' },
				{ displayName: 'Assistant Overrides (JSON)', name: 'assistantOverrides', type: 'json', default: '', description: 'Assistant-level overrides for this call.' },
				{ displayName: 'Customer (JSON)', name: 'customer', type: 'json', default: '', description: 'Full customer object. Overrides Customer Number when set.' },
				{ displayName: 'Customers (JSON Array)', name: 'customers', type: 'json', default: '', description: 'Array of customer objects for batch outbound calls.' },
				{ displayName: 'Phone Number (JSON)', name: 'phoneNumber', type: 'json', default: '', description: 'Transient phone number object.' },
				{ displayName: 'Squad ID', name: 'squadId', type: 'string', default: '', description: 'Squad to use instead of a single assistant.' },
				{ displayName: 'Squad (JSON)', name: 'squad', type: 'json', default: '', description: 'Transient squad object for this call.' },
				{ displayName: 'Squad Overrides (JSON)', name: 'squadOverrides', type: 'json', default: '', description: 'Squad-level overrides for this call.' },
				{ displayName: 'Workflow ID', name: 'workflowId', type: 'string', default: '', description: 'Workflow to use for this call.' },
				{ displayName: 'Workflow (JSON)', name: 'workflow', type: 'json', default: '', description: 'Transient workflow object for this call.' },
				{ displayName: 'Workflow Overrides (JSON)', name: 'workflowOverrides', type: 'json', default: '', description: 'Workflow-level overrides for this call.' },
				rawBodyField,
			],
		},
		idField('Call ID', 'id', ['call'], ['get', 'end', 'update', 'deleteData']),
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['call'], operation: ['update'] } },
			options: [
				{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Mutable call name supported by the current Vapi OpenAPI schema.' },
				{ displayName: 'Assistant ID', name: 'assistantId', type: 'string', default: '', description: 'Advanced routing field. Include only if supported by your Vapi account/API version.' },
				{ displayName: 'Squad ID', name: 'squadId', type: 'string', default: '', description: 'Advanced routing field. Include only if supported by your Vapi account/API version.' },
				{ displayName: 'Workflow ID', name: 'workflowId', type: 'string', default: '', description: 'Advanced routing field. Include only if supported by your Vapi account/API version.' },
				{ displayName: 'Assistant Overrides (JSON)', name: 'assistantOverrides', type: 'json', default: '' },
				{ displayName: 'Squad Overrides (JSON)', name: 'squadOverrides', type: 'json', default: '' },
				{ displayName: 'Workflow Overrides (JSON)', name: 'workflowOverrides', type: 'json', default: '' },
				rawBodyField,
			],
		},
		{
			displayName: 'Delete Data Fields',
			name: 'deleteDataFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['call'], operation: ['deleteData'] } },
			options: [
				{
					displayName: 'Call IDs (JSON Array)',
					name: 'ids',
					type: 'json',
					default: '',
					description: 'Optional bulk call IDs array. If omitted, this operation sends the Call ID above.',
				},
				rawBodyField,
			],
		},
		{
			...listLimit,
			displayOptions: { show: { resource: ['call'], operation: ['list'] } },
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add filter',
			default: {},
			displayOptions: { show: { resource: ['call'], operation: ['list'] } },
			options: [
				{ displayName: 'Call ID', name: 'id', type: 'string', default: '' },
				{ displayName: 'Assistant ID', name: 'assistantId', type: 'string', default: '' },
				{ displayName: 'Phone Number ID', name: 'phoneNumberId', type: 'string', default: '' },
				...DATE_FILTERS,
			],
		},
	];
}

function assistantProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			required: true,
			displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
			description: 'Name of the assistant.',
		},
		{
			displayName: 'First Message',
			name: 'firstMessage',
			type: 'string',
			default: '',
			displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
			description: 'Opening message the assistant speaks at the start of the call.',
		},
		{
			displayName: 'Model (JSON)',
			name: 'model',
			type: 'json',
			default: '{"provider":"openai","model":"gpt-4o","temperature":0.7}',
			displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
			description: 'LLM model configuration object.',
		},
		{
			displayName: 'Voice (JSON)',
			name: 'voice',
			type: 'json',
			default: '{"provider":"11labs","voiceId":"rachel"}',
			displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
			description: 'Voice provider configuration object.',
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
			options: assistantAdvancedFields(),
		},
		idField('Assistant ID', 'id', ['assistant'], ['get', 'delete', 'update']),
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['assistant'], operation: ['update'] } },
			options: [
				{ displayName: 'Name', name: 'name', type: 'string', default: '' },
				{ displayName: 'First Message', name: 'firstMessage', type: 'string', default: '' },
				{ displayName: 'Max Duration (Seconds)', name: 'maxDurationSeconds', type: 'number', default: 600 },
				{ displayName: 'Model (JSON)', name: 'model', type: 'json', default: '' },
				{ displayName: 'Voice (JSON)', name: 'voice', type: 'json', default: '' },
				...assistantAdvancedFields(),
			],
		},
		{
			...listLimit,
			displayOptions: { show: { resource: ['assistant'], operation: ['list'] } },
		},
		filterCollection(['assistant']),
	];
}

function assistantAdvancedFields(): INodeProperties[] {
	return [
		{
			displayName: 'First Message Mode',
			name: 'firstMessageMode',
			type: 'options',
			options: [
				{ name: 'Assistant Speaks First', value: 'assistant-speaks-first' },
				{ name: 'Assistant Waits for User', value: 'assistant-waits-for-user' },
			],
			default: 'assistant-speaks-first',
		},
		{ displayName: 'Max Duration (Seconds)', name: 'maxDurationSeconds', type: 'number', default: 600 },
		{
			displayName: 'Background Sound',
			name: 'backgroundSound',
			type: 'options',
			options: [
				{ name: 'None', value: 'off' },
				{ name: 'Office', value: 'office' },
			],
			default: 'off',
		},
		{ displayName: 'Analysis Plan (JSON)', name: 'analysisPlan', type: 'json', default: '', description: 'Analysis configuration such as summary, structured data, and success evaluation plans.' },
		{ displayName: 'Artifact Plan (JSON)', name: 'artifactPlan', type: 'json', default: '', description: 'Artifact generation configuration such as recordings, transcripts, and logs.' },
		{ displayName: 'Hooks (JSON Array)', name: 'hooks', type: 'json', default: '', description: 'Assistant hooks array, including speech, elapsed-time, SIP, DTMF, and other current Vapi hook types.' },
		{ displayName: 'Metadata (JSON)', name: 'metadata', type: 'json', default: '', description: 'Custom metadata object.' },
		{ displayName: 'Monitor Plan (JSON)', name: 'monitorPlan', type: 'json', default: '', description: 'Monitoring configuration for live call monitoring and issue detection.' },
		{ displayName: 'Observability Plan (JSON)', name: 'observabilityPlan', type: 'json', default: '', description: 'Observability and scorecard-related configuration.' },
		{ displayName: 'Server (JSON)', name: 'server', type: 'json', default: '', description: 'Webhook server object for assistant-level server messages.' },
		rawBodyField,
	];
}

function phoneNumberProperties(): INodeProperties[] {
	return [
		idField('Phone Number ID', 'id', ['phoneNumber'], ['get', 'delete', 'update']),
		{
			displayName: 'Buy Fields (JSON)',
			name: 'buyFields',
			type: 'json',
			default: '{"provider":"twilio","areaCode":"415"}',
			required: true,
			displayOptions: { show: { resource: ['phoneNumber'], operation: ['buy'] } },
			description: 'Phone number provisioning/import options. Supports Vapi-native, Twilio, Telnyx, Vonage, and BYO provider fields.',
		},
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['phoneNumber'], operation: ['update'] } },
			options: [
				{ displayName: 'Provider', name: 'provider', type: 'options', options: providerOptions, default: 'twilio', description: 'Phone number provider shape to update.' },
				{ displayName: 'Name', name: 'name', type: 'string', default: '' },
				{ displayName: 'Assistant ID', name: 'assistantId', type: 'string', default: '', description: 'Assistant to attach for inbound calls.' },
				{ displayName: 'Squad ID', name: 'squadId', type: 'string', default: '', description: 'Squad to attach for inbound calls.' },
				{ displayName: 'Workflow ID', name: 'workflowId', type: 'string', default: '', description: 'Workflow to attach for inbound calls.' },
				{ displayName: 'Server URL', name: 'serverUrl', type: 'string', default: '', placeholder: 'https://example.com/vapi-webhook', description: 'Webhook target for inbound call server messages.' },
				{ displayName: 'Server Timeout Seconds', name: 'serverTimeoutSeconds', type: 'number', default: 20 },
				{ displayName: 'Server Secret', name: 'serverSecret', type: 'string', typeOptions: { password: true }, default: '', description: 'Secret value your server can validate.' },
				{ displayName: 'Server Headers (JSON)', name: 'serverHeaders', type: 'json', default: '', description: 'Headers object Vapi should send to the webhook server.' },
				{ displayName: 'Fallback Destination (JSON)', name: 'fallbackDestination', type: 'json', default: '' },
				{ displayName: 'Hooks (JSON Array)', name: 'hooks', type: 'json', default: '' },
				rawBodyField,
			],
		},
		{
			...listLimit,
			displayOptions: { show: { resource: ['phoneNumber'], operation: ['list'] } },
		},
		filterCollection(['phoneNumber']),
	];
}

function squadProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			displayOptions: { show: { resource: ['squad'], operation: ['create'] } },
			description: 'Optional squad name.',
		},
		{
			displayName: 'Members (JSON Array)',
			name: 'members',
			type: 'json',
			default: '[{"assistantId":"assistant-id"}]',
			required: true,
			displayOptions: { show: { resource: ['squad'], operation: ['create'] } },
			description: 'Array of squad member objects. Each member commonly includes assistantId and optional assistantOverrides.',
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['squad'], operation: ['create'] } },
			options: [
				{ displayName: 'Members Overrides (JSON)', name: 'membersOverrides', type: 'json', default: '', description: 'Overrides shared across squad members.' },
				rawBodyField,
			],
		},
		idField('Squad ID', 'id', ['squad'], ['get', 'delete', 'update']),
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['squad'], operation: ['update'] } },
			options: [
				{ displayName: 'Name', name: 'name', type: 'string', default: '' },
				{ displayName: 'Members (JSON Array)', name: 'members', type: 'json', default: '' },
				{ displayName: 'Members Overrides (JSON)', name: 'membersOverrides', type: 'json', default: '' },
				{ displayName: 'Squad Overrides (JSON)', name: 'squadOverrides', type: 'json', default: '', description: 'Convenience field merged into the request for advanced squad routing.' },
				rawBodyField,
			],
		},
		{
			...listLimit,
			displayOptions: { show: { resource: ['squad'], operation: ['list'] } },
		},
		filterCollection(['squad']),
	];
}

function toolProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Tool Type',
			name: 'toolType',
			type: 'options',
			options: toolTypeOptions,
			default: 'function',
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'] } },
			description: 'Current Vapi tool type. Use Raw Body for newly released or provider-specific shapes.',
		},
		{
			displayName: 'Tool ID',
			name: 'id',
			type: 'string',
			default: '',
			required: true,
			displayOptions: { show: { resource: ['tool'], operation: ['get', 'delete', 'update'] } },
			description: 'ID of the tool.',
		},
		{
			displayName: 'Function Definition (JSON)',
			name: 'functionDefinition',
			type: 'json',
			default: '{"name":"get_weather","description":"Get current weather for a location","parameters":{"type":"object","properties":{"location":{"type":"string","description":"City name"}},"required":["location"]}}',
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'], toolType: ['function', 'code'] } },
			description: 'Function schema using JSON Schema semantics.',
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: '',
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'], toolType: ['function'] } },
			description: 'Webhook server URL for tool-calls messages.',
		},
		{
			displayName: 'HTTP Method',
			name: 'apiRequestMethod',
			type: 'options',
			options: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'].map((value) => ({ name: value, value })),
			default: 'POST',
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'], toolType: ['apiRequest'] } },
			description: 'HTTP method used by the API request tool.',
		},
		{
			displayName: 'Request URL',
			name: 'apiRequestUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://api.example.com/resource',
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'], toolType: ['apiRequest'] } },
			description: 'URL called by the API request tool.',
		},
		{
			displayName: 'Code (TypeScript)',
			name: 'code',
			type: 'string',
			typeOptions: { rows: 12 },
			default: 'export default async function handler(args: unknown) {\n\treturn { ok: true, args };\n}',
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'], toolType: ['code'] } },
			description: 'TypeScript code to execute on Vapi infrastructure.',
		},
		{
			displayName: 'Timeout Seconds',
			name: 'timeoutSeconds',
			type: 'number',
			default: 10,
			typeOptions: { minValue: 1, maxValue: 30 },
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'], toolType: ['code'] } },
		},
		{
			displayName: 'Integration Fields',
			name: 'integrationFields',
			type: 'collection',
			placeholder: 'Add integration field',
			default: {},
			displayOptions: {
				show: {
					resource: ['tool'],
					operation: ['create', 'update'],
					toolType: [
						'gohighlevel.calendarAvailability',
						'gohighlevel.calendarEventCreate',
						'gohighlevel.contactCreate',
						'gohighlevel.contactGet',
						'google.calendar.createEvent',
						'google.calendar.checkAvailability',
						'google.sheets.rowAppend',
						'slack.sendMessage',
						'gohighlevel.calendar.availability.check',
						'gohighlevel.calendar.event.create',
						'gohighlevel.contact.create',
						'gohighlevel.contact.get',
						'google.calendar.event.create',
						'google.calendar.availability.check',
						'google.sheets.row.append',
						'slack.message.send',
					],
				},
			},
			options: [
				{ displayName: 'Credential ID', name: 'credentialId', type: 'string', default: '' },
				{ displayName: 'External Scenario/Workflow ID', name: 'externalWorkflowId', type: 'string', default: '', description: 'Make scenario ID, GHL workflow ID, or similar external workflow identifier when used by the integration.' },
				{ displayName: 'Calendar ID', name: 'calendarId', type: 'string', default: '' },
				{ displayName: 'Location ID', name: 'locationId', type: 'string', default: '' },
				{ displayName: 'Spreadsheet ID', name: 'spreadsheetId', type: 'string', default: '' },
				{ displayName: 'Sheet Name', name: 'sheetName', type: 'string', default: '' },
				{ displayName: 'Slack Channel ID', name: 'channelId', type: 'string', default: '' },
			],
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['tool'], operation: ['create', 'update'] } },
			options: [
				{ displayName: 'Async', name: 'async', type: 'boolean', default: false },
				{ displayName: 'Body Schema (JSON)', name: 'body', type: 'json', default: '', description: 'JSON Schema for the API request body' },
				{ displayName: 'Description', name: 'description', type: 'string', default: '', description: 'Description that tells the model when to use this tool' },
				{ displayName: 'Headers Schema (JSON)', name: 'headers', type: 'json', default: '', description: 'JSON Schema describing headers sent by the API request tool' },
				{ displayName: 'Messages (JSON Array)', name: 'messages', type: 'json', default: '' },
				{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Tool name passed to the model' },
				{ displayName: 'Parameters (JSON Array)', name: 'parameters', type: 'json', default: '' },
				{ displayName: 'Raw Body (JSON)', name: 'rawBody', type: 'json', default: '', description: 'Full or partial tool JSON. Top-level keys override structured tool fields.' },
				{ displayName: 'Server (JSON)', name: 'server', type: 'json', default: '', description: 'Full server object. Overrides Server URL.' },
			],
		},
		{
			...listLimit,
			displayOptions: { show: { resource: ['tool'], operation: ['list'] } },
		},
		filterCollection(['tool']),
	];
}

function fileProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Upload Source',
			name: 'uploadSource',
			type: 'options',
			options: [
				{ name: 'Binary Data', value: 'binary' },
				{ name: 'Text Content', value: 'text' },
				{ name: 'URL', value: 'url' },
			],
			default: 'binary',
			displayOptions: { show: { resource: ['file'], operation: ['create'] } },
			description: 'The Vapi API accepts multipart file uploads. URL and text sources are converted to a file part before upload.',
		},
		{
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: { show: { resource: ['file'], operation: ['create'], uploadSource: ['binary'] } },
			description: 'Input binary property containing the file to upload.',
		},
		{
			displayName: 'File URL',
			name: 'fileUrl',
			type: 'string',
			default: '',
			required: true,
			displayOptions: { show: { resource: ['file'], operation: ['create'], uploadSource: ['url'] } },
			description: 'URL to download and upload to Vapi as a file.',
		},
		{
			displayName: 'Text Content',
			name: 'textContent',
			type: 'string',
			typeOptions: { rows: 8 },
			default: '',
			required: true,
			displayOptions: { show: { resource: ['file'], operation: ['create'], uploadSource: ['text'] } },
			description: 'Text content to upload as a file.',
		},
		{
			displayName: 'File Fields',
			name: 'fileFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['file'], operation: ['create'] } },
			options: [
				{ displayName: 'File Name', name: 'name', type: 'string', default: 'vapi-upload.txt', description: 'File name sent in the multipart upload.' },
				{ displayName: 'MIME Type', name: 'mimetype', type: 'string', default: 'text/plain', description: 'MIME type for text or URL uploads when not known from binary metadata.' },
				{ displayName: 'Purpose', name: 'purpose', type: 'string', default: 'knowledge_base_upload', description: 'Optional purpose metadata for the uploaded file.' },
				{ displayName: 'Metadata (JSON)', name: 'metadata', type: 'json', default: '' },
				rawBodyField,
			],
		},
		idField('File ID', 'id', ['file'], ['get', 'delete', 'update']),
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: { show: { resource: ['file'], operation: ['update'] } },
			options: [
				{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'File display name. Current Vapi schema allows 1-40 characters.' },
				{ displayName: 'Metadata (JSON)', name: 'metadata', type: 'json', default: '', description: 'Advanced metadata if supported by your Vapi account/API version.' },
				rawBodyField,
			],
		},
		{
			...listLimit,
			displayOptions: { show: { resource: ['file'], operation: ['list'] } },
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add filter',
			default: {},
			displayOptions: { show: { resource: ['file'], operation: ['list'] } },
			options: [
				{ displayName: 'Purpose', name: 'purpose', type: 'string', default: '' },
				{ displayName: 'Status', name: 'status', type: 'string', default: '' },
				...DATE_FILTERS,
			],
		},
	];
}

function idField(displayName: string, name: string, resources: string[], operations: string[]): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: resources, operation: operations } },
		description: `The Vapi ${displayName.toLowerCase()}.`,
	};
}

function filterCollection(resources: string[]): INodeProperties {
	return {
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: { show: { resource: resources, operation: ['list'] } },
		options: DATE_FILTERS,
	};
}

export function buildCallRequest(this: IExecuteFunctions, i: number, operation: string): RequestShape {
	if (operation === 'create') {
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const schedulePlan = this.getNodeParameter('schedulePlan', i, {}) as IDataObject;
		const body: IDataObject = {};

		addIfSet(body, 'assistantId', this.getNodeParameter('assistantId', i, '') as string);
		addIfSet(body, 'phoneNumberId', this.getNodeParameter('phoneNumberId', i, '') as string);

		const customerNumber = this.getNodeParameter('customerNumber', i, '') as string;
		if (customerNumber) body.customer = { number: customerNumber };

		mergeKnownFields(this, body, additionalFields, [
			'name', 'assistantId', 'phoneNumberId', 'squadId', 'workflowId',
			'assistant', 'assistantOverrides', 'customer', 'customers', 'phoneNumber',
			'squad', 'squadOverrides', 'workflow', 'workflowOverrides',
		]);

		if (body.squadId || body.squad || body.workflowId || body.workflow) {
			delete body.assistantId;
		}

		const schedFields = (schedulePlan.fields as IDataObject | undefined);
		if (schedFields?.earliestAt) {
			body.schedulePlan = { earliestAt: schedFields.earliestAt };
		}

		return { method: 'POST', endpoint: '/call', body: mergeRawBody(this, body, additionalFields.rawBody) };
	}

	if (operation === 'get') {
		return { method: 'GET', endpoint: `/call/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'end') {
		return { method: 'POST', endpoint: `/call/${this.getNodeParameter('id', i) as string}/end`, body: {} };
	}

	if (operation === 'update') {
		const id = this.getNodeParameter('id', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body: IDataObject = {};
		mergeKnownFields(this, body, updateFields, [
			'name', 'assistantId', 'squadId', 'workflowId',
			'assistantOverrides', 'squadOverrides', 'workflowOverrides',
		]);
		return { method: 'PATCH', endpoint: `/call/${id}`, body: mergeRawBody(this, body, updateFields.rawBody) };
	}

	if (operation === 'deleteData') {
		const id = this.getNodeParameter('id', i) as string;
		const deleteDataFields = this.getNodeParameter('deleteDataFields', i, {}) as IDataObject;
		const body: IDataObject = {};
		if (deleteDataFields.ids) {
			body.ids = parseJsonParameter(this, deleteDataFields.ids, 'Call IDs') as IDataObject[string];
		} else {
			body.ids = [id];
		}
		return { method: 'DELETE', endpoint: `/call/${id}`, body: mergeRawBody(this, body, deleteDataFields.rawBody) };
	}

	if (operation === 'list') {
		const limit = this.getNodeParameter('limit', i, 100) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs = { limit, ...buildDateFilters(filters) };
		addIfSet(qs, 'id', filters.id);
		addIfSet(qs, 'assistantId', filters.assistantId);
		addIfSet(qs, 'phoneNumberId', filters.phoneNumberId);
		return { method: 'GET', endpoint: '/call', qs };
	}

	throw new NodeOperationError(this.getNode(), `Unknown call operation: ${operation}`);
}

export function buildAssistantRequest(this: IExecuteFunctions, i: number, operation: string): RequestShape {
	if (operation === 'create') {
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body: IDataObject = {
			name: this.getNodeParameter('name', i) as string,
		};
		addIfSet(body, 'firstMessage', this.getNodeParameter('firstMessage', i, '') as string);
		addJsonIfSet(this, body, 'model', this.getNodeParameter('model', i, '') as string);
		addJsonIfSet(this, body, 'voice', this.getNodeParameter('voice', i, '') as string);
		mergeKnownFields(this, body, additionalFields, [
			'firstMessageMode', 'maxDurationSeconds', 'backgroundSound', 'analysisPlan',
			'artifactPlan', 'hooks', 'metadata', 'monitorPlan', 'observabilityPlan', 'server',
		]);
		return { method: 'POST', endpoint: '/assistant', body: mergeRawBody(this, body, additionalFields.rawBody) };
	}

	if (operation === 'get') {
		return { method: 'GET', endpoint: `/assistant/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'delete') {
		return { method: 'DELETE', endpoint: `/assistant/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'update') {
		const id = this.getNodeParameter('id', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body: IDataObject = {};
		mergeKnownFields(this, body, updateFields, [
			'name', 'firstMessage', 'maxDurationSeconds', 'model', 'voice', 'firstMessageMode',
			'backgroundSound', 'analysisPlan', 'artifactPlan', 'hooks', 'metadata',
			'monitorPlan', 'observabilityPlan', 'server',
		]);
		return { method: 'PATCH', endpoint: `/assistant/${id}`, body: mergeRawBody(this, body, updateFields.rawBody) };
	}

	if (operation === 'list') {
		const limit = this.getNodeParameter('limit', i, 100) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		return { method: 'GET', endpoint: '/assistant', qs: { limit, ...buildDateFilters(filters) } };
	}

	throw new NodeOperationError(this.getNode(), `Unknown assistant operation: ${operation}`);
}

export function buildPhoneNumberRequest(this: IExecuteFunctions, i: number, operation: string): RequestShape {
	if (operation === 'list') {
		const limit = this.getNodeParameter('limit', i, 100) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		return { method: 'GET', endpoint: '/phone-number', qs: { limit, ...buildDateFilters(filters) } };
	}

	if (operation === 'get') {
		return { method: 'GET', endpoint: `/phone-number/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'buy') {
		return {
			method: 'POST',
			endpoint: '/phone-number',
			body: parseJsonParameter(this, this.getNodeParameter('buyFields', i, '{}'), 'Buy Fields') as IDataObject,
		};
	}

	if (operation === 'update') {
		const id = this.getNodeParameter('id', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body: IDataObject = {};
		mergeKnownFields(this, body, updateFields, [
			'provider', 'name', 'assistantId', 'squadId', 'workflowId',
			'fallbackDestination', 'hooks',
		]);

		const server = buildServerObject(this, updateFields);
		if (server) body.server = server;

		return { method: 'PATCH', endpoint: `/phone-number/${id}`, body: mergeRawBody(this, body, updateFields.rawBody) };
	}

	if (operation === 'delete') {
		return { method: 'DELETE', endpoint: `/phone-number/${this.getNodeParameter('id', i) as string}` };
	}

	throw new NodeOperationError(this.getNode(), `Unknown phone number operation: ${operation}`);
}

export function buildSquadRequest(this: IExecuteFunctions, i: number, operation: string): RequestShape {
	if (operation === 'create') {
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body: IDataObject = {
			members: parseJsonParameter(this, this.getNodeParameter('members', i) as string, 'Members') as IDataObject[string],
		};
		addIfSet(body, 'name', this.getNodeParameter('name', i, '') as string);
		mergeKnownFields(this, body, additionalFields, ['membersOverrides']);
		return { method: 'POST', endpoint: '/squad', body: mergeRawBody(this, body, additionalFields.rawBody) };
	}

	if (operation === 'get') {
		return { method: 'GET', endpoint: `/squad/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'delete') {
		return { method: 'DELETE', endpoint: `/squad/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'update') {
		const id = this.getNodeParameter('id', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body: IDataObject = {};
		mergeKnownFields(this, body, updateFields, ['name', 'members', 'membersOverrides', 'squadOverrides']);
		return { method: 'PATCH', endpoint: `/squad/${id}`, body: mergeRawBody(this, body, updateFields.rawBody) };
	}

	if (operation === 'list') {
		const limit = this.getNodeParameter('limit', i, 100) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		return { method: 'GET', endpoint: '/squad', qs: { limit, ...buildDateFilters(filters) } };
	}

	throw new NodeOperationError(this.getNode(), `Unknown squad operation: ${operation}`);
}

export function buildToolRequest(this: IExecuteFunctions, i: number, operation: string): RequestShape {
	if (operation === 'list') {
		const limit = this.getNodeParameter('limit', i, 100) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		return { method: 'GET', endpoint: '/tool', qs: { limit, ...buildDateFilters(filters) } };
	}

	if (operation === 'get') {
		return { method: 'GET', endpoint: `/tool/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'delete') {
		return { method: 'DELETE', endpoint: `/tool/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'create' || operation === 'update') {
		const toolType = this.getNodeParameter('toolType', i, 'function') as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = buildToolBody.call(this, i, toolType, additionalFields);
		const endpoint = operation === 'create' ? '/tool' : `/tool/${this.getNodeParameter('id', i) as string}`;
		return {
			method: operation === 'create' ? 'POST' : 'PATCH',
			endpoint,
			body: mergeRawBody(this, body, additionalFields.rawBody),
		};
	}

	throw new NodeOperationError(this.getNode(), `Unknown tool operation: ${operation}`);
}

export async function buildFileRequest(
	this: IExecuteFunctions,
	i: number,
	operation: string,
	item: INodeExecutionData,
): Promise<RequestShape> {
	if (operation === 'list') {
		const limit = this.getNodeParameter('limit', i, 100) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs = { limit, ...buildDateFilters(filters) };
		addIfSet(qs, 'purpose', filters.purpose);
		addIfSet(qs, 'status', filters.status);
		return { method: 'GET', endpoint: '/file', qs };
	}

	if (operation === 'get') {
		return { method: 'GET', endpoint: `/file/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'delete') {
		return { method: 'DELETE', endpoint: `/file/${this.getNodeParameter('id', i) as string}` };
	}

	if (operation === 'update') {
		const id = this.getNodeParameter('id', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body: IDataObject = {};
		mergeKnownFields(this, body, updateFields, ['name', 'metadata']);
		return { method: 'PATCH', endpoint: `/file/${id}`, body: mergeRawBody(this, body, updateFields.rawBody) };
	}

	if (operation === 'create') {
		const uploadSource = this.getNodeParameter('uploadSource', i) as string;
		const fileFields = this.getNodeParameter('fileFields', i, {}) as IDataObject;
		const fileName = (fileFields.name as string | undefined) || 'vapi-upload.txt';
		const mimetype = (fileFields.mimetype as string | undefined) || 'text/plain';
		let fileBuffer: Buffer;
		let filename = fileName;
		let contentType = mimetype;

		if (uploadSource === 'binary') {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const binaryData = item.binary?.[binaryPropertyName];
			if (!binaryData) {
				throw new NodeOperationError(this.getNode(), `No binary data found in property "${binaryPropertyName}"`, { itemIndex: i });
			}
			fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
			filename = binaryData.fileName || fileName;
			contentType = binaryData.mimeType || mimetype;
		} else if (uploadSource === 'url') {
			const fileUrl = this.getNodeParameter('fileUrl', i) as string;
			const downloaded = await this.helpers.httpRequest({
				method: 'GET',
				url: fileUrl,
				encoding: 'arraybuffer',
				json: false,
			});
			fileBuffer = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded as ArrayBuffer);
			filename = fileName || fileUrl.split('/').pop() || 'vapi-upload';
		} else {
			const textContent = this.getNodeParameter('textContent', i) as string;
			fileBuffer = Buffer.from(textContent, 'utf8');
		}

		const formData: IDataObject = {
			file: {
				value: fileBuffer,
				options: {
					filename,
					contentType,
				},
			} as IDataObject,
		};

		addIfSet(formData, 'purpose', fileFields.purpose);
		if (fileFields.metadata) {
			formData.metadata = JSON.stringify(parseJsonParameter(this, fileFields.metadata, 'Metadata'));
		}
		const rawFormFields = parseRawObject(this, fileFields.rawBody, 'Advanced Raw Body');
		for (const [key, value] of Object.entries(rawFormFields)) {
			formData[key] = typeof value === 'object' ? JSON.stringify(value) : value;
		}

		return { method: 'POST', endpoint: '/file', formData, isMultipart: true };
	}

	throw new NodeOperationError(this.getNode(), `Unknown file operation: ${operation}`);
}

function buildToolBody(this: IExecuteFunctions, i: number, toolType: string, additionalFields: IDataObject): IDataObject {
	const body: IDataObject = {};
	const normalizedToolType = normalizeToolType(toolType);
	if (normalizedToolType !== 'custom') {
		body.type = normalizedToolType;
	}

	if (['function', 'code'].includes(normalizedToolType)) {
		const functionDefinition = this.getNodeParameter('functionDefinition', i, '') as string;
		if (functionDefinition) {
			body.function = parseJsonParameter(this, functionDefinition, 'Function Definition') as IDataObject[string];
		}
	}

	if (normalizedToolType === 'function') {
		const serverUrl = this.getNodeParameter('serverUrl', i, '') as string;
		if (serverUrl) {
			body.server = { url: serverUrl };
		}
	}

	if (normalizedToolType === 'apiRequest') {
		body.method = this.getNodeParameter('apiRequestMethod', i, 'POST') as string;
		body.url = this.getNodeParameter('apiRequestUrl', i) as string;
	}

	if (normalizedToolType === 'code') {
		addIfSet(body, 'code', this.getNodeParameter('code', i, '') as string);
		addIfSet(body, 'timeoutSeconds', this.getNodeParameter('timeoutSeconds', i, 10) as number);
	}

	const integrationFields = this.getNodeParameter('integrationFields', i, {}) as IDataObject;
	mergeKnownFields(this, body, integrationFields, [
		'credentialId', 'externalWorkflowId', 'calendarId', 'locationId',
		'spreadsheetId', 'sheetName', 'channelId',
	]);

	if (Object.prototype.hasOwnProperty.call(additionalFields, 'async')) {
		body.async = additionalFields.async;
	}
	mergeKnownFields(this, body, additionalFields, ['name', 'description', 'body', 'headers', 'messages', 'parameters', 'server']);

	return body;
}

function normalizeToolType(toolType: string): string {
	const legacyAliases: Record<string, string> = {
		'gohighlevel.calendarAvailability': 'gohighlevel.calendar.availability.check',
		'gohighlevel.calendarEventCreate': 'gohighlevel.calendar.event.create',
		'gohighlevel.contactCreate': 'gohighlevel.contact.create',
		'gohighlevel.contactGet': 'gohighlevel.contact.get',
		'google.calendar.createEvent': 'google.calendar.event.create',
		'google.calendar.checkAvailability': 'google.calendar.availability.check',
		'google.sheets.rowAppend': 'google.sheets.row.append',
		'slack.sendMessage': 'slack.message.send',
	};
	return legacyAliases[toolType] ?? toolType;
}

function buildServerObject(context: IExecuteFunctions, fields: IDataObject): IDataObject | undefined {
	const server: IDataObject = {};
	addIfSet(server, 'url', fields.serverUrl);
	addIfSet(server, 'timeoutSeconds', fields.serverTimeoutSeconds);
	addIfSet(server, 'secret', fields.serverSecret);
	if (fields.serverHeaders) {
		server.headers = parseJsonParameter(context, fields.serverHeaders, 'Server Headers') as IDataObject[string];
	}
	return Object.keys(server).length > 0 ? server : undefined;
}

function mergeKnownFields(context: IExecuteFunctions, target: IDataObject, source: IDataObject, keys: string[]): void {
	for (const key of keys) {
		const value = source[key];
		if (value === undefined || value === null || value === '') continue;
		if (typeof value === 'string' && looksLikeJsonField(key)) {
			target[key] = parseJsonParameter(context, value, key) as IDataObject[string];
		} else {
			target[key] = value;
		}
	}
}

function looksLikeJsonField(key: string): boolean {
	return [
		'assistant', 'assistantOverrides', 'customer', 'customers', 'phoneNumber', 'squad',
		'squadOverrides', 'workflow', 'workflowOverrides', 'model', 'voice', 'analysisPlan',
		'artifactPlan', 'hooks', 'metadata', 'monitorPlan', 'observabilityPlan', 'server',
		'fallbackDestination', 'members', 'membersOverrides', 'messages', 'parameters', 'body', 'headers',
	].includes(key);
}

function mergeRawBody(context: IExecuteFunctions, body: IDataObject, rawBody: unknown): IDataObject {
	return {
		...body,
		...parseRawObject(context, rawBody, 'Advanced Raw Body'),
	};
}

function parseRawObject(context: IExecuteFunctions, rawBody: unknown, label: string): IDataObject {
	if (!rawBody) return {};
	const parsed = parseJsonParameter(context, rawBody, label);
	if (!isDataObject(parsed)) {
		throw new NodeOperationError(context.getNode(), `${label} must be a JSON object`);
	}
	return parsed;
}

function parseJsonParameter(context: IExecuteFunctions, value: unknown, label: string): unknown {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new NodeOperationError(context.getNode(), `${label} contains invalid JSON: ${(error as Error).message}`);
	}
}

function addJsonIfSet(context: IExecuteFunctions, body: IDataObject, key: string, value: unknown): void {
	if (value === undefined || value === null || value === '') return;
	body[key] = parseJsonParameter(context, value, key) as IDataObject[string];
}

function addIfSet(body: IDataObject, key: string, value: unknown): void {
	if (value === undefined || value === null || value === '') return;
	body[key] = value as IDataObject[string];
}

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildDateFilters(filters: IDataObject): IDataObject {
	const result: IDataObject = {};
	for (const key of ['createdAtGt', 'createdAtLt', 'createdAtGe', 'createdAtLe', 'updatedAtGt', 'updatedAtLt', 'updatedAtGe', 'updatedAtLe']) {
		addIfSet(result, key, filters[key]);
	}
	return result;
}

function pushResponse(returnData: INodeExecutionData[], responseData: unknown): void {
	if (Array.isArray(responseData)) {
		for (const entry of responseData as IDataObject[]) {
			returnData.push({ json: entry });
		}
	} else if (responseData && isDataObject(responseData)) {
		returnData.push({ json: responseData });
	} else if (responseData) {
		returnData.push({ json: { data: responseData as string | number | boolean } });
	} else {
		returnData.push({ json: { success: true } });
	}
}

function formatVapiError(error: unknown): IDataObject {
	const maybeError = error as {
		message?: string;
		statusCode?: number;
		status?: number;
		response?: {
			statusCode?: number;
			status?: number;
			body?: unknown;
			data?: unknown;
		};
	};

	const responseBody = maybeError.response?.body ?? maybeError.response?.data;
	const body = typeof responseBody === 'string' ? safeJson(responseBody) : responseBody;
	const message = extractErrorMessage(body) ?? maybeError.message ?? 'Vapi request failed';
	const statusCode = maybeError.statusCode ?? maybeError.status ?? maybeError.response?.statusCode ?? maybeError.response?.status;

	return {
		error: true,
		message,
		statusCode,
		details: body as IDataObject[string],
	};
}

function extractErrorMessage(body: unknown): string | undefined {
	if (!isDataObject(body)) return undefined;
	if (typeof body.message === 'string') return body.message;
	if (typeof body.error === 'string') return body.error;
	if (Array.isArray(body.message)) return body.message.join('; ');
	return undefined;
}

function safeJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}
