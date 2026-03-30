#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { validate } from './tools/validate.js'
import { generate } from './tools/generate.js'
import { preview } from './tools/preview.js'

const VERSION = '0.1.0'

// --- Startup log (stderr only — stdout is for JSON-RPC) ---
process.stderr.write(`[mcp] creators-dashboard-mcp v${VERSION}\n`)
process.stderr.write('[mcp] mode: local-only (no network)\n')
process.stderr.write('[mcp] source: https://github.com/devour-jp/creators-dashboard-mcp\n')

// --- Server ---
const server = new McpServer({
  name: 'creators-dashboard-mcp',
  version: VERSION,
})

// --- Tool: generate_catalog_info ---
server.tool(
  'generate_catalog_info',
  'Generate and validate catalog-info.yaml for Creators Dashboard. Runs locally, no network access. Input: YAML string. Output: formatted YAML + validation results.',
  { yaml: z.string().describe('catalog-info.yaml content as YAML string') },
  async ({ yaml: yamlInput }) => {
    try {
      const result = generate(yamlInput)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      }
    } catch (e) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${e instanceof Error ? e.message : String(e)}`,
        }],
        isError: true,
      }
    }
  },
)

// --- Tool: validate_catalog_info ---
server.tool(
  'validate_catalog_info',
  'Validate catalog-info.yaml against JSON Schema and semantic rules. Runs locally, no network access. Input: YAML string. Output: errors and warnings.',
  { yaml: z.string().describe('catalog-info.yaml content as YAML string') },
  async ({ yaml: yamlInput }) => {
    try {
      const result = validate(yamlInput)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      }
    } catch (e) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${e instanceof Error ? e.message : String(e)}`,
        }],
        isError: true,
      }
    }
  },
)

// --- Tool: preview_card ---
server.tool(
  'preview_card',
  'Generate HTML preview of a Creators Dashboard card and open in browser. Runs locally, no network access. Input: YAML string.',
  { yaml: z.string().describe('catalog-info.yaml content as YAML string') },
  async ({ yaml: yamlInput }) => {
    try {
      const result = preview(yamlInput)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            message: 'プレビューをブラウザで開きました',
            htmlPath: result.htmlPath,
          }, null, 2),
        }],
      }
    } catch (e) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${e instanceof Error ? e.message : String(e)}`,
        }],
        isError: true,
      }
    }
  },
)

// --- Connect ---
const transport = new StdioServerTransport()
await server.connect(transport)
