const ALLOWED_ORIGINS = [
  'https://p31ca.org',
  'https://www.p31ca.org',
  'https://app.p31ca.org',
  ...(import.meta.env.DEV ? ['http://localhost:5200', 'http://localhost:3000'] : []),
];

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

function getOrigin(request: Request): string | null {
  return request.headers.get('Origin');
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonRpcResult(id: string | number | null | undefined, result: unknown, origin: string | null): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', result, id: id ?? null }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin),
      },
    }
  );
}

function jsonRpcErr(
  id: string | number | null | undefined,
  code: number,
  message: string,
  origin: string | null
): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: id ?? null }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin),
      },
    }
  );
}

function corsPreflight(request: Request): Response {
  const origin = getOrigin(request);
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(origin),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function handleInitialize(id: string | number | null | undefined, origin: string | null): Promise<Response> {
  return jsonRpcResult(id, {
    protocolVersion: '2026-07-28',
    capabilities: { tools: {} },
  }, origin);
}

async function handleToolsList(id: string | number | null | undefined, origin: string | null): Promise<Response> {
  try {
    const { getOpenAIFunctionDefinitions } = await import('./commands');
    const defs = getOpenAIFunctionDefinitions();
    const tools = defs.map((d) => ({
      name: d.function.name,
      description: d.function.description,
      inputSchema: {
        type: 'object' as const,
        properties: d.function.parameters.properties,
      },
    }));
    return jsonRpcResult(id, { tools }, origin);
  } catch {
    return jsonRpcResult(id, {
      error:
        'Command registry unavailable at the edge. Browser-bound module cannot load on Cloudflare Workers.',
    }, origin);
  }
}

async function handleToolsCall(
  id: string | number | null | undefined,
  params?: Record<string, unknown>,
  origin: string | null = null
): Promise<Response> {
  const name = params?.name as string | undefined;
  const args = (params?.['arguments'] ?? {}) as Record<string, unknown> | undefined;

  if (!name) {
    return jsonRpcErr(id, -32602, 'Missing required parameter: name', origin);
  }

  try {
    const { executeCommand } = await import('./commands');
    const result = await executeCommand(name, args);
    return jsonRpcResult(id, {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    }, origin);
  } catch {
    return jsonRpcResult(id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'browser-bound command: ' + name }),
        },
      ],
    }, origin);
  }
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return corsPreflight(request);
  }

  if (request.method !== 'POST') {
    return jsonRpcErr(null, -32000, 'Use POST', getOrigin(request));
  }

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return jsonRpcErr(null, -32700, 'Parse error', getOrigin(request));
  }

  if (body.jsonrpc !== '2.0') {
    return jsonRpcErr(body.id, -32600, 'Invalid Request: jsonrpc must be "2.0"', getOrigin(request));
  }

  const { method, params, id } = body;
  const origin = getOrigin(request);

  switch (method) {
    case 'initialize':
      return handleInitialize(id, origin);
    case 'tools/list':
      return handleToolsList(id, origin);
    case 'tools/call':
      return handleToolsCall(id, params, origin);
    default:
      return jsonRpcErr(id, -32601, `Method not found: ${method}`, origin);
  }
}
