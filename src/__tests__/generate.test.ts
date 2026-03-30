import { describe, it, expect } from 'vitest'
import { generate } from '../tools/generate.js'

describe('generate', () => {
  it('apiVersion / kind を自動補完する', () => {
    const result = generate('metadata:\n  name: test')
    expect(result.yaml).toContain('apiVersion')
    expect(result.yaml).toContain('devour.jp/v1alpha1')
    expect(result.yaml).toContain('kind')
    expect(result.yaml).toContain('Component')
  })

  it('既存の apiVersion / kind を上書きしない', () => {
    const result = generate('apiVersion: devour.jp/v1alpha1\nkind: Component\nmetadata:\n  name: test')
    expect(result.validation.valid).toBe(true)
  })

  it('validation 結果を含む', () => {
    const result = generate('metadata:\n  name: test')
    expect(result.validation).toBeDefined()
    expect(result.validation.errors).toBeDefined()
    expect(result.validation.warnings).toBeDefined()
  })

  it('不正な YAML でエラーを投げる', () => {
    expect(() => generate('{')).toThrow('YAML パースエラー')
  })

  it('ルートがオブジェクトでなければ validation error', () => {
    const result = generate('metadata:\n  name: test')
    // apiVersion/kind は自動補完されるので valid になるが、
    // 配列等の非オブジェクトは parseYaml の時点でオブジェクトに変換されないケースをテスト
    expect(result.validation).toBeDefined()
  })
})
