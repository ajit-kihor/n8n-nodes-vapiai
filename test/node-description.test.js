const assert = require('assert');

const {
	Vapi,
	buildCallRequest,
	buildFileRequest,
	buildPhoneNumberRequest,
	buildToolRequest,
} = require('../dist/nodes/Vapi/Vapi.node.js');
const { VapiTrigger } = require('../dist/nodes/VapiTrigger/VapiTrigger.node.js');

function fakeContext(parameters) {
	return {
		getNodeParameter(name, _itemIndex, fallbackValue) {
			if (Object.prototype.hasOwnProperty.call(parameters, name)) {
				return parameters[name];
			}
			return fallbackValue;
		},
		getNode() {
			return { name: 'Vapi Test', type: 'vapi', typeVersion: 1 };
		},
		helpers: {},
	};
}

function getResourceOperations(node, resource) {
	const operation = node.description.properties.find(
		(property) => property.name === 'operation' && property.displayOptions?.show?.resource?.includes(resource),
	);
	return operation.options.map((option) => option.value);
}

const vapi = new Vapi();
assert(getResourceOperations(vapi, 'call').includes('update'));
assert(getResourceOperations(vapi, 'call').includes('deleteData'));
assert(getResourceOperations(vapi, 'phoneNumber').includes('update'));
assert(getResourceOperations(vapi, 'file').includes('create'));
assert(getResourceOperations(vapi, 'file').includes('delete'));

const callUpdate = buildCallRequest.call(fakeContext({
	id: 'call-id',
	updateFields: {
		name: 'structured-name',
		assistantOverrides: '{"variableValues":{"tier":"gold"}}',
		rawBody: '{"name":"raw-name"}',
	},
}), 0, 'update');

assert.strictEqual(callUpdate.method, 'PATCH');
assert.strictEqual(callUpdate.endpoint, '/call/call-id');
assert.strictEqual(callUpdate.body.name, 'raw-name');
assert.deepStrictEqual(callUpdate.body.assistantOverrides, { variableValues: { tier: 'gold' } });

const callDelete = buildCallRequest.call(fakeContext({
	id: 'call-id',
	deleteDataFields: {},
}), 0, 'deleteData');

assert.strictEqual(callDelete.method, 'DELETE');
assert.strictEqual(callDelete.endpoint, '/call/call-id');
assert.deepStrictEqual(callDelete.body.ids, ['call-id']);

const phoneUpdate = buildPhoneNumberRequest.call(fakeContext({
	id: 'phone-id',
	updateFields: {
		provider: 'twilio',
		assistantId: 'assistant-id',
		serverUrl: 'https://example.com/vapi',
		serverTimeoutSeconds: 20,
		serverHeaders: '{"x-vapi-secret":"secret"}',
	},
}), 0, 'update');

assert.strictEqual(phoneUpdate.method, 'PATCH');
assert.strictEqual(phoneUpdate.endpoint, '/phone-number/phone-id');
assert.deepStrictEqual(phoneUpdate.body.server, {
	url: 'https://example.com/vapi',
	timeoutSeconds: 20,
	headers: { 'x-vapi-secret': 'secret' },
});

const fileUpdate = buildFileRequest.call(fakeContext({
	id: 'file-id',
	updateFields: {
		name: 'Knowledge Base',
		rawBody: '{"name":"Raw File Name"}',
	},
}), 0, 'update', { json: {} });

Promise.resolve(fileUpdate).then((request) => {
	assert.strictEqual(request.method, 'PATCH');
	assert.strictEqual(request.endpoint, '/file/file-id');
	assert.strictEqual(request.body.name, 'Raw File Name');

	const codeTool = buildToolRequest.call(fakeContext({
		toolType: 'code',
		code: 'export default async function handler() { return { ok: true }; }',
		timeoutSeconds: 12,
		additionalFields: {
			rawBody: '{"timeoutSeconds":15}',
		},
		integrationFields: {},
	}), 0, 'create');

	assert.strictEqual(codeTool.method, 'POST');
	assert.strictEqual(codeTool.endpoint, '/tool');
	assert.strictEqual(codeTool.body.type, 'code');
	assert.strictEqual(codeTool.body.timeoutSeconds, 15);

	const trigger = new VapiTrigger();
	const eventProperty = trigger.description.properties.find((property) => property.name === 'events');
	const eventValues = eventProperty.options.map((option) => option.value);
	assert(eventValues.includes('*'));
	assert(eventValues.includes('workflow.node.started'));
	assert(eventValues.includes('transfer-update'));
	assert(eventValues.includes('call.deleted'));

	console.log('All node description/request-builder tests passed.');
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
