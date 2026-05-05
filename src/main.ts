import { Actor } from 'apify';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import http from 'node:http';

import { TOOLS } from './schemas.js';
import { getStoreSnapshot } from './tools/snapshot.js';
import { trackProductPrice } from './tools/trackPrice.js';
import { compareProductsAcrossBrands } from './tools/compareBrands.js';
import { detectDropsAndRestocks } from './tools/detectDrops.js';

// ============================================================
// Tool dispatcher
// ============================================================

async function dispatchTool(name: string, args: unknown): Promise<unknown> {
  switch (name) {
    case 'get_store_snapshot':
      return getStoreSnapshot(args);
    case 'track_product_price':
      return trackProductPrice(args);
    case 'compare_products_across_brands':
      return compareProductsAcrossBrands(args);
    case 'detect_drops_and_restocks':
      return detectDropsAndRestocks(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ============================================================
// Build MCP server
// ============================================================

function buildMcpServer() {
  const server = new Server(
    { name: 'shopsignal', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema, { target: 'jsonSchema7' }),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await dispatchTool(name, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${message}` }],
      };
    }
  });

  return server;
}

// ============================================================
// HTTP server (Standby mode)
// ============================================================

async function startStandbyServer() {
  const port = parseInt(process.env.ACTOR_STANDBY_PORT ?? '4321', 10);

  // Stateless MCP: create a fresh transport + server per request.
  // SDK 1.x sets _transport = undefined on the Protocol after each response
  // (via _onclose), so reusing a single transport across requests breaks
  // subsequent calls. Per-request instances avoid all inter-request state.
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          server: 'shopsignal',
          version: '0.1.0',
          tools: TOOLS.map((t) => t.name),
        })
      );
      return;
    }
    if (req.url === '/mcp') {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      const server = buildMcpServer();
      server.connect(transport).then(() => transport.handleRequest(req, res)).catch((err) => {
        console.error('[mcp-transport] error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(String(err));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  console.log(`ShopSignal MCP server listening on :${port}/mcp`);
}

// ============================================================
// Direct invocation (legacy / non-MCP fallback)
// ============================================================

async function runDirect() {
  const input = (await Actor.getInput<{ tool?: string } & Record<string, unknown>>()) ?? {};
  const toolName = input.tool ?? 'get_store_snapshot';

  console.log(`Direct invocation: ${toolName}`);
  const result = await dispatchTool(toolName, input);
  await Actor.pushData(result as Record<string, unknown>);
  console.log('Done.');
}

// ============================================================
// Main
// ============================================================

await Actor.init();

// Defensive startup log — shows which env vars Apify actually sets so we can
// diagnose mode-detection failures without guessing.
console.log('Startup env:', {
  APIFY_META_ORIGIN: process.env.APIFY_META_ORIGIN ?? 'unset',
  ACTOR_STANDBY_MODE: process.env.ACTOR_STANDBY_MODE ? 'set' : 'unset',
  ACTOR_STANDBY_PORT: process.env.ACTOR_STANDBY_PORT ?? 'unset',
  ACTOR_WEB_SERVER_PORT: process.env.ACTOR_WEB_SERVER_PORT ?? 'unset',
});

// Apify sets APIFY_META_ORIGIN=STANDBY when the actor is invoked via Standby.
// The old check (ACTOR_STANDBY_MODE === '1') was a local-only convention that
// Apify does not use — it caused every cloud run to fall into direct mode.
const isStandby = process.env.APIFY_META_ORIGIN === 'STANDBY';

if (isStandby) {
  await startStandbyServer();
  // Standby mode: keep process alive until Apify terminates the container
  await new Promise(() => {});
} else {
  await runDirect();
  await Actor.exit();
}
