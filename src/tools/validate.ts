import { parse as parseYaml } from 'yaml'
import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import catalogSchema from '../schema/catalog-info.schema.json' with { type: 'json' }

// --- Types ---

type ValidationIssue = {
  field: string
  message: string
  level: 'error' | 'warning'
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

// --- Field limits (synced with pg10 LIMITS) ---

const LIMITS = {
  name: 40,
  bio: 382,
  description: 66,
  headline: 66,
  comment: 64,
  nextHeadline: 66,
  maxTags: 10,
  maxLinks: 12,
  longMultiplier: 4,
} as const

// --- Helpers ---

/** Half-width character length (ASCII=1, non-ASCII=2) */
const halfWidthLength = (str: string): number => {
  let len = 0
  for (const ch of str) {
    len += (ch.codePointAt(0)! > 0x7f) ? 2 : 1
  }
  return len
}

/** Parse YAML string to object */
export const parseInput = (yamlStr: string): unknown => {
  try {
    return parseYaml(yamlStr)
  } catch (e) {
    throw new Error(`YAML パースエラー: ${e instanceof Error ? e.message : String(e)}`)
  }
}

// --- Stage 1: Schema Validation (ajv) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (Ajv as any).default ?? Ajv
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormatsFunc = (addFormats as any).default ?? addFormats
const ajv = new AjvClass({ allErrors: true })
addFormatsFunc(ajv)
const schemaValidate = ajv.compile(catalogSchema)

const validateSchema = (data: unknown): ValidationIssue[] => {
  if (typeof data !== 'object' || data === null) {
    return [{ field: '(root)', message: 'YAML のルートはオブジェクトである必要があります', level: 'error' }]
  }

  const valid = schemaValidate(data)
  if (valid) return []

  return (schemaValidate.errors ?? []).map((err: ErrorObject) => {
    const field = err.instancePath
      ? err.instancePath.replace(/\//g, '.').slice(1)
      : err.params?.missingProperty
        ? err.params.missingProperty
        : '(root)'
    const message = err.message ?? 'バリデーションエラー'
    return { field, message, level: 'error' as const }
  })
}

// --- Stage 2: Semantic Validation ---

const checkTextPairLength = (
  value: unknown,
  field: string,
  shortMax: number,
  longMax: number,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  if (value === undefined) return issues

  if (typeof value === 'string') {
    if (halfWidthLength(value) > shortMax) {
      issues.push({ field, message: `${shortMax} 文字（半角換算）を超えています（現在: ${halfWidthLength(value)}）`, level: 'warning' })
    }
    return issues
  }

  if (typeof value === 'object' && value !== null) {
    const tp = value as { short?: string; long?: string }
    if (tp.short && halfWidthLength(tp.short) > shortMax) {
      issues.push({ field: `${field}.short`, message: `${shortMax} 文字（半角換算）を超えています（現在: ${halfWidthLength(tp.short)}）`, level: 'warning' })
    }
    if (tp.long && halfWidthLength(tp.long) > longMax) {
      issues.push({ field: `${field}.long`, message: `${longMax} 文字（半角換算）を超えています（現在: ${halfWidthLength(tp.long)}）`, level: 'warning' })
    }
  }
  return issues
}

const TRUSTED_DOMAINS = [
  'github.com', 'apps.apple.com', 'play.google.com',
  'youtube.com', 'youtu.be', 'x.com', 'discord.gg', 'discord.com',
  'bsky.app', 'store.steampowered.com', 'zenn.dev', 'note.com',
]

const validateSemantic = (data: unknown): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const obj = data as Record<string, unknown>
  const metadata = obj?.metadata as Record<string, unknown> | undefined
  const spec = obj?.spec as Record<string, unknown> | undefined
  const devour = spec?.devour as Record<string, unknown> | undefined

  // Name length
  if (metadata?.name && typeof metadata.name === 'string') {
    if (halfWidthLength(metadata.name) > LIMITS.name) {
      issues.push({ field: 'metadata.name', message: `${LIMITS.name} 文字（半角換算）を超えています（現在: ${halfWidthLength(metadata.name)}）。本番では切り詰められます`, level: 'warning' })
    }
  }

  // TextPair lengths
  issues.push(...checkTextPairLength(metadata?.description, 'metadata.description', LIMITS.description, LIMITS.description * LIMITS.longMultiplier))

  if (devour) {
    const release = devour.release as Record<string, unknown> | undefined
    const current = release?.current as Record<string, unknown> | undefined
    const next = release?.next as Record<string, unknown> | undefined
    issues.push(...checkTextPairLength(current?.headline, 'spec.devour.release.current.headline', LIMITS.headline, LIMITS.headline * LIMITS.longMultiplier))
    issues.push(...checkTextPairLength(next?.headline, 'spec.devour.release.next.headline', LIMITS.nextHeadline, LIMITS.nextHeadline * LIMITS.longMultiplier))

    const author = devour.author as Record<string, unknown> | undefined
    issues.push(...checkTextPairLength(author?.comment, 'spec.devour.author.comment', LIMITS.comment, LIMITS.comment * LIMITS.longMultiplier))

    const org = devour.org as Record<string, unknown> | undefined
    issues.push(...checkTextPairLength(org?.bio, 'spec.devour.org.bio', LIMITS.bio, LIMITS.bio * LIMITS.longMultiplier))
  }

  // Link domain check
  const links = metadata?.links as Array<{ url?: string }> | undefined
  if (Array.isArray(links)) {
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      if (link.url) {
        try {
          const host = new URL(link.url).hostname
          if (!TRUSTED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))) {
            issues.push({ field: `metadata.links[${i}].url`, message: `ホワイトリスト外のドメインです（${host}）。本番で制限される可能性があります`, level: 'warning' })
          }
        } catch {
          // URL parse failure is caught by schema validation
        }
      }
    }
  }

  // Best practices
  if (!metadata?.description) {
    issues.push({ field: 'metadata.description', message: 'description を追加すると、カードに説明文が表示されます', level: 'warning' })
  }
  if (!spec?.type) {
    issues.push({ field: 'spec.type', message: 'type を追加すると、カードにバッジが表示されます', level: 'warning' })
  }
  if (!devour) {
    issues.push({ field: 'spec.devour', message: 'devour セクションを追加すると、リリース情報や作者コメントが表示されます', level: 'warning' })
  }

  return issues
}

// --- Main ---

export const validate = (input: string): ValidationResult => {
  const data = parseInput(input)
  const schemaIssues = validateSchema(data)
  const semanticIssues = validateSemantic(data)

  const errors = [...schemaIssues, ...semanticIssues].filter(i => i.level === 'error')
  const warnings = [...schemaIssues, ...semanticIssues].filter(i => i.level === 'warning')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
