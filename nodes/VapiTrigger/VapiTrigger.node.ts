import {
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class VapiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vapi Trigger',
		name: 'vapiTrigger',
		icon: 'file:vapi.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Vapi sends a webhook event',
		defaults: {
			name: 'Vapi Trigger',
		},
		inputs: [],
		outputs: ['main'],
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
				options: [
					{ name: 'All Events', value: '*' },
					{ name: 'Assistant Started', value: 'assistant.started' },
					{ name: 'Conversation Update', value: 'conversation-update' },
					{ name: 'End of Call Report', value: 'end-of-call-report' },
					{ name: 'Function Call', value: 'function-call' },
					{ name: 'Handoff Destination Request', value: 'handoff-destination-request' },
					{ name: 'Speech Update', value: 'speech-update' },
					{ name: 'Status Update', value: 'status-update' },
					{ name: 'Tool Calls', value: 'tool-calls' },
					{ name: 'Transfer Destination Request', value: 'transfer-destination-request' },
					{ name: 'User Interrupted', value: 'user-interrupted' },
				],
				default: ['*'],
				description: 'Which Vapi event types to accept. Select "All Events" to receive everything.',
			},
			{
				displayName: 'Verify Secret Header',
				name: 'verifySecret',
				type: 'boolean',
				default: false,
				description: 'Whether to validate a shared secret header sent by Vapi',
			},
			{
				displayName: 'Header Name',
				name: 'secretHeaderName',
				type: 'string',
				default: 'x-vapi-signature',
				displayOptions: { show: { verifySecret: [true] } },
				description: 'Name of the HTTP header that carries the shared secret',
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
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		// ── Secret verification ────────────────────────────────────────────────
		const verifySecret = this.getNodeParameter('verifySecret', false) as boolean;

		if (verifySecret) {
			const headerName = (this.getNodeParameter('secretHeaderName', 'x-vapi-signature') as string).toLowerCase();
			const expected = this.getNodeParameter('secretHeaderValue', '') as string;
			const actual = req.headers[headerName] as string | string[] | undefined;

			const matches = Array.isArray(actual) ? actual.includes(expected) : actual === expected;
			if (!actual || !matches) {
				res.status(401).json({ error: 'Unauthorized' });
				return { workflowData: [] };
			}
		}

		const body = req.body as IDataObject;

		// ── Event filter ───────────────────────────────────────────────────────
		const events = this.getNodeParameter('events', ['*']) as string[];
		if (!events.includes('*') && events.length > 0) {
			const messageType = (body.message as IDataObject)?.type as string | undefined
				?? body.type as string | undefined;

			if (messageType && !events.includes(messageType)) {
				// Event not selected – acknowledge silently and drop
				res.status(200).json({ received: true });
				return { workflowData: [] };
			}
		}

		// ── Respond to Vapi ────────────────────────────────────────────────────
		res.status(200).json({ received: true });

		return {
			workflowData: [
				[
					{
						json: body,
					},
				],
			],
		};
	}
}
