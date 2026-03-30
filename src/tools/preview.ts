import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { parseInput } from './validate.js'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Escape HTML special characters */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')

/** TextPair → short string */
const textShort = (v: unknown): string => {
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null) {
    const tp = v as { short?: string; long?: string }
    return tp.short ?? tp.long ?? ''
  }
  return ''
}

// Link title → badge class (matches pg10 card.tsx TITLE_BADGE)
const TITLE_BADGE: Record<string, string> = {
  'GitHub': 'card-link-badge--github',
  'App Store': 'card-link-badge--appstore',
  'Google Play': 'card-link-badge--googleplay',
  'YouTube': 'card-link-badge--youtube',
  'Steam': 'card-link-badge--steam',
  'X': 'card-link-badge--x',
  'Discord': 'card-link-badge--discord',
  'Bluesky': 'card-link-badge--bluesky',
  'Zenn': 'card-link-badge--zenn',
  'note': 'card-link-badge--note',
}

// Domain → link title (for preview — in production, JOB assigns titles)
const DOMAIN_TITLE: Record<string, string> = {
  'github.com': 'GitHub',
  'apps.apple.com': 'App Store',
  'play.google.com': 'Google Play',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'store.steampowered.com': 'Steam',
  'x.com': 'X',
  'discord.gg': 'Discord',
  'discord.com': 'Discord',
  'bsky.app': 'Bluesky',
  'zenn.dev': 'Zenn',
  'note.com': 'note',
}

const detectTitle = (url: string): string | undefined => {
  try {
    const host = new URL(url).hostname
    for (const [domain, title] of Object.entries(DOMAIN_TITLE)) {
      if (host === domain || host.endsWith(`.${domain}`)) return title
    }
  } catch { /* ignore */ }
  return undefined
}

export type PreviewResult = {
  htmlPath: string
}

/**
 * yaml からプレビュー用 HTML を生成し、ブラウザで開く。
 * HTML 構造は pg10 の card.tsx と同じクラス名を使用。
 */
