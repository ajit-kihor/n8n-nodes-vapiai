# n8n-nodes-vapiai

An n8n community node package for the [Vapi](https://vapi.ai) voice AI platform.

## Features

This package provides two nodes:

- **Vapi** — Main operation node to interact with the Vapi REST API
- **Vapi Trigger** — Webhook trigger node that starts a workflow when Vapi sends an event

---

## Supported Resources & Operations

### Calls
| Operation | Description |
|-----------|-------------|
| Create | Start an outbound call |
| Get | Retrieve a call by ID |
| List | List all calls with filters |
| End | End an active call |

### Assistants
| Operation | Description |
|-----------|-------------|
| Create | Create a new assistant |
| Get | Retrieve an assistant by ID |
| List | List all assistants |
| Update | Update an existing assistant |
| Delete | Delete an assistant |

### Phone Numbers
| Operation | Description |
|-----------|-------------|
| Buy | Provision a new phone number |
| Get | Retrieve a phone number by ID |
| List | List all phone numbers |
| Delete | Release a phone number |

### Squads
| Operation | Description |
|-----------|-------------|
| Create | Create a new squad |
| Get | Retrieve a squad by ID |
| List | List all squads |
| Update | Update an existing squad |
| Delete | Delete a squad |

### Tools
| Operation | Description |
|-----------|-------------|
| Create | Create a new tool |
| Get | Retrieve a tool by ID |
| List | List all tools |
| Update | Update an existing tool |
| Delete | Delete a tool |

---

## Installation

### In n8n (recommended)

1. Go to **Settings → Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-vapiai`
4. Click **Install**

### Via npm

```bash
npm install n8n-nodes-vapiai
```

---

## Credentials

1. Go to **Credentials → New**
2. Search for **Vapi API**
3. Enter your **API Key** from the [Vapi Dashboard](https://dashboard.vapi.ai)

---

## Usage

### Vapi Node

Select a **Resource** and **Operation**, then fill in the required fields.

All create/update operations include an optional **Raw Body (JSON)** field — useful for passing advanced Vapi parameters not exposed as dedicated fields.

**Example — Create a Tool (function type):**

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": { "type": "string", "description": "City name" }
      },
      "required": ["location"]
    }
  },
  "server": {
    "url": "https://your-server.com/weather"
  }
}
```

Supported tool types: `function`, `apiRequest`, `transferCall`, `endCall`, `dtmf`, `handoff`

---

**Example — Create a Call:**

```json
{
  "assistantId": "your-assistant-id",
  "phoneNumberId": "your-phone-number-id",
  "customer": {
    "number": "+11234567890"
  }
}
```

### Vapi Trigger Node

1. Add a **Vapi Trigger** node to your workflow
2. Copy the generated **Webhook URL**
3. Paste it as the **Server URL** in your Vapi Dashboard (account, assistant, or phone number level)
4. Optionally enable **Verify Secret Header** to validate incoming requests

**Supported event types:**
- `conversation-update`
- `end-of-call-report`
- `function-call`
- `tool-calls`
- `status-update`
- `speech-update`
- `transfer-destination-request`
- `handoff-destination-request`
- `user-interrupted`
- `assistant.started`

---

## Resources

- [Vapi Documentation](https://docs.vapi.ai)
- [Vapi API Reference](https://docs.vapi.ai/api-reference)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

---

## License

MIT
