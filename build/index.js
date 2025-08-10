import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import google from "googlethis";
const server = new Server({
    name: "mcp",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    }
});
const options = {
    page: 0,
    safe: true,
    parse_ads: false,
    additional_params: {
        hl: "en",
        gl: "us",
    }
};
async function search(query) {
    const results = await google.search(query, options);
    return results;
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [{
                name: "search",
                description: "Searches Google for the given query",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"],
                }
            }] };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name == "search") {
        const query = String(request.params.arguments?.query ?? "").trim();
        const result = await search(query);
        return {
            toolResult: result,
        };
    }
    else {
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${request.params.name} not found`);
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
