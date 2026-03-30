import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { validate, type ValidationResult } from './validate.js'

export type GenerateResult = {
  yaml: string
  validation: ValidationResult
}

/**
 * yaml 文字列を受け取り、整形・検証して返す。
 * AI が自然言語から組み立てた yaml をこのツールに渡す想定。
 */
export const generate = (yamlInput: string): GenerateResult => {
  // Parse and re-stringify for consistent formatting
  let parsed: unknown
  try {
    parsed = parseYaml(yamlInput)
  } catch (e) {
    throw new Error(`YAML パースエラー: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('YAML のルートはオブジェクトである必要があります')
  }

  const obj = parsed as Record<string, unknown>

  // Auto-fill defaults if missing
  if (!obj.apiVersion) obj.apiVersion = 'devour.jp/v1alpha1'
  if (!obj.kind) obj.kind = 'Component'

  // Re-serialize with consistent formatting
  const yaml = stringifyYaml(parsed, {
    lineWidth: 0,       // no line wrapping
    defaultKeyType: 'PLAIN',
    defaultStringType: 'QUOTE_DOUBLE',
  })

  // Validate the result
  const validation = validate(yaml)

  return { yaml, validation }
}