export const preview = (input: string): PreviewResult => {
  const data = parseInput(input)
  const obj = data as Record<string, unknown>
  const metadata = obj?.metadata as Record<string, unknown> | undefined
  const spec = obj?.spec as Record<string, unknown> | undefined
  const devour = spec?.devour as Record<string, unknown> | undefined
  const release = devour?.release as Record<string, unknown> | undefined
  const current = release?.current as Record<string, unknown> | undefined
  const next = release?.next as Record<string, unknown> | undefined
  const author = devour?.author as Record<string, unknown> | undefined
  const card = devour?.card as Record<string, unknown> | undefined

  const name = esc(String(metadata?.name ?? 'Untitled'))
  const description = textShort(metadata?.description)
  const type = String(spec?.type ?? '')
  const version = current?.version ? String(current.version) : ''
  const date = current?.date ? String(current.date) : ''
  const headline = current?.headline ? textShort(current.headline) : ''
  const nextVersion = next?.version ? String(next.version) : ''
  const nextDate = next?.date ? String(next.date) : ''
  const nextHeadline = next?.headline ? textShort(next.headline) : ''
  const comment = author?.comment ? textShort(author.comment) : ''
  const owner = esc(String(spec?.owner ?? ''))
  // 色値は #RRGGBB のみ許可（CSS インジェクション防止）
  const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
  const sanitizeColor = (v: unknown): string | undefined =>
    typeof v === 'string' && HEX_COLOR_RE.test(v) ? v : undefined
  const cardBg = sanitizeColor(card?.bg)
  const cardFg = sanitizeColor(card?.fg)

  const hasCurrentRelease = version || date || headline
  const hasNext = nextVersion || nextDate || nextHeadline

  // Links — resolve titles from domains for preview
  // https:// のみ許可（javascript: / data: 等を排除）
  const rawLinks = (metadata?.links as Array<{ url?: string; title?: string }> | undefined) ?? []
  const links = rawLinks
    .filter(l => l.url && l.url.startsWith('https://'))
    .map(l => ({ url: l.url!, title: l.title ?? detectTitle(l.url!) }))

  const badgeLinks = links.filter(l => l.title && TITLE_BADGE[l.title])
  const textLinks = links.filter(l => !l.title || !TITLE_BADGE[l.title])

  const badgeLinksHtml = badgeLinks.map(l => {
    const badge = TITLE_BADGE[l.title!]
    return `<a class="card-link-badge ${badge}" title="${esc(l.title!)}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"></a>`
  }).join('\n              ')

  const textLinksHtml = textLinks.map(l => {
    let label = l.title ?? l.url
    try { label = l.title ?? new URL(l.url).hostname } catch { /* use raw url as label */ }
    return `<a class="card-link-btn" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`
  }).join('\n              ')

  // Load bundled CSS
  let css = ''
  try {
    const assetsPath = join(__dirname, '..', '..', 'assets', 'main.css')
    css = readFileSync(assetsPath, 'utf-8')
  } catch {
    css = ''
  }

  const imageStyle = cardBg ? ` style="background-color: ${esc(cardBg)}"` : ''
  const nameStyle = cardFg ? ` style="color: ${esc(cardFg)}"` : ''

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${name} — Creators Dashboard</title>
  <style>
${css}
    /* Preview-specific overrides */
    .preview-wrapper {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .preview-container { max-width: 420px; width: 100%; }
    .preview-label {
      color: #94a3b8;
      font-size: 0.75rem;
      margin-bottom: 16px;
      font-family: -apple-system, sans-serif;
    }
    .preview-notice {
      color: #ef4444;
      font-size: 0.7rem;
      margin-top: 16px;
      padding: 8px 12px;
      border: 1px solid #ef4444;
      border-radius: 6px;
      font-family: -apple-system, sans-serif;
      line-height: 1.5;
    }
    /* カードグリッドの幅制約をプレビュー用に解除 */
    .card { width: 100%; }
  </style>
</head>
<body>
  <div class="preview-wrapper">
    <div class="preview-container">
      <div class="preview-label">Creators Dashboard — Card Preview (local)</div>
      <article class="card">
        <div class="card-tabs">
          <span class="card-tab card-tab--invisible" aria-hidden="true">.</span>
        </div>
        <div class="card-pages">
        <div class="card-page card-page--1">
          <div class="card-image card-image--generated card-image--generated-default"${imageStyle}>
            <span class="card-image-name"${nameStyle}>${name}</span>
          </div>
          <div class="card-body">
            <div class="card-header">
              <div class="card-header-top">
                <h2 class="card-title">${name}</h2>
              </div>
              ${owner ? `<span class="card-header-owner">${owner}</span>` : ''}
            </div>
            ${description && description !== metadata?.name ? `<p class="card-description">${esc(description)}</p>` : ''}
            ${hasCurrentRelease ? `
            <div class="card-release">
              <div class="card-release-meta">
                ${version ? `<span class="card-version">v${esc(version)}</span>` : ''}
                ${date ? `<span class="card-date">${esc(date)}</span>` : ''}
                ${type ? `<span class="card-type-badge">${esc(type)}</span>` : ''}
              </div>
              ${headline ? `<p class="card-headline">${esc(headline)}</p>` : ''}
            </div>` : `
            ${type ? `<div class="card-meta"><span class="card-type-badge">${esc(type)}</span></div>` : ''}`}
            ${hasNext ? `
            <div class="card-next">
              <div class="card-next-meta">
                <span class="card-next-label">Next:</span>
                ${nextVersion ? `<span>v${esc(nextVersion)}</span>` : ''}
                ${nextDate ? `<span class="card-next-date">（${esc(nextDate)} 予定）</span>` : ''}
              </div>
              ${nextHeadline ? `<p class="card-next-headline">${esc(nextHeadline)}</p>` : ''}
            </div>` : ''}
            ${links.length > 0 ? `
            <div class="card-links-section">
              ${badgeLinksHtml ? `<div class="card-links">${badgeLinksHtml}</div>` : ''}
              ${textLinksHtml ? `<div class="card-links">${textLinksHtml}</div>` : ''}
            </div>` : ''}
            <div class="card-author-spacer"></div>
            ${comment ? `
            <div class="card-author">
              <div class="card-author-top">
                <img class="card-author-image" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect fill='%23475569' width='56' height='56' rx='28'/><text x='28' y='36' text-anchor='middle' fill='white' font-size='24'>?</text></svg>" alt="${owner}" />
                <q class="card-author-comment">${esc(comment)}</q>
              </div>
              <span class="card-author-name">${owner}</span>
            </div>` : ''}
          </div>
        </div>
        </div>
      </article>
      <div class="preview-notice">
        * プレビュー表示のため、実際の表示と異なる場合があります。<br>
        最終的な表示確認は連携後に <a href="https://creators-dashboard.devour.jp" style="color: #ef4444;">creators-dashboard.devour.jp</a> でご確認ください。
      </div>
    </div>
  </div>
</body>
</html>`

  // Write to temp file
  const tmpDir = mkdtempSync(join(tmpdir(), 'cdmcp-'))
  const htmlPath = join(tmpDir, 'preview.html')
  writeFileSync(htmlPath, html, 'utf-8')

  // Open in browser
  try {
    if (process.platform === 'darwin') {
      execSync(`open "${htmlPath}"`)
    } else if (process.platform === 'linux') {
      execSync(`xdg-open "${htmlPath}"`)
    } else if (process.platform === 'win32') {
      execSync(`start "${htmlPath}"`)
    }
  } catch {
    // open failure is non-fatal
  }

  return { htmlPath }
}
