import { describe, it, expect } from 'vitest'
import { validate, parseInput } from '../tools/validate.js'

// --- parseInput ---

describe('parseInput', () => {
  it('valid YAML をパースできる', () => {
    const result = parseInput('apiVersion: devour.jp/v1alpha1')
    expect(result).toEqual({ apiVersion: 'devour.jp/v1alpha1' })
  })

  it('不正な YAML でエラーを投げる', () => {
    expect(() => parseInput('{')).toThrow('YAML パースエラー')
  })
})

// --- Schema Validation ---

describe('validate: schema', () => {
  const minimal = 'apiVersion: devour.jp/v1alpha1\nkind: Component\nmetadata:\n  name: test'

  it('最小構成で valid', () => {
    const result = validate(minimal)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('apiVersion が違うと error', () => {
    const result = validate('apiVersion: wrong\nkind: Component\nmetadata:\n  name: test')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'apiVersion')).toBe(true)
  })

  it('metadata.name がないと error', () => {
    const result = validate('apiVersion: devour.jp/v1alpha1\nkind: Component\nmetadata:\n  description: test')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('name'))).toBe(true)
  })

  it('additionalProperties を検出する', () => {
    const result = validate(minimal + '\n  extra: bad')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('additional properties'))).toBe(true)
  })

  it('tags が 10 件を超えると error', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `  - tag${i}`).join('\n')
    const result = validate(minimal + '\n  tags:\n' + tags)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('10'))).toBe(true)
  })

  it('links が配列でないと error', () => {
    const result = validate(minimal + '\n  links: oops')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.includes('links'))).toBe(true)
  })

  it('links の URL が https:// でないと error', () => {
    const result = validate(minimal + '\n  links:\n    - url: "javascript:alert(1)"')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.includes('links'))).toBe(true)
  })

  it('spec.type が許可値外だと error', () => {
    const result = validate(minimal + '\nspec:\n  type: invalid')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.includes('type'))).toBe(true)
  })

  it('card.bg が不正な hex だと error', () => {
    const result = validate(minimal + '\nspec:\n  devour:\n    card:\n      bg: "#GGG"')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.includes('bg'))).toBe(true)
  })

  it('card.bg が正しい hex なら valid', () => {
    const result = validate(minimal + '\nspec:\n  devour:\n    card:\n      bg: "#1a1a2e"')
    expect(result.valid).toBe(true)
  })

  it('X fix が数字以外だと error', () => {
    const result = validate(minimal + '\nspec:\n  devour:\n    social:\n      x:\n        fix: "not-a-number"')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.includes('fix'))).toBe(true)
  })
})

// --- Semantic Validation ---

describe('validate: semantic', () => {
  const minimal = 'apiVersion: devour.jp/v1alpha1\nkind: Component\nmetadata:\n  name: test'

  it('description がないと warning', () => {
    const result = validate(minimal)
    expect(result.warnings.some(w => w.field === 'metadata.description')).toBe(true)
  })

  it('spec.type がないと warning', () => {
    const result = validate(minimal)
    expect(result.warnings.some(w => w.field === 'spec.type')).toBe(true)
  })

  it('name が 40 文字超で warning', () => {
    const longName = 'a'.repeat(41)
    const result = validate(`apiVersion: devour.jp/v1alpha1\nkind: Component\nmetadata:\n  name: "${longName}"`)
    expect(result.warnings.some(w => w.field === 'metadata.name' && w.message.includes('40'))).toBe(true)
  })

  it('ホワイトリスト外ドメインで warning', () => {
    const result = validate(minimal + '\n  links:\n    - url: "https://example.com/page"')
    expect(result.warnings.some(w => w.field.includes('links') && w.message.includes('ホワイトリスト外'))).toBe(true)
  })

  it('ホワイトリスト内ドメインなら warning なし', () => {
    const result = validate(minimal + '\n  links:\n    - url: "https://github.com/test"')
    expect(result.warnings.every(w => !w.field.includes('links'))).toBe(true)
  })
})
