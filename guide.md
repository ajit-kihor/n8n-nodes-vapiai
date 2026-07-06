# n8n Vapi Node – Full Design & API Reference

This document is a **self-contained spec** for an AI coding agent to implement a complete n8n community node package for [Vapi](https://vapi.ai), covering all core REST resources (Calls, Assistants, Squads, Phone Numbers, Tools) and a webhook trigger node.

The agent reading this file should be able to generate **all TypeScript code** for an npm package `n8n-nodes-vapi` without needing to access external documentation.

***

## 1. Goals & Scope

### 1.1. What we are building

We want an npm package:

```jsonc
// package.json (high-level shape)
{
  "name": "n8n-nodes-vapi",
  "version": "1.0.0",
  "description": "n8n community nodes for Vapi voice AI platform",
  "keywords": ["n8n", "n8n-community-node", "vapi", "voice-ai", "calls", "assistant"],
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": [
      "dist/nodes/Vapi/Vapi.node.js",
      "dist/nodes/VapiTrigger/VapiTrigger.node.js"
    ],
    "credentials": [
      "dist/credentials/VapiApi.credentials.js"
    ]
  }
}
```

The package should expose **two nodes** and **one credentials type**:

- `Vapi` – **main operation node** (resource + operation pattern)
- `Vapi Trigger` – **webhook trigger node** (for server URL / webhook events)
- `VapiApi` – credentials (API key / bearer token)

### 1.2. Supported resources & operations

The `Vapi` node will support these **resources** and **operations**:

#### Resource: Calls

- `call` → `create` – POST `/call` (Create Call)
- `call` → `get` – GET `/call/{id}` (Get Call)
- `call` → `list` – GET `/call` (List Calls)
- `call` → `end` – POST `/call/{id}/end` (End/Terminate Call) – if endpoint exists, otherwise skip

#### Resource: Assistants

- `assistant` → `create` – POST `/assistant`
- `assistant` → `get` – GET `/assistant/{id}`
- `assistant` → `list` – GET `/assistant`
- `assistant` → `update` – PATCH `/assistant/{id}`
- `assistant` → `delete` – DELETE `/assistant/{id}`

#### Resource: Phone Numbers

- `phoneNumber` → `list` – GET `/phone-number`
- `phoneNumber` → `get` – GET `/phone-number/{id}`
- `phoneNumber` → `buy` – POST `/phone-number` (purchase/provision number via Vapi)
- `phoneNumber` → `delete` – DELETE `/phone-number/{id}`

#### Resource: Squads

- `squad` → `create` – POST `/squad`
- `squad` → `get` – GET `/squad/{id}`
- `squad` → `list` – GET `/squad`
- `squad` → `update` – PATCH `/squad/{id}`
- `squad` → `delete` – DELETE `/squad/{id}`

#### Resource: Tools

- `tool` → `list` – GET `/tool` (List Tools)
- `tool` → `get` – GET `/tool/{id}`

> Note for the agent: If any of the above endpoints do not exist in the live API, still structure the code to make it easy to remove/adjust the unsupported operations. The spec is written to be **maximally useful**; slight mismatches can be resolved by adjusting the path or removing the operation.

#### Trigger node: Vapi Trigger

- Exposes a **webhook** node that listens for HTTP POST requests from Vapi server URLs.
- Should support:
  - A unique webhook path
  - Optionally secret verification (shared secret header / bearer)
  - Returning the **raw webhook JSON** into n8n as output items

***

## 2. Vapi REST API – Core Concepts

### 2.1. Base URL & Authentication

- Base URL: `https://api.vapi.ai`
- Authentication: **Bearer token** in `Authorization` header

Example:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
Accept: application/json
```

The API key is obtained from the Vapi Dashboard. The n8n `VapiApi` credentials will store this API key.

### 2.2. Common query parameters

Most `list` endpoints support common query parameters with consistent semantics[1][2][3][4][5]:

- `limit` (number, optional, 0–1000) – max number of items, defaults to 100
- `createdAtGt`, `createdAtLt`, `createdAtGe`, `createdAtLe` – ISO 8601 date filters for `createdAt`
- `updatedAtGt`, `updatedAtLt`, `updatedAtGe`, `updatedAtLe` – ISO 8601 date filters for `updatedAt`

The `Calls` list endpoint also accepts filter parameters like[4]:
- `id` – filter by call id
- `assistantId` – filter by assistant id
- `phoneNumberId` – filter by phone number id

These should be exposed as optional parameters in the n8n node.

### 2.3. Resources overview

From the API reference pages for **Calls**, **Assistants**, **Squads**, **Phone Numbers**, and **Tools**[1][2][3][4][5]:

- **Calls** (`/call`)
  - `GET /call` – list calls
  - `POST /call` – create call (outbound or scheduled)
  - `GET /call/{id}` – retrieve a call
  - (Potentially) `POST /call/{id}/end` – end a call
- **Assistants** (`/assistant`)
  - `GET /assistant` – list assistants
  - `POST /assistant` – create assistant
  - `GET /assistant/{id}` – get assistant
  - `PATCH /assistant/{id}` – update assistant
  - `DELETE /assistant/{id}` – delete assistant
- **Squads** (`/squad`)
  - `GET /squad` – list squads
  - `POST /squad` – create squad
  - `GET /squad/{id}` – get squad
  - `PATCH /squad/{id}` – update squad
  - `DELETE /squad/{id}` – delete squad
- **Phone Numbers** (`/phone-number`)
  - `GET /phone-number` – list numbers
  - Likely `POST /phone-number` – buy number (per docs about provisioning via Twilio)
  - `GET /phone-number/{id}` – get number
  - `DELETE /phone-number/{id}` – release number
- **Tools** (`/tool`)
  - `GET /tool` – list tools
  - `GET /tool/{id}` – get tool

Each list endpoint supports `limit` and created/updated date filters, and returns arrays of resource-specific objects.[1][2][3][4][5]

***

## 3. Resource Details for the Agent

This section condenses the essential request/response structure that the agent needs to correctly build body/parameter definitions. We **do not** need every nested property defined as first-class n8n parameters – the idea is to expose the most useful fields and a generic JSON editor for advanced payloads.

### 3.1. Calls

#### 3.1.1. List Calls – GET `/call`

**Request**[4]:

- Method: `GET`
- URL: `https://api.vapi.ai/call`
- Headers: `Authorization: Bearer <apiKey>`
- Query params:
  - `id` (string, optional)
  - `assistantId` (string, optional)
  - `phoneNumberId` (string, optional)
  - `limit` (number, optional)
  - `createdAtGt`, `createdAtLt`, `createdAtGe`, `createdAtLe` (ISO datetime, optional)
  - `updatedAtGt`, `updatedAtLt`, `updatedAtGe`, `updatedAtLe` (ISO datetime, optional)

**Response** (array of Call objects)[4]:

Key properties to surface in n8n:

- `id` – call id
- `orgId`
- `createdAt`, `updatedAt`, `startedAt`, `endedAt`
- `type` – `inboundPhoneCall` | `outboundPhoneCall` | `webCall` | `vapi.websocketCall`
- `status` – call status enum
- `endedReason`, `endedMessage`
- `assistantId`, `squadId`, `workflowId`
- `phoneNumberId`, `customerId`
- `cost`, `costBreakdown`
- `analysis`, `artifact`, `compliance`, `monitor` (nested analytics/observability)

The node can just `returnData.push({ json: response })` where `response` is either the array or an object containing `data`.

#### 3.1.2. Create Call – POST `/call`

**Request**[5][6]:

- Method: `POST`
- URL: `https://api.vapi.ai/call`
- Headers: `Authorization: Bearer <apiKey>`, `Content-Type: application/json`
- Body (object):
  - `assistantId` (string, optional)
  - `assistant` (object, optional) – transient assistant
  - `assistantOverrides` (object, optional)
  - `squadId` / `squad` / `squadOverrides` (optional)
  - `workflowId` / `workflow` / `workflowOverrides` (optional)
  - `phoneNumberId` / `phoneNumber` (optional, for phone calls)
  - `customerId` / `customer` (optional, for outbound phone calls)
  - `customers` (array of `customer` objects) – for batch calls
  - `schedulePlan` (object, optional) – e.g., `earliestAt` schedule time
  - `name` (string, optional)

For outbound phone calls, a minimal useful payload is[6]:

```json
{
  "assistantId": "assistant-id",
  "phoneNumberId": "phone-number-id",
  "customer": {
    "number": "+11231231234"
  }
}
```

and optionally with scheduling/batch:

```json
{
  "assistantId": "assistant-id",
  "phoneNumberId": "phone-number-id",
  "customers": [
    { "number": "+11231231234" },
    { "number": "+12342342345" }
  ],
  "schedulePlan": {
    "earliestAt": "2025-05-30T00:00:00Z"
  }
}
```

**Response**[5]:

- Either a single `Call` object or a `CallBatchResponse` with info about scheduled/created calls.

In n8n, the node can:

- Let the user either:
  - Provide structured fields (assistantId, phoneNumberId, single customer number, schedule datetime)
  - OR pass a **raw JSON body** in an `additionalFields.rawBody` parameter
- Build the correct request body accordingly.

#### 3.1.3. Get Call – GET `/call/{id}`

- Method: `GET`
- URL: `https://api.vapi.ai/call/{id}`
- Path param: `id` (string, required)
- Response: Call object (same shape as in List Calls)[4].

#### 3.1.4. End Call – POST `/call/{id}/end` (if available)

- Method: `POST`
- URL: `https://api.vapi.ai/call/{id}/end`
- Body: usually empty
- Response: updated Call / confirmation

If this endpoint doesn't exist in the live docs, the agent should either skip implementation or keep it behind a feature flag.

***

### 3.2. Assistants

#### 3.2.1. List Assistants – GET `/assistant`

**Request**[2]:

- Method: `GET`
- URL: `https://api.vapi.ai/assistant`
- Query params: `limit`, `createdAtGt`, `createdAtLt`, `createdAtGe`, `createdAtLe`, `updatedAtGt`, `updatedAtLt`, `updatedAtGe`, `updatedAtLe`

**Response**[2]:

Each Assistant object includes (key fields):

- `id`, `orgId`, `createdAt`, `updatedAt`
- `transcriber` (object) – configuration for speech-to-text
- `model` (object) – LLM options (provider, model name, temperature, etc.)
- `voice` (object) – voice settings
- `firstMessage`, `firstMessageInterruptionsEnabled`, `firstMessageMode`
- `voicemailDetection`
- `clientMessages`, `serverMessages`
- `maxDurationSeconds`
- `backgroundSound`
- `modelOutputInMessagesEnabled`
- `transportConfigurations`
- `observabilityPlan`
- `credentials`
- `hooks`
- `name`
- `voicemailMessage`, `endCallMessage`, `endCallPhrases`
- `compliancePlan`
- `metadata`
- `backgroundSpeechDenoisingPlan`
- `analysisPlan`
- `artifactPlan`
- `startSpeakingPlan`, `stopSpeakingPlan`
- `monitorPlan`
- `credentialIds`
- `server` – server URL and credentials for webhooks
- `keypadInputPlan`

The node can just return raw assistant objects.

#### 3.2.2. Create Assistant – POST `/assistant`

- Method: `POST`
- URL: `https://api.vapi.ai/assistant`
- Body: object with relevant fields from above; at minimum we typically need:
  - `name` (string)
  - `model` (object) – including provider/model
  - `voice` (object)
  - Optionally `firstMessage`, `server`, etc.

Design for n8n:

- Expose **common fields** as first-class parameters:
  - `name`
  - `firstMessage`
  - `firstMessageMode`
  - `maxDurationSeconds`
  - `backgroundSound`
  - A simplified `model` section (provider + model name + temperature)
  - A simplified `voice` section (voice provider + voice id/name)
- Also expose a `rawBody` JSON parameter for advanced users.

#### 3.2.3. Get Assistant – GET `/assistant/{id}`

- Method: `GET`
- URL: `https://api.vapi.ai/assistant/{id}`
- Response: Assistant object[2].

#### 3.2.4. Update Assistant – PATCH `/assistant/{id}`

- Method: `PATCH`
- URL: `https://api.vapi.ai/assistant/{id}`
- Body: any subset of Assistant fields to update.

In n8n, we can:

- Require `id` (string) and allow user to provide fields to update:
  - `name`, `firstMessage`, `maxDurationSeconds`, etc.
  - Or use `rawBody` JSON.

#### 3.2.5. Delete Assistant – DELETE `/assistant/{id}`

- Method: `DELETE`
- URL: `https://api.vapi.ai/assistant/{id}`
- Response: empty or confirmation.

***

### 3.3. Squads

Squads allow multi-assistant conversations and handoffs.[3][7]

#### 3.3.1. List Squads – GET `/squad`

- Method: `GET`
- URL: `https://api.vapi.ai/squad`
- Query params: `limit`, `createdAt*`, `updatedAt*` (same pattern as before)[3].

**Response**[3]:

Key fields:

- `id`, `orgId`, `createdAt`, `updatedAt`
- `name`
- `members` (array of squad member objects):
  - each member includes information about the assistant and routing
- `membersOverrides` – global overrides for assistants in the squad

#### 3.3.2. Create Squad – POST `/squad`

Body: includes `name`, `members`, and optional `membersOverrides`[3][7].

A typical structure:

```json
{
  "name": "Support Squad",
  "members": [
    {
      "assistantId": "assistant-main",
      "assistantOverrides": {}
    },
    {
      "assistantId": "assistant-billing"
    }
  ],
  "membersOverrides": {}
}
```

#### 3.3.3. Get / Update / Delete Squad

- GET `/squad/{id}` – returns squad with same structure
- PATCH `/squad/{id}` – partial update (e.g., update members)
- DELETE `/squad/{id}` – remove squad

In n8n, implement these with simple `id` + either field params or `rawBody`.

***

### 3.4. Phone Numbers

#### 3.4.1. List Phone Numbers – GET `/phone-number`

- Method: `GET`
- URL: `https://api.vapi.ai/phone-number`
- Query params: `limit`, `createdAt*`, `updatedAt*`[5].

**Response**[5]:

The response includes different shapes depending on provider:

- `byo-phone-number` – bring-your-own
- `twilio`
- `vonage`
- `vapi`
- `telnyx`

Each has fields like number, provider, configuration, and server URLs.

For n8n, we can surface:

- `id`
- `number`
- `provider`
- `server` (if applicable)
- `createdAt`, `updatedAt`

#### 3.4.2. Buy / Create Phone Number – POST `/phone-number`

The docs mention provisioning numbers through Vapi (via Twilio)[8].

- Method: `POST`
- URL: `https://api.vapi.ai/phone-number`
- Body: fields describing country, capabilities, area code, etc.
- Response: new phone number object.

#### 3.4.3. Get / Delete Phone Number

- GET `/phone-number/{id}` – get phone number
- DELETE `/phone-number/{id}` – release phone number

***

### 3.5. Tools

Tools represent function-calling and integrations the assistant can use.[1]

#### 3.5.1. List Tools – GET `/tool`

**Request**[1]:

- Method: `GET`
- URL: `https://api.vapi.ai/tool`
- Query params: `limit`, `createdAt*`, `updatedAt*`

**Response**[1]:

The response is a list of tool objects. Tools can be of many types:

- `apiRequest`
- `code`
- `dtmf`
- `endCall`
- `function`
- `transferCall`
- `handoff`
- `bash`
- `computer`
- `textEditor`
- `query`
- `google.calendar.event.create`
- `google.sheets.row.append`
- `google.calendar.availability.check`
- `slack.message.send`
- `sms`
- `mcp`
- `gohighlevel.*` tools
- `sipRequest`
- `voicemail`

Each type has a specific schema, but for n8n we can return the raw JSON and let users inspect it.

#### 3.5.2. Get Tool – GET `/tool/{id}`

- Method: `GET`
- URL: `https://api.vapi.ai/tool/{id}`
- Response: tool object.

***

## 4. Webhooks & Server URLs

Vapi uses **Server URLs** to send real-time conversation events to your backend.[9][10]

### 4.1. Server URLs

Server URLs can be configured at multiple levels[3][10]:

- Account-wide
- Phone Number
- Assistant
- Function (tool)

The server configuration includes:

- `server.url` – webhook endpoint URL
- `server.credentialId` – reference to Vapi-side credentials to authenticate toward your server

### 4.2. Webhook payloads

Vapi sends different message types to the server URL, including[2][10]:

- `conversation-update`
- `function-call`
- `tool-calls`
- `end-of-call-report`
- `status-update`
- `speech-update`
- `transfer-destination-request`
- `handoff-destination-request`
- `user-interrupted`
- `assistant.started`

The exact payload schemas are defined in Vapi docs as `ServerMessage` and `ClientMessage` schemas.[2]

For the n8n node, we will treat the **incoming webhook body as opaque JSON** and return it as-is to the workflow.

### 4.3. Authentication (Vapi → Your Server)

Vapi recommends using **Custom Credentials** and `credentialId` to reference those credentials in your assistant / phone number configs.[10]

When configured, Vapi will include an `Authorization: Bearer <token>` header when calling your webhook[10].

For n8n, we can optionally:

- Allow the user to specify a **shared secret** header name + value
- Validate it in the `VapiTrigger` node before accepting the request

***

## 5. n8n Node Design – Vapi (Main Node)

### 5.1. Node description skeleton

The `Vapi` node is a **programmatic-style** n8n node with a `resource` + `operation` pattern.

Key properties for `description`:

```ts
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
      // Resource & operation selectors
    ],
  };

  async execute(this: IExecuteFunctions) {
    // Implementation
  }
}
```

### 5.2. Resources & operations in node properties

We define a top-level `resource` parameter with options:

```ts
{
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  options: [
    { name: 'Call', value: 'call' },
    { name: 'Assistant', value: 'assistant' },
    { name: 'Phone Number', value: 'phoneNumber' },
    { name: 'Squad', value: 'squad' },
    { name: 'Tool', value: 'tool' },
  ],
  default: 'call',
}
```

For each resource, define an `operation` parameter conditioned by `displayOptions.show.resource`.

Example for Calls:

```ts
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  displayOptions: {
    show: {
      resource: ['call'],
    },
  },
  options: [
    { name: 'Create', value: 'create', description: 'Create a call' },
    { name: 'Get', value: 'get', description: 'Get a call' },
    { name: 'List', value: 'list', description: 'List calls' },
    // Optional: { name: 'End', value: 'end', description: 'End a call' },
  ],
  default: 'create',
}
```

Then for each `(resource, operation)` combination, define parameters.

#### 5.2.1. Example: Call → Create

Parameters:

- `assistantId` (string)
- `phoneNumberId` (string)
- `customerNumber` (string)
- `schedulePlan.earliestAt` (datetime)
- `additionalFields` (collection) containing advanced options and raw JSON.

```ts
{
  displayName: 'Assistant',
  name: 'assistantId',
  type: 'string',
  default: '',
  required: true,
  displayOptions: { show: { resource: ['call'], operation: ['create'] } },
},
{
  displayName: 'Phone Number',
  name: 'phoneNumberId',
  type: 'string',
  default: '',
  required: true,
  displayOptions: { show: { resource: ['call'], operation: ['create'] } },
},
{
  displayName: 'Customer Number',
  name: 'customerNumber',
  type: 'string',
  default: '',
  placeholder: '+11234567890',
  required: true,
  displayOptions: { show: { resource: ['call'], operation: ['create'] } },
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
      displayName: 'Raw Body (JSON)',
      name: 'rawBody',
      type: 'json',
      default: '',
      description: 'Full raw JSON body to send instead of structured fields',
    },
  ],
},
```

In `execute`, if `rawBody` is set, use it directly; otherwise construct the body from structured fields.

#### 5.2.2. Example: Call → List

Parameters: `limit`, filters.

```ts
{
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  typeOptions: { minValue: 1, maxValue: 1000 },
  default: 100,
  displayOptions: { show: { resource: ['call'], operation: ['list'] } },
},
{
  displayName: 'Filters',
  name: 'filters',
  type: 'collection',
  default: {},
  displayOptions: { show: { resource: ['call'], operation: ['list'] } },
  options: [
    { displayName: 'ID', name: 'id', type: 'string', default: '' },
    { displayName: 'Assistant ID', name: 'assistantId', type: 'string', default: '' },
    { displayName: 'Phone Number ID', name: 'phoneNumberId', type: 'string', default: '' },
    { displayName: 'Created At >', name: 'createdAtGt', type: 'dateTime', default: '' },
    // ... other datetime filters
  ],
},
```

***

### 5.3. Execute method – request helper

In `execute`, we:

1. Iterate over `items`.
2. Read `resource` and `operation`.
3. Map to HTTP method + path + query/body.
4. Use `this.helpers.request` or `this.helpers.httpRequest` to call the Vapi API.
5. Push results as `{ json: response }`.

Suggested helper:

```ts
async execute(this: IExecuteFunctions) {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  const credentials = await this.getCredentials('vapiApi');
  const apiKey = credentials.apiKey as string;

  const baseUrl = 'https://api.vapi.ai';

  for (let i = 0; i < items.length; i++) {
    const resource = this.getNodeParameter('resource', i) as string;
    const operation = this.getNodeParameter('operation', i) as string;

    let method: string;
    let endpoint: string;
    let qs: IDataObject = {};
    let body: IDataObject | undefined;

    if (resource === 'call') {
      if (operation === 'create') {
        method = 'POST';
        endpoint = '/call';
        // Build body from node parameters or rawBody
      } else if (operation === 'get') {
        method = 'GET';
        const id = this.getNodeParameter('id', i) as string;
        endpoint = `/call/${id}`;
      } else if (operation === 'list') {
        method = 'GET';
        endpoint = '/call';
        // Build qs from filters
      } else {
        throw new Error(`Unsupported call operation: ${operation}`);
      }
    }

    // Similar blocks for assistant, phoneNumber, squad, tool

    const options: IHttpRequestOptions = {
      method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      qs,
      body,
      json: true,
    };

    const responseData = await this.helpers.httpRequest(options);

    if (Array.isArray(responseData)) {
      for (const entry of responseData) {
        returnData.push({ json: entry });
      }
    } else {
      returnData.push({ json: responseData });
    }
  }

  return this.prepareOutputData(returnData);
}
```

The agent must fill in the missing parts for each `(resource, operation)` combination, following the API rules described earlier.

***

## 6. n8n Credentials – VapiApi

Create `credentials/VapiApi.credentials.ts`:

```ts
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
```

The agent should also export this in the compiled index.

***

## 7. n8n Trigger Node – VapiTrigger

The `VapiTrigger` node should:

- Implement `INodeType` with `webhooks` configuration.
- Expose a single webhook input (`/webhook` path configurable via parameter or derived from node id).
- Accept **POST** requests from Vapi.
- Optionally validate a shared secret header.
- Emit one item with `json` set to the webhook body.

### 7.1. Node description

Key parts:

```ts
export class VapiTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Vapi Trigger',
    name: 'vapiTrigger',
    icon: 'file:vapi.svg',
    group: ['trigger'],
    version: 1,
    description: 'Starts the workflow when Vapi sends a webhook',
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
        displayName: 'Verify Secret Header',
        name: 'verifySecret',
        type: 'boolean',
        default: false,
      },
      {
        displayName: 'Header Name',
        name: 'secretHeaderName',
        type: 'string',
        default: 'x-vapi-signature',
        displayOptions: { show: { verifySecret: [true] } },
      },
      {
        displayName: 'Expected Value',
        name: 'secretHeaderValue',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        displayOptions: { show: { verifySecret: [true] } },
      },
    ],
  };

  async webhook(this: IWebhookFunctions) {
    const req = this.getRequestObject();
    const res = this.getResponseObject();

    const verifySecret = this.getNodeParameter('verifySecret', 0) as boolean;

    if (verifySecret) {
      const headerName = this.getNodeParameter('secretHeaderName', 0) as string;
      const expected = this.getNodeParameter('secretHeaderValue', 0) as string;
      const actual = req.headers[headerName.toLowerCase()] as string | string[] | undefined;

      if (!actual || (Array.isArray(actual) ? !actual.includes(expected) : actual !== expected)) {
        res.status(401).json({ error: 'Unauthorized' });
        return { workflowData: [] };
      }
    }

    const body = req.body as IDataObject;

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
```

The agent should adapt the code to n8n v2+ webhook API if needed, but this gives the structure.

***

## 8. Project Structure

The generated project should follow this layout:

```text
n8n-nodes-vapi/
  package.json
  tsconfig.json
  nodes/
    Vapi/
      Vapi.node.ts
      vapi.svg
    VapiTrigger/
      VapiTrigger.node.ts
  credentials/
    VapiApi.credentials.ts
  index.ts
```

`index.ts` should export nodes and credentials:

```ts
import { Vapi } from './nodes/Vapi/Vapi.node';
import { VapiTrigger } from './nodes/VapiTrigger/VapiTrigger.node';
import { VapiApi } from './credentials/VapiApi.credentials';

export { Vapi, VapiTrigger, VapiApi };
```

***

## 9. Implementation Checklist for the Agent

1. **Create package skeleton**
   - `package.json` with `n8n.n8nNodesApiVersion = 1` and node/credentials entries.
   - `tsconfig.json` compatible with n8n community-node starter.

2. **Implement credentials**
   - `VapiApi.credentials.ts` as defined above.

3. **Implement main node** `Vapi.node.ts`
   - `resource` options: call, assistant, phoneNumber, squad, tool.
   - `operation` options per resource as described.
   - For each `(resource, operation)` pair, implement:
     - Parameters in `description.properties`.
     - Mapping in `execute()` to HTTP method, path, query, body.
   - Use `Authorization: Bearer <apiKey>` header.
   - Return data as `{ json: response }`, flattening arrays.

4. **Implement trigger node** `VapiTrigger.node.ts`
   - Single POST webhook.
   - Optional shared-secret validation.
   - Return webhook JSON as `json`.

5. **Build & type-check**
   - Add scripts: `build`, `lint`, etc., similar to `n8n-nodes-starter`.

6. **Publish** (manual step for human, not agent)
   - `npm publish --access public`.

***

## 10. Notes for the AI Agent

- If any endpoint described here has a slightly different path or method in the live Vapi docs, prefer the **official docs**, but keep the **resource/operation structure** the same.
- Do not over-model every nested field; expose the most common ones, and always provide a `rawBody` (JSON) parameter for power users.
- Keep TypeScript types simple and rely on `IDataObject` for nested structures.
- Follow n8n code style and patterns from `n8n-nodes-starter` for imports and helper usage.

***

References

- Vapi API reference – Calls, Assistants, Squads, Phone Numbers, Tools[1][2][3][4][5]
- Vapi server URLs & webhooks[9][10][7]
- Outbound calling examples[6]
- Squads (multi-assistant conversations) overview[7]