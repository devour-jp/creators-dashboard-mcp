import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { preview } from '../tools/preview.js'

const minimal = 'apiVersion: devour.jp/v1alpha1\nkind: Component\nmetadata:\n  name: test-app'

describe('preview', () => {
  it('HTML ファイルを生成する', () => {
    const result = preview(minimal)
    expect(result.htmlPath).toMatch(/\.html$/)
    const html = readFileSync(result.htmlPath, 'utf-8')
    expect(html).toContain('test-app')
    expect(html).toContain('Creators Dashboard')
  })

  it('card.bg / card.fg が正しく反映される', () => {
    const yaml = minimal + '\nspec:\n  devour:\n    card:\n      bg: "#1a1a2e"\n      fg: "#e0e0e0"'
    const result = preview(yaml)
    const html = readFileSync(result.htmlPath, 'utf-8')
    expect(html).toContain('#1a1a2e')
    expect(html).toContain('#e0e0e0')
  })

  it('不正な色値は無視される（CSS インジェクション防止）', () => {
    const yaml = minimal + '\nspec:\n  devour:\n    card:\n      bg: "red;position:fixed;inset:0"'
    const result = preview(yaml)
    const html = readFileSync(result.htmlPath, 'utf-8')
    expect(html).not.toContain('position:fixed')
    expect(html).not.toContain('red;')
  })

  it('javascript: URL は除外される', () => {
    const yaml = minimal + '\n  links:\n    - url: "javascript:alert(1)"'
    const result = preview(yaml)
    const html = readFileSync(result.htmlPath, 'utf-8')
    expect(html).not.toContain('javascript:')
  })

  it('https:// URL は正しくリンクされる', () => {
    const yaml = minimal + '\n  links:\n    - url: "https://github.com/test"'
    const result = preview(yaml)
    const html = readFileSync(result.htmlPath, 'utf-8')
    expect(html).toContain('href="https://github.com/test"')
  })

  it('不正な URL でクラッシュしない', () => {
    const yaml = minimal + '\n  links:\n    - url: "https://not a valid url"'
    expect(() => preview(yaml)).not.toThrow()
  })

  it('注釈が含まれる', () => {
    const result = preview(minimal)
    const html = readFileSync(result.htmlPath, 'utf-8')
    expect(html).toContain('プレビュー表示のため')
    expect(html).toContain('creators-dashboard.devour.jp')
  })
})
