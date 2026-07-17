import {
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

const eventOptions = [
	{ name: 'All Events', value: '*' },
	{ name: 'Assistant Request', value: 'assistant-request' },
	{ name: 'Assistant Speech Started', value: 'assistant.speechStarted' },
	{ name: 'Assistant Started', value: 'assistant.started' },
	{ name: 'Call Deleted', value: 'call.deleted' },
	{ name: 'Call Delete Failed', value: 'call.delete.failed' },
	{ name: 'Call Endpointing Request', value: 'call.endpointing.request' },
	{ name: 'Campaign Predial', value: 'campaign.predial' },
	{ name: 'Chat Created', value: 'chat.created' },
	{ name: 'Chat Deleted', value: 'chat.deleted' },
	{ name: 'Conversation Update', value: 'conversation-update' },
	{ name: 'End of Call Report', value: 'end-of-call-report' },
	{ name: 'Function Call', value: 'function-call' },
	{ name: 'Hang', value: 'hang' },
	{ name: 'Handoff Destination Request', value: 'handoff-destination-request' },
	{ name: 'Knowledge Base Request', value: 'knowledge-base-request' },
	{ name: 'Language Change Detected', value: 'language-change-detected' },
	{ name: 'Metadata', value: 'metadata' },
	{ name: 'Model Output', value: 'model-output' },
	{ name: 'Phone Call Control', value: 'phone-call-control' },
	{ name: 'Session Created', value: 'session.created' },
	{ name: 'Session Deleted', value: 'session.deleted' },
	{ name: 'Session Updated', value: 'session.updated' },
	{ name: 'Speech Update', value: 'speech-update' },
	{ name: 'Status Update', value: 'status-update' },
	{ name: 'Tool Calls', value: 'tool-calls' },
	{ name: 'Tool Calls Result', value: 'tool-calls-result' },
	{ name: 'Transcript', value: 'transcript' },
	{ name: 'Transcript Final', value: 'transcript[transcriptType="final"]' },
	{ name: 'Transfer Destination Request', value: 'transfer-destination-request' },
	{ name: 'Transfer Update', value: 'transfer-update' },
	{ name: 'User Interrupted', value: 'user-interrupted' },
	{ name: 'Voice Input', value: 'voice-input' },
	{ name: 'Voice Request', value: 'voice-request' },
	{ name: 'Workflow Node Started', value: 'workflow.node.started' },
];

export class VapiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vapi Trigger',
		name: 'vapiTrigger',
		icon: { light: 'file:vapi.svg', dark: 'file:vapi.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Vapi sends a webhook event',
		defaults: {
			name: 'Vapi Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'vapi',
			},
		],
		properties: [
			{
				displayName: 'Event Types',
				name: 'events',
				type: 'multiOptions',
				options: eventOptions,
				default: ['*'],
				description: 'Which Vapi event types to accept. Select All Events to receive every current and future event.',
			},
			{
				displayName: 'Verify Shared Secret Header',
				name: 'verifySecret',
				type: 'boolean',
				default: false,
				description: 'Whether to compare Vapi\'s shared secret header before accepting the webhook. This does not perform HMAC signature verification.',
			},
			{
				displayName: 'Header Name',
				name: 'verificationHeaderName',
				type: 'string',
				default: 'x-vapi-secret',
				displayOptions: { show: { verifySecret: [true] } },
				description: 'Name of the HTTP header carrying the shared secret. Vapi uses X-Vapi-Secret for legacy inline secrets.',
			},
			{
				displayName: 'Expected Value',
				name: 'secretHeaderValue',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: { show: { verifySecret: [true] } },
				description: 'Expected value of the secret header',
			},
		],
		usableAsTool: true,
	};

	webhookMethods = {
		default: {
			async checkExists(): Promise<boolean> {
				return true;
			},
			async create(): Promise<boolean> {
				return true;
			},
			async delete(): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		const verifySecret = this.getNodeParameter('verifySecret', false) as boolean;

		if (verifySecret) {
			const legacyHeaderName = this.getNodeParameter('secretHeaderName', 'x-vapi-secret') as string;
			const headerName = (this.getNodeParameter('verificationHeaderName', legacyHeaderName) as string).toLowerCase();
			const expected = this.getNodeParameter('secretHeaderValue', '') as string;
			const actual = req.headers[headerName] as string | string[] | undefined;

			const matches = Array.isArray(actual) ? actual.includes(expected) : actual === expected;
			if (!actual || !matches) {
				res.status(401).json({ error: 'Unauthorized' });
				return { workflowData: [] };
			}
		}

		const body = req.body as IDataObject;
		const messageType = getEventType(body);
		const events = this.getNodeParameter('events', ['*']) as string[];

		if (!events.includes('*') && events.length > 0 && messageType && !events.includes(messageType)) {
			res.status(200).json({ received: true });
			return { workflowData: [] };
		}

		res.status(200).json({ received: true });

		return {
			workflowData: [
				[
					{
						json: {
							type: messageType,
							...body,
						},
					},
				],
			],
		};
	}
}

function getEventType(body: IDataObject): string | undefined {
	const message = body.message as IDataObject | undefined;
	if (typeof message?.type === 'string') return message.type;
	if (typeof body.type === 'string') return body.type;
	return undefined;
}
