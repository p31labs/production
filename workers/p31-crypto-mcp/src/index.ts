/**
 * p31-crypto-mcp — Post-Quantum Crypto MCP Wrapper (Streamable HTTP)
 *
 * ⚠️ DEMO SHIM — INTERFACE SCAFFOLD ONLY. NOT A CRYPTO SERVICE.
 *
 * The tools below return synthetic/placeholder values. They do NOT perform
 * real cryptography and MUST NOT be cited as evidence of NIST/FIPS compliance.
 * `pqc_verify` does not verify; `pqc_audit` does not audit.
 *
 * The REAL, tested post-quantum primitives live in:
 *   - packages/sovereign-primitives/src/postQuantum.ts  (ML-KEM-768, ML-DSA-65, SLH-DSA-128s)
 *   - packages/sovereign-primitives/src/composite.ts     (Ed25519 + ML-DSA-65 composite)
 *   - workers/ledger-bridge/src/sdjwt.ts                 (ML-DSA-65 SD-JWT signing)
 *   - workers/federation-bridge/src/index.ts             (ML-DSA-65 verification)
 *
 * TODO(crypto-mcp): wire these tools to the real primitives (delegate to
 * ledger-bridge / federation-bridge). Until then, `demoShim: true` is returned
 * on every response.
 *
 * Implements Streamable HTTP per 2025-06-18 MCP spec:
 *   POST /mcp — JSON-RPC 2.0
 *   GET /mcp  — SSE notification stream
 */

export interface Env {
  LEDGER_BRIDGE_URL: string;
  FEDERATION_BRIDGE_URL: string;
  TALER_BRIDGE_URL: string;
  X402_GATEWAY_URL: string;
}

function id(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

function cors(body: string, status = 200): Response {
  return new Response(body, { status, headers: {
    'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
  }});
}

const TOOLS = [
  { name: 'pqc_keygen', description: 'Generate ML-DSA-65 + Ed25519 hybrid keypair for post-quantum signing.',
    inputSchema: { type: 'object', properties: { didMethod: { type: 'string', enum: ['key','jwk'] } } } },
  { name: 'pqc_sign', description: 'Sign data with ML-DSA-65 + Ed25519 composite signature (defense-in-depth).',
    inputSchema: { type: 'object', properties: { data: { type: 'string' }, did: { type: 'string' } }, required: ['data','did'] } },
  { name: 'pqc_verify', description: 'Verify ML-DSA-65 + Ed25519 composite signature.',
    inputSchema: { type: 'object', properties: { data: { type: 'string' }, signature: { type: 'string' }, did: { type: 'string' } }, required: ['data','signature','did'] } },
  { name: 'kem_encapsulate', description: 'X-Wing KEM: ML-KEM-768 (FIPS 203) + X25519 hybrid encapsulate.',
    inputSchema: { type: 'object', properties: { recipientPublicKeyHex: { type: 'string' }, contextLabel: { type: 'string' } }, required: ['recipientPublicKeyHex'] } },
  { name: 'kem_decapsulate', description: 'X-Wing KEM: ML-KEM-768 + X25519 hybrid decapsulate.',
    inputSchema: { type: 'object', properties: { ciphertext: { type: 'string' }, contextLabel: { type: 'string' } }, required: ['ciphertext'] } },
  { name: 'sd_jwt_issue', description: 'Issue SD-JWT (RFC 9901) credential with selectively disclosable claims.',
    inputSchema: { type: 'object', properties: { subjectDid: { type: 'string' }, claims: { type: 'object' }, issuerDid: { type: 'string' }, algorithm: { type: 'string', enum: ['Ed25519','ML-DSA-65'] } }, required: ['subjectDid','claims','issuerDid'] } },
  { name: 'sd_jwt_present', description: 'Present SD-JWT credential with selective disclosure.',
    inputSchema: { type: 'object', properties: { credential: { type: 'string' }, disclose: { type: 'array', items: { type: 'string' } }, holderDid: { type: 'string' } }, required: ['credential','disclose','holderDid'] } },
  { name: 'taler_withdraw', description: 'Withdraw LOVE credits as GNU Taler blind-signed coins.',
    inputSchema: { type: 'object', properties: { amount: { type: 'number' }, walletDid: { type: 'string' } }, required: ['amount','walletDid'] } },
  { name: 'taler_pay', description: 'Pay with Taler blind-signed coins via exchange.',
    inputSchema: { type: 'object', properties: { amount: { type: 'number' }, merchantDid: { type: 'string' }, reference: { type: 'string' } }, required: ['amount','merchantDid','reference'] } },
  { name: 'x402_request', description: 'Create x402 payment request (Coinbase) for MCP tool access.',
    inputSchema: { type: 'object', properties: { toolName: { type: 'string' }, maxAmount: { type: 'number' } }, required: ['toolName','maxAmount'] } },
  { name: 'x402_accept', description: 'Accept x402 payment and confirm tool access.',
    inputSchema: { type: 'object', properties: { paymentId: { type: 'string' }, txHash: { type: 'string' } }, required: ['paymentId','txHash'] } },
  { name: 'pqc_audit', description: 'Audit PQC readiness across ML-DSA-65, ML-KEM-768, SD-JWT, Taler, x402.',
    inputSchema: { type: 'object', properties: { scope: { type: 'string', enum: ['all','signatures','kem','sdjwt','taler'] } } } },
];

const DEMO_NOTE = 'DEMO SHIM — synthetic values, no cryptography performed. Real primitives: packages/sovereign-primitives + workers/ledger-bridge.';

function executeTool(name: string, args: any): any {
  const shim = (payload: any) => ({ demoShim: true, attested: false, note: DEMO_NOTE, ...payload });
  switch (name) {
    case 'pqc_keygen': return shim({ keypair: { did: `did:${args.didMethod||'key'}:z${id().slice(0,16)}`, algorithms: ['Ed25519 (FIPS 186-5)','ML-DSA-65 (FIPS 204)'], keyType: 'hybrid-composite' } });
    case 'pqc_sign': return shim({ signature: { data: args.data.slice(0,16)+'...', did: args.did, compositeSig: id().slice(0,32), algorithms: ['Ed25519','ML-DSA-65'] } });
    case 'pqc_verify': return shim({ valid: null, reason: 'not evaluated — demo shim performs no verification' });
    case 'kem_encapsulate': return shim({ ciphertext: id().slice(0,48), kem: 'X-Wing (ML-KEM-768 + X25519)', algorithm: 'FIPS 203 + X25519' });
    case 'kem_decapsulate': return shim({ sharedSecret: id().slice(0,32), kem: 'X-Wing (ML-KEM-768 + X25519)' });
    case 'sd_jwt_issue': return shim({ credential: { format: 'dc+sd-jwt', id: `urn:uuid:${id()}`, claims: Object.keys(args.claims), algorithm: args.algorithm||'Ed25519' } });
    case 'sd_jwt_present': return shim({ presentation: { holder: args.holderDid, disclosed: args.disclose, verified: null, reason: 'not evaluated — demo shim' } });
    case 'taler_withdraw': return shim({ withdrawal: { amount: args.amount, wallet: args.walletDid, coins: Math.ceil(args.amount), blindSignature: 'taler-cbs-blinded', exchange: 'exchange.demo.taler.net' } });
    case 'taler_pay': return shim({ payment: { amount: args.amount, merchant: args.merchantDid, receipt: `taler-${id().slice(0,16)}`, status: 'completed' } });
    case 'x402_request': return shim({ request: { id: `x402-${id().slice(0,12)}`, tool: args.toolName, maxAmount: `${args.maxAmount} USD cents` } });
    case 'x402_accept': return shim({ payment: { id: args.paymentId, txHash: args.txHash, status: 'confirmed' }, toolAccess: 'granted' });
    case 'pqc_audit': return shim({ audit: { scope: args.scope||'all', status: 'not-attested', note: 'demo shim cannot attest compliance', components: [
      { name:'ML-DSA-65', status:'implemented in sovereign-primitives (not attested here)' }, { name:'ML-KEM-768', status:'implemented in sovereign-primitives (not attested here)' },
      { name:'SD-JWT', status:'implemented in ledger-bridge (not attested here)' }, { name:'X-Wing KEM', status:'draft-connolly-cfrg-xwing-kem (interface only here)' },
      { name:'Taler CBS', status:'WASM in taler-cbs (not exercised here)' }, { name:'x402', status:'interface only here' } ]}});
    default: return { error: `Unknown tool: ${name}` };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    if (url.pathname === '/mcp' && request.method === 'GET') {
      const body = new ReadableStream({
        start(c) { c.enqueue(new TextEncoder().encode(`event: endpoint\ndata: ${JSON.stringify({ tools: TOOLS.length, service: 'p31-crypto-mcp' })}\n\n`)); c.close(); },
      });
      return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' } });
    }

    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const { id: rpcId, method: rpcMethod, params } = await request.json<any>();
        if (rpcMethod === 'tools/list')
          return cors(JSON.stringify({ jsonrpc:'2.0', id:rpcId, result:{ tools: TOOLS } }));
        if (rpcMethod === 'tools/call') {
          const tool = TOOLS.find(t => t.name === params?.name);
          if (!tool) return cors(JSON.stringify({ jsonrpc:'2.0', id:rpcId, error:{ code:-32602, message:`Unknown tool: ${params?.name}` } }), 400);
          const result = executeTool(params.name, params.arguments || {});
          return cors(JSON.stringify({ jsonrpc:'2.0', id:rpcId, result:{ content:[{ type:'text', text: JSON.stringify(result, null, 2) }] } }));
        }
        if (rpcMethod === 'ping')
          return cors(JSON.stringify({ jsonrpc:'2.0', id:rpcId, result:{} }));
        if (rpcMethod === 'initialize') {
          return cors(JSON.stringify({
            jsonrpc:'2.0', id:rpcId,
            result:{
              protocolVersion:'2024-11-05',
              capabilities:{ tools:{ listChanged:false } },
              serverInfo:{ name:'p31-crypto-mcp', version:'0.1.0' }
            }
          }));
        }
        if (rpcMethod === 'notifications/initialized' || rpcMethod === 'initialized')
          return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
        return cors(JSON.stringify({ jsonrpc:'2.0', id:rpcId, error:{ code:-32601, message:`Method not found: ${rpcMethod}` } }), 400);
      } catch (e: any) {
        return cors(JSON.stringify({ jsonrpc:'2.0', id:null, error:{ code:-32700, message:`Parse error: ${e.message}` } }), 400);
      }
    }

    if (url.pathname === '/health' && request.method === 'GET')
      return cors(JSON.stringify({ status:'ok', service:'p31-crypto-mcp', version:'2.0.0', tools:TOOLS.length, backends:{ ledgerBridge:env.LEDGER_BRIDGE_URL, federationBridge:env.FEDERATION_BRIDGE_URL, talerBridge:env.TALER_BRIDGE_URL, x402Gateway:env.X402_GATEWAY_URL }, timestamp: new Date().toISOString() }));

    if (url.pathname === '/.well-known/mcp/server-card.json' && request.method === 'GET') {
      const card = {
        name: 'p31-crypto-mcp',
        description: 'P31 PQC Crypto MCP Server — DEMO SHIM (interface scaffold only; returns synthetic values, performs no cryptography, not FIPS-attested). Real tested primitives live in packages/sovereign-primitives and workers/ledger-bridge.',
        version: '0.1.0',
        demoShim: true,
        attested: false,
        endpoint: 'https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp',
        transport: 'streamable-http',
        repository: 'https://github.com/p31labs/andromeda',
        homepage: 'https://p31ca.org',
        keywords: ['post-quantum','cryptography','mldsa','mlkem','slhdsa','hybrid','sd-jwt','x402','p31','demo-shim']
      };
      return new Response(JSON.stringify(card), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (url.pathname === '/' && request.method === 'GET')
      return cors(JSON.stringify({ service:'p31-crypto-mcp', demoShim:true, description:'Post-quantum crypto MCP wrapper — DEMO SHIM (synthetic values; real primitives in packages/sovereign-primitives)', tools: TOOLS.map(t=>t.name), mcp:'POST /mcp, GET /mcp (SSE)' }));

    return cors(JSON.stringify({ error:'Not found' }), 404);
  },
};
