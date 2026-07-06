import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	NodeOperationError,
} from 'n8n-workflow';

export class Vapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vapi',
		name: 'vapi',
		icon: 'file:vapi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with the Vapi voice AI platform',
		defaults: {
			name: 'Vapi',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'vapiApi',
				required: true,
			},
		],
		properties: [
			// ─── Resource selector ───────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Assistant', value: 'assistant' },
					{ name: 'Call', value: 'call' },
					{ name: 'Phone Number', value: 'phoneNumber' },
					{ name: 'Squad', value: 'squad' },
					{ name: 'Tool', value: 'tool' },
				],
				default: 'call',
			},

			// ─── Operation: Call ─────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['call'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create an outbound call', action: 'Create a call' },
					{ name: 'End', value: 'end', description: 'End an active call', action: 'End a call' },
					{ name: 'Get', value: 'get', description: 'Retrieve a call by ID', action: 'Get a call' },
					{ name: 'List', value: 'list', description: 'List calls', action: 'List calls' },
				],
				default: 'create',
			},

			// ─── Operation: Assistant ────────────────────────────────────────────
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

			// ─── Operation: Phone Number ─────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['phoneNumber'] } },
				options: [
					{ name: 'Buy', value: 'buy', description: 'Provision a phone number', action: 'Buy a phone number' },
					{ name: 'Delete', value: 'delete', description: 'Release a phone number', action: 'Delete a phone number' },
					{ name: 'Get', value: 'get', description: 'Get a phone number', action: 'Get a phone number' },
					{ name: 'List', value: 'list', description: 'List phone numbers', action: 'List phone numbers' },
				],
				default: 'list',
			},

			// ─── Operation: Squad ────────────────────────────────────────────────
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

			// ─── Operation: Tool ─────────────────────────────────────────────────
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

			// ═══════════════════════════════════════════════════════════════════════
			// CALL PARAMETERS
			// ═══════════════════════════════════════════════════════════════════════

			// call → create
			{
				displayName: 'Assistant ID',
				name: 'assistantId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				description: 'ID of the Vapi assistant to use for this call',
			},
			{
				displayName: 'Phone Number ID',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				description: "ID of the Vapi phone number to call from",
			},
			{
				displayName: 'Customer Number',
				name: 'customerNumber',
				type: 'string',
				default: '',
				placeholder: '+11234567890',
				required: true,
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				description: "Customer's phone number in E.164 format",
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
								description: 'Earliest time to initiate the call (ISO 8601)',
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
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Optional name for the call',
					},
					{
						displayName: 'Squad ID',
						name: 'squadId',
						type: 'string',
						default: '',
						description: 'Use a squad instead of a single assistant',
					},
					{
						displayName: 'Additional Customers (JSON Array)',
						name: 'customers',
						type: 'json',
						default: '',
						description: 'Array of customer objects for batch calls, e.g. [{"number":"+1234"}]',
					},
					{
						displayName: 'Raw Body (JSON)',
						name: 'rawBody',
						type: 'json',
						default: '',
						description: 'Full raw JSON body – overrides all other fields when set',
					},
				],
			},

			// call → get / end
			{
				displayName: 'Call ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['call'], operation: ['get', 'end'] } },
				description: 'ID of the call',
			},

			// call → list
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 100,
				displayOptions: { show: { resource: ['call'], operation: ['list'] } },
				description: 'Max number of results to return',
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
					{ displayName: 'Created After', name: 'createdAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Created Before', name: 'createdAtLt', type: 'dateTime', default: '' },
					{ displayName: 'Created At or After', name: 'createdAtGe', type: 'dateTime', default: '' },
					{ displayName: 'Created At or Before', name: 'createdAtLe', type: 'dateTime', default: '' },
					{ displayName: 'Updated After', name: 'updatedAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Updated Before', name: 'updatedAtLt', type: 'dateTime', default: '' },
				],
			},

			// ═══════════════════════════════════════════════════════════════════════
			// ASSISTANT PARAMETERS
			// ═══════════════════════════════════════════════════════════════════════

			// assistant → create
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
				description: 'Name of the assistant',
			},
			{
				displayName: 'First Message',
				name: 'firstMessage',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
				description: 'Opening message the assistant speaks at the start of the call',
			},
			{
				displayName: 'Model (JSON)',
				name: 'model',
				type: 'json',
				default: '{"provider":"openai","model":"gpt-4o","temperature":0.7}',
				displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
				description: 'LLM model configuration object',
			},
			{
				displayName: 'Voice (JSON)',
				name: 'voice',
				type: 'json',
				default: '{"provider":"11labs","voiceId":"rachel"}',
				displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
				description: 'Voice provider configuration object',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: { show: { resource: ['assistant'], operation: ['create'] } },
				options: [
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
					{
						displayName: 'Raw Body (JSON)',
						name: 'rawBody',
						type: 'json',
						default: '',
						description: 'Full raw JSON body – overrides all other fields when set',
					},
				],
			},

			// assistant → get / delete
			{
				displayName: 'Assistant ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['assistant'], operation: ['get', 'delete', 'update'] } },
				description: 'ID of the assistant',
			},

			// assistant → update
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
					{
						displayName: 'Raw Body (JSON)',
						name: 'rawBody',
						type: 'json',
						default: '',
						description: 'Full raw JSON body – overrides all other fields when set',
					},
				],
			},

			// assistant → list
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 100,
				displayOptions: { show: { resource: ['assistant'], operation: ['list'] } },
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: { show: { resource: ['assistant'], operation: ['list'] } },
				options: [
					{ displayName: 'Created After', name: 'createdAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Created Before', name: 'createdAtLt', type: 'dateTime', default: '' },
					{ displayName: 'Updated After', name: 'updatedAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Updated Before', name: 'updatedAtLt', type: 'dateTime', default: '' },
				],
			},

			// ═══════════════════════════════════════════════════════════════════════
			// PHONE NUMBER PARAMETERS
			// ═══════════════════════════════════════════════════════════════════════

			// phoneNumber → get / delete
			{
				displayName: 'Phone Number ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['get', 'delete'] } },
				description: 'ID of the phone number',
			},

			// phoneNumber → buy
			{
				displayName: 'Buy Fields (JSON)',
				name: 'buyFields',
				type: 'json',
				default: '{"provider":"twilio","areaCode":"415"}',
				required: true,
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['buy'] } },
				description: 'Phone number provisioning options as a JSON object',
			},

			// phoneNumber → list
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 100,
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['list'] } },
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: { show: { resource: ['phoneNumber'], operation: ['list'] } },
				options: [
					{ displayName: 'Created After', name: 'createdAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Created Before', name: 'createdAtLt', type: 'dateTime', default: '' },
					{ displayName: 'Updated After', name: 'updatedAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Updated Before', name: 'updatedAtLt', type: 'dateTime', default: '' },
				],
			},

			// ═══════════════════════════════════════════════════════════════════════
			// SQUAD PARAMETERS
			// ═══════════════════════════════════════════════════════════════════════

			// squad → create
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['squad'], operation: ['create'] } },
				description: 'Name of the squad',
			},
			{
				displayName: 'Members (JSON Array)',
				name: 'members',
				type: 'json',
				default: '[{"assistantId":""}]',
				required: true,
				displayOptions: { show: { resource: ['squad'], operation: ['create'] } },
				description: 'Array of squad member objects',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: { show: { resource: ['squad'], operation: ['create'] } },
				options: [
					{
						displayName: 'Members Overrides (JSON)',
						name: 'membersOverrides',
						type: 'json',
						default: '{}',
					},
					{
						displayName: 'Raw Body (JSON)',
						name: 'rawBody',
						type: 'json',
						default: '',
						description: 'Full raw JSON body – overrides all other fields when set',
					},
				],
			},

			// squad → get / delete / update
			{
				displayName: 'Squad ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['squad'], operation: ['get', 'delete', 'update'] } },
				description: 'ID of the squad',
			},

			// squad → update
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
					{
						displayName: 'Raw Body (JSON)',
						name: 'rawBody',
						type: 'json',
						default: '',
						description: 'Full raw JSON body – overrides all other fields when set',
					},
				],
			},

			// squad → list
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 100,
				displayOptions: { show: { resource: ['squad'], operation: ['list'] } },
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: { show: { resource: ['squad'], operation: ['list'] } },
				options: [
					{ displayName: 'Created After', name: 'createdAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Created Before', name: 'createdAtLt', type: 'dateTime', default: '' },
					{ displayName: 'Updated After', name: 'updatedAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Updated Before', name: 'updatedAtLt', type: 'dateTime', default: '' },
				],
			},

			// ═══════════════════════════════════════════════════════════════════════
			// TOOL PARAMETERS
			// ═══════════════════════════════════════════════════════════════════════

			// tool → create
			{
				displayName: 'Tool Body (JSON)',
				name: 'toolBody',
				type: 'json',
				default: '{"type":"function","function":{"name":"my_tool","description":"","parameters":{"type":"object","properties":{}}}}',
				required: true,
				displayOptions: { show: { resource: ['tool'], operation: ['create'] } },
				description: 'Full tool definition as JSON. The "type" field is required (e.g. function, apiRequest, transferCall, endCall, dtmf, handoff).',
			},

			// tool → get / delete / update
			{
				displayName: 'Tool ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['tool'], operation: ['get', 'delete', 'update'] } },
				description: 'ID of the tool',
			},

			// tool → update
			{
				displayName: 'Update Body (JSON)',
				name: 'toolBody',
				type: 'json',
				default: '{}',
				required: true,
				displayOptions: { show: { resource: ['tool'], operation: ['update'] } },
				description: 'Fields to update as JSON',
			},

			// tool → list
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 100,
				displayOptions: { show: { resource: ['tool'], operation: ['list'] } },
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: { show: { resource: ['tool'], operation: ['list'] } },
				options: [
					{ displayName: 'Created After', name: 'createdAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Created Before', name: 'createdAtLt', type: 'dateTime', default: '' },
					{ displayName: 'Updated After', name: 'updatedAtGt', type: 'dateTime', default: '' },
					{ displayName: 'Updated Before', name: 'updatedAtLt', type: 'dateTime', default: '' },
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('vapiApi');
		const apiKey = credentials.apiKey as string;
		const baseUrl = 'https://api.vapi.ai';

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			let method = 'GET';
			let endpoint = '';
			let qs: IDataObject = {};
			let body: IDataObject | undefined;

			try {
				// ─────────────────────── CALLS ────────────────────────────────────
				if (resource === 'call') {
					if (operation === 'create') {
						method = 'POST';
						endpoint = '/call';

						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

						if (additionalFields.rawBody) {
							body = JSON.parse(additionalFields.rawBody as string) as IDataObject;
						} else {
							const assistantId = this.getNodeParameter('assistantId', i) as string;
							const phoneNumberId = this.getNodeParameter('phoneNumberId', i) as string;
							const customerNumber = this.getNodeParameter('customerNumber', i) as string;
							const schedulePlan = this.getNodeParameter('schedulePlan', i, {}) as IDataObject;

							body = {
								assistantId,
								phoneNumberId,
								customer: { number: customerNumber },
							};

							if (additionalFields.name) body.name = additionalFields.name;
							if (additionalFields.squadId) {
								body.squadId = additionalFields.squadId;
								delete body.assistantId;
							}
							if (additionalFields.customers) {
								body.customers = JSON.parse(additionalFields.customers as string);
								delete body.customer;
							}

							const schedFields = (schedulePlan as IDataObject).fields as IDataObject | undefined;
							if (schedFields?.earliestAt) {
								body.schedulePlan = { earliestAt: schedFields.earliestAt };
							}
						}
					} else if (operation === 'get') {
						method = 'GET';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/call/${id}`;
					} else if (operation === 'end') {
						method = 'POST';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/call/${id}/end`;
						body = {};
					} else if (operation === 'list') {
						method = 'GET';
						endpoint = '/call';
						const limit = this.getNodeParameter('limit', i, 100) as number;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						qs = { limit, ...buildDateFilters(filters) };
						if (filters.id) qs.id = filters.id;
						if (filters.assistantId) qs.assistantId = filters.assistantId;
						if (filters.phoneNumberId) qs.phoneNumberId = filters.phoneNumberId;
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown call operation: ${operation}`);
					}
				}

				// ─────────────────────── ASSISTANTS ───────────────────────────────
				else if (resource === 'assistant') {
					if (operation === 'create') {
						method = 'POST';
						endpoint = '/assistant';

						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

						if (additionalFields.rawBody) {
							body = JSON.parse(additionalFields.rawBody as string) as IDataObject;
						} else {
							const name = this.getNodeParameter('name', i) as string;
							const firstMessage = this.getNodeParameter('firstMessage', i, '') as string;
							const modelRaw = this.getNodeParameter('model', i, '') as string;
							const voiceRaw = this.getNodeParameter('voice', i, '') as string;

							body = { name } as IDataObject;
							if (firstMessage) body.firstMessage = firstMessage;
							if (modelRaw) body.model = JSON.parse(modelRaw) as IDataObject;
							if (voiceRaw) body.voice = JSON.parse(voiceRaw) as IDataObject;
							if (additionalFields.firstMessageMode) body.firstMessageMode = additionalFields.firstMessageMode;
							if (additionalFields.maxDurationSeconds) body.maxDurationSeconds = additionalFields.maxDurationSeconds;
							if (additionalFields.backgroundSound) body.backgroundSound = additionalFields.backgroundSound;
						}
					} else if (operation === 'get') {
						method = 'GET';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/assistant/${id}`;
					} else if (operation === 'delete') {
						method = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/assistant/${id}`;
					} else if (operation === 'update') {
						method = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/assistant/${id}`;
						const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

						if (updateFields.rawBody) {
							body = JSON.parse(updateFields.rawBody as string) as IDataObject;
						} else {
							body = {} as IDataObject;
							if (updateFields.name) body.name = updateFields.name;
							if (updateFields.firstMessage) body.firstMessage = updateFields.firstMessage;
							if (updateFields.maxDurationSeconds) body.maxDurationSeconds = updateFields.maxDurationSeconds;
							if (updateFields.model) body.model = JSON.parse(updateFields.model as string) as IDataObject;
							if (updateFields.voice) body.voice = JSON.parse(updateFields.voice as string) as IDataObject;
						}
					} else if (operation === 'list') {
						method = 'GET';
						endpoint = '/assistant';
						const limit = this.getNodeParameter('limit', i, 100) as number;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						qs = { limit, ...buildDateFilters(filters) };
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown assistant operation: ${operation}`);
					}
				}

				// ─────────────────────── PHONE NUMBERS ────────────────────────────
				else if (resource === 'phoneNumber') {
					if (operation === 'list') {
						method = 'GET';
						endpoint = '/phone-number';
						const limit = this.getNodeParameter('limit', i, 100) as number;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						qs = { limit, ...buildDateFilters(filters) };
					} else if (operation === 'get') {
						method = 'GET';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/phone-number/${id}`;
					} else if (operation === 'buy') {
						method = 'POST';
						endpoint = '/phone-number';
						const buyFields = this.getNodeParameter('buyFields', i, '{}') as string;
						body = JSON.parse(buyFields) as IDataObject;
					} else if (operation === 'delete') {
						method = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/phone-number/${id}`;
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown phoneNumber operation: ${operation}`);
					}
				}

				// ─────────────────────── SQUADS ───────────────────────────────────
				else if (resource === 'squad') {
					if (operation === 'create') {
						method = 'POST';
						endpoint = '/squad';
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

						if (additionalFields.rawBody) {
							body = JSON.parse(additionalFields.rawBody as string) as IDataObject;
						} else {
							const name = this.getNodeParameter('name', i) as string;
							const membersRaw = this.getNodeParameter('members', i) as string;
							body = {
								name,
								members: JSON.parse(membersRaw),
							} as IDataObject;
							if (additionalFields.membersOverrides) {
								body.membersOverrides = JSON.parse(additionalFields.membersOverrides as string);
							}
						}
					} else if (operation === 'get') {
						method = 'GET';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/squad/${id}`;
					} else if (operation === 'delete') {
						method = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/squad/${id}`;
					} else if (operation === 'update') {
						method = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/squad/${id}`;
						const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

						if (updateFields.rawBody) {
							body = JSON.parse(updateFields.rawBody as string) as IDataObject;
						} else {
							body = {} as IDataObject;
							if (updateFields.name) body.name = updateFields.name;
							if (updateFields.members) body.members = JSON.parse(updateFields.members as string);
							if (updateFields.membersOverrides) body.membersOverrides = JSON.parse(updateFields.membersOverrides as string);
						}
					} else if (operation === 'list') {
						method = 'GET';
						endpoint = '/squad';
						const limit = this.getNodeParameter('limit', i, 100) as number;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						qs = { limit, ...buildDateFilters(filters) };
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown squad operation: ${operation}`);
					}
				}

				// ─────────────────────── TOOLS ────────────────────────────────────
				else if (resource === 'tool') {
					if (operation === 'list') {
						method = 'GET';
						endpoint = '/tool';
						const limit = this.getNodeParameter('limit', i, 100) as number;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						qs = { limit, ...buildDateFilters(filters) };
					} else if (operation === 'get') {
						method = 'GET';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/tool/${id}`;
					} else if (operation === 'create') {
						method = 'POST';
						endpoint = '/tool';
						const toolBody = this.getNodeParameter('toolBody', i) as string;
						body = JSON.parse(toolBody) as IDataObject;
					} else if (operation === 'update') {
						method = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/tool/${id}`;
						const toolBody = this.getNodeParameter('toolBody', i) as string;
						body = JSON.parse(toolBody) as IDataObject;
					} else if (operation === 'delete') {
						method = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/tool/${id}`;
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown tool operation: ${operation}`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				const requestOptions: IHttpRequestOptions = {
					method: method as 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
					url: `${baseUrl}${endpoint}`,
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					qs,
					json: true,
				};

				if (body !== undefined && Object.keys(body).length > 0) {
					requestOptions.body = body;
				}

				const responseData = await this.helpers.httpRequest(requestOptions);

				if (Array.isArray(responseData)) {
					for (const entry of responseData as IDataObject[]) {
						returnData.push({ json: entry });
					}
				} else if (responseData) {
					returnData.push({ json: responseData as IDataObject });
				} else {
					returnData.push({ json: { success: true } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: i });
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateFilters(filters: IDataObject): IDataObject {
	const dateKeys = [
		'createdAtGt', 'createdAtLt', 'createdAtGe', 'createdAtLe',
		'updatedAtGt', 'updatedAtLt', 'updatedAtGe', 'updatedAtLe',
	];
	const result: IDataObject = {};
	for (const key of dateKeys) {
		if (filters[key]) result[key] = filters[key];
	}
	return result;
}
