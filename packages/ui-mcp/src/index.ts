import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

const tokens = {
  colors: {
    cyan: '#00d4ff',
    violet: '#a78bfa',
    amber: '#fbbf24',
    emerald: '#34d399',
    red: '#f87171',
    iris: '#8b5cf6',
    gold: '#fbbf24',
  },
  spacing: {
    xs: '0.75rem',
    sm: '1rem',
    md: '1.333rem',
    lg: '1.778rem',
    xl: '2.37rem',
    '2xl': '3.16rem',
    '3xl': '4.21rem',
  },
  typography: {
    fontSans: 'system-ui, sans-serif',
    fontMono: 'ui-monospace, monospace',
    size: {
      caption: '0.75rem',
      body: '1rem',
      h3: '1.333rem',
      h2: '1.778rem',
      h1: '2.37rem',
      display: '3.16rem',
    },
  },
};

const server = new McpServer({ name: 'p31-ui-tokens', version: '0.1.0' });

server.registerTool(
  'get_token',
  {
    description: 'Get a design token value by category and key',
    inputSchema: {
      category: z.enum(['colors', 'spacing', 'typography']).describe('Token category'),
      key: z.string().describe('Token key (e.g., "cyan", "md", "h1")'),
    },
  },
  async ({ category, key }) => {
    const categoryData = tokens[category as keyof typeof tokens];
    if (!categoryData) {
      return {
        content: [{ type: 'text', text: `Category "${category}" not found` }],
        isError: true,
      };
    }
    const value = categoryData[key as keyof typeof categoryData];
    if (value === undefined) {
      return {
        content: [{ type: 'text', text: `Key "${key}" not found in ${category}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ [key]: value }, null, 2) }],
    };
  },
);

server.registerTool(
  'list_tokens',
  {
    description: 'List all design tokens in a category',
    inputSchema: {
      category: z.enum(['colors', 'spacing', 'typography']).describe('Token category'),
    },
  },
  async ({ category }) => {
    const categoryData = tokens[category as keyof typeof tokens];
    if (!categoryData) {
      return {
        content: [{ type: 'text', text: `Category "${category}" not found` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(categoryData, null, 2) }],
    };
  },
);

function main() {
  // serveStdio owns the transport: it starts it, serves modern (2026-07-28)
  // stateless traffic, and pins legacy 2025-era openings (initialize
  // handshake) to a 2025-era instance so old clients keep working.
  serveStdio(() => server);
  console.error('MCP token server running on stdio');
}

main();