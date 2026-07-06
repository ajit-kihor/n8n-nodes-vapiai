# n8n-nodes-vapiai

An n8n community node package for [Vapi](https://vapi.ai), the developer platform for building voice AI agents over phone, web, and SIP by orchestrating STT, LLM, and TTS with tools, squads, files, analytics, scorecards, and evals.

This package provides two nodes:

- **Vapi**: Main operation node for the Vapi REST API
- **Vapi Trigger**: Webhook trigger node for Vapi server/client message events

## Supported Resources and Operations

### Calls

| Operation | Description |
|-----------|-------------|
| Create | Create an outbound call or batch of outbound calls |
| Get | Retrieve a call by ID |
| List | List calls with filters |
| End | End an active call |
| Update | Update mutable call fields with Raw Body support for newer API fields |
| Delete Data | Trigger call data deletion for retention or compliance |

### Assistants

| Operation | Description |
|-----------|-------------|
| Create | Create an assistant with model, voice, server, monitor, hook, analysis, and artifact fields |
| Get | Retrieve an assistant by ID |
| List | List assistants |
| Update | Update an assistant |
| Delete | Delete an assistant |

### Phone Numbers

| Operation | Description |
|-----------|-------------|
| Buy | Provision or import a phone number |
| Get | Retrieve a phone number by ID |
| List | List phone numbers |
| Update | Update provider, assistant/squad/workflow routing, and server webhook settings |
| Delete | Delete or release a phone number |

Supported provider shapes include `vapi`, `twilio`, `telnyx`, `vonage`, and `byo-phone-number`. Provider-specific fields can be passed through **Advanced Raw Body (JSON)**.

### Squads

| Operation | Description |
|-----------|-------------|
| Create | Create a squad for multi-assistant routing |
| Get | Retrieve a squad by ID |
| List | List squads |
| Update | Update squad members and overrides |
| Delete | Delete a squad |

### Tools

| Operation | Description |
|-----------|-------------|
| Create | Create tools with structured fields or Raw Body |
| Get | Retrieve a tool by ID |
| List | List tools |
| Update | Update a tool |
| Delete | Delete a tool |

The node exposes common fields for function/webhook tools, code tools, call-control tools, query/MCP tools, Slack/SMS, Google, and GoHighLevel integrations. It supports all current Vapi tool types via explicit fields and Raw Body. For newly added tool types, pass them directly as JSON via **Raw Body** according to the official tools documentation.

### Files

| Operation | Description |
|-----------|-------------|
| Upload / Create | Upload a file from binary data, text content, or a URL |
| Get | Retrieve a file by ID |
| List | List files |
| Update | Update mutable file fields such as name |
| Delete | Delete a file |

Files can be used as inputs to assistant knowledge bases, tools, and other assistant-side artifacts. n8n workflows can manage the full file lifecycle and then reference file IDs/URLs in assistant or tool Raw Body payloads.

## Installation

### In n8n

1. Go to **Settings -> Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-vapiai`
4. Click **Install**

### Via npm

```bash
npm install n8n-nodes-vapiai
```

## Credentials

1. Go to **Credentials -> New**
2. Search for **Vapi API**
3. Enter your API key from the [Vapi Dashboard](https://dashboard.vapi.ai)

All requests use:

```http
Authorization: Bearer <VAPI_API_KEY>
```

Base URL:

```text
https://api.vapi.ai
```

## Raw Body Behavior

Create and update operations use structured fields first, then merge **Advanced Raw Body (JSON)** last. That means Raw Body top-level keys override structured values.

Example: if the node UI sets `assistantId` but Raw Body contains `{"assistantId":"new_assistant_id"}`, the request sent to Vapi uses `new_assistant_id`.

## Examples

### Create a Function Tool

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "City name"
        }
      },
      "required": ["location"]
    }
  },
  "server": {
    "url": "https://your-server.com/weather"
  }
}
```

### Attach a New Assistant to an Existing Phone Number

Use **Phone Number -> Update** and set Raw Body:

```json
{
  "assistantId": "new_assistant_id"
}
```

### Update a Phone Number Server URL

Use **Phone Number -> Update** with `provider` set to `twilio` and server fields in the UI, or pass Raw Body:

```json
{
  "provider": "twilio",
  "server": {
    "url": "https://your-n8n.example/webhook/vapi",
    "timeoutSeconds": 20,
    "headers": {
      "x-vapi-secret": "shared-secret"
    }
  }
}
```

### Create a Squad with Handoff Behavior

```json
{
  "name": "front-desk-routing",
  "members": [
    {
      "assistantId": "front_desk_assistant_id",
      "assistantOverrides": {
        "firstMessage": "Thanks for calling. How can I help?"
      }
    },
    {
      "assistantId": "billing_assistant_id",
      "assistantOverrides": {
        "firstMessage": "I can help with billing."
      }
    }
  ],
  "membersOverrides": {
    "serverMessages": ["tool-calls", "end-of-call-report"]
  }
}
```

### Workflow Ideas

- Inbound call from a Vapi phone number -> Vapi Trigger -> n8n processes the payload and updates a CRM -> optional SMS or email follow-up.
- Outbound campaign setup using Calls + Files, with a knowledge-base file uploaded from n8n and monitoring artifacts tracked in dashboards.
- Assistant with code tools and GoHighLevel/Slack integration tools triggered by voice, orchestrated from n8n.
- Compliance workflow that periodically calls **Call -> Delete Data** after your retention period.

## Vapi Trigger

1. Add a **Vapi Trigger** node to your workflow
2. Copy the generated Webhook URL
3. Set it as the Server URL in Vapi at the org, assistant, phone number, or tool level
4. Optionally enable **Verify Secret Header**

The trigger supports **All Events** mode. In this mode every Vapi event is forwarded to n8n and the output includes a normalized `json.type` field so you can branch with an IF or Switch node.

Common event types include:

- `conversation-update`
- `end-of-call-report`
- `tool-calls`
- `tool-calls-result`
- `status-update`
- `speech-update`
- `transcript`
- `transfer-destination-request`
- `transfer-update`
- `handoff-destination-request`
- `assistant-request`
- `knowledge-base-request`
- `voice-request`
- `assistant.started`
- `assistant.speechStarted`
- `workflow.node.started`
- `chat.created`
- `session.created`
- `call.deleted`
- `call.delete.failed`

### Secret Header Verification

Enable **Verify Secret Header** when Vapi is configured to send a shared secret header. The trigger rejects requests unless the configured header name and value match. This is useful for protecting public n8n webhook URLs.

## Development

```bash
npm install
npm run build
npm run lint
```

This repository's `prepublishOnly` script runs build and lint before publishing.

## Resources

- [Vapi Documentation](https://docs.vapi.ai)
- [Vapi API Reference](https://docs.vapi.ai/api-reference)
- [Vapi Tools](https://docs.vapi.ai/tools)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT
