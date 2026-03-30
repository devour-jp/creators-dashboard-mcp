#!/usr/bin/env node

/**
 * Creators Dashboard MCP — Demo
 *
 * サンプル catalog-info.yaml を検証し、プレビューをブラウザで開く。
 *
 * Usage:
 *   npm run demo
 *   npm run demo -- path/to/your-catalog-info.yaml
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validate } from '../dist/tools/validate.js'
import { preview } from '../dist/tools/preview.js'

const defaultSample = new URL('./sample.yaml', import.meta.url).pathname

const inputPath = process.argv[2]
  ? resolve(process.argv[2])
  : defaultSample

console.log()
console.log('  Creators Dashboard MCP -- Demo')
console.log('  ==============================')
console.log()
console.log(`  Input: ${inputPath}`)
console.log()

// --- Read ---
let yaml
try {
  yaml = readFileSync(inputPath, 'utf-8')
} catch {
  console.error(`  ERROR: Cannot read file: ${inputPath}`)
  process.exit(1)
}

// --- Validate ---
console.log('  -- Validate --')
const result = validate(yaml)

if (result.errors.length === 0) {
  console.log('  [OK] Schema validation passed')
} else {
  console.log(`  [NG] Schema validation: ${result.errors.length} error(s)`)
  for (const e of result.errors) {
    console.log(`    [error] ${e.field}: ${e.message}`)
  }
}

if (result.warnings.length > 0) {
  console.log(`  [!!] Semantic validation: ${result.warnings.length} warning(s)`)
  for (const w of result.warnings) {
    console.log(`    [warn]  ${w.field}: ${w.message}`)
  }
} else {
  console.log('  [OK] Semantic validation passed')
}

console.log()

// --- Preview ---
console.log('  -- Preview --')
const { htmlPath } = preview(yaml)
console.log(`  Opened in browser: ${htmlPath}`)
console.log()
console.log('  Done!')
console.log()
