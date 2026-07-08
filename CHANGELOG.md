# Changelog

## 1.0.11

- Changed the main Vapi node icon filename to force n8n production installs to fetch the refreshed icon instead of a cached old wordmark.

## 1.0.10

- Added Calls `Update` and `Delete Data` operations.
- Added Phone Numbers `Update`, including provider, assistant/squad/workflow routing, and server webhook configuration fields.
- Added Files resource with upload/create, get, list, update, and delete operations.
- Expanded Tools support for modern Vapi tool categories, including function/webhook, code, integration, call-control, query, MCP, Slack/SMS, Google, GoHighLevel, SIP request, and voicemail tool shapes through structured fields plus Raw Body.
- Added Assistant advanced configuration fields for `monitorPlan`, `analysisPlan`, `artifactPlan`, `hooks`, `observabilityPlan`, `metadata`, and `server`.
- Expanded Squad create/update support for member overrides and advanced Raw Body workflow configuration.
- Expanded Vapi Trigger event options and added future-proof All Events routing with normalized `json.type`.
- Improved Vapi API error reporting with status code and response details when available.
- Refreshed README examples and documented Raw Body override behavior.
