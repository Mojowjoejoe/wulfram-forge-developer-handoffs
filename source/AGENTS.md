# Editor development rules

The MCP is a maintained interface to this editor. Every editor feature or fix must
include an MCP impact check and the relevant changes in the same work.

Follow `tools/mcp/MapEditerMCP/MAINTENANCE.md` for synchronization, capability
coverage, regression checks, native build evidence, and release reporting.
Run `node tools/check-mcp-sync.mjs` when shared MCP code or serialization changes.
Do not leave a GUI capability inaccessible to MCP without documenting the reason
and remaining integration work.
