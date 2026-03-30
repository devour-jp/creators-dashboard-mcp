---
name: devour-catalog-info-mcp
description: Creators Dashboard 掲載用 catalog-info.yaml を AI 対話で生成・検証・プレビューする。MCP ツール（generate / validate / preview）を使用。「catalog-info を作りたい」「yaml を検証して」「カードをプレビュー」等でトリガー。
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(ls:*), Bash(node*), Bash(npm*), AskUserQuestion, mcp__creators-dashboard__generate_catalog_info, mcp__creators-dashboard__validate_catalog_info, mcp__creators-dashboard__preview_card
---

# Catalog Info MCP Skill

Creators Dashboard 掲載用の catalog-info.yaml を AI 対話で作成するスキル。
MCP サーバー（creators-dashboard-mcp）の 3 ツールを使用する。

## When to Use This Skill

ユーザーが以下のようなリクエストをした場合:
- 「catalog-info.yaml を作りたい」
- 「Creators Dashboard に掲載したい」
- 「yaml を検証して」「バリデーションして」
- 「カードをプレビューしたい」「プレビュー見せて」
- 「catalog-info を更新したい」

## Prerequisites

MCP サーバーが Claude Code に登録されていること:

```bash
claude mcp add creators-dashboard node /path/to/creators-dashboard-mcp/dist/index.js
```

## Execution Steps

### Step 1: 目的を確認

AskUserQuestion で確認:

| モード | 説明 |
|--------|------|
| 新規作成 | リポジトリの README 等から catalog-info.yaml を生成 |
| 検証 | 既存の catalog-info.yaml を検証 |
| プレビュー | catalog-info.yaml のカード表示を確認 |
| 更新 | 既存の catalog-info.yaml を編集（バージョン更新等） |

### Step 2: モードに応じた処理

#### 新規作成モード

1. **リポジトリの情報を収集**:
   - README.md を読む
   - CHANGELOG.md があれば最新リリース情報を取得
   - package.json / Cargo.toml 等からプロジェクト名・バージョンを取得
   - GitHub リンクを確認

2. **yaml を組み立てる**:
   - 収集した情報から catalog-info.yaml を組み立てる
   - 必須フィールド: apiVersion, kind, metadata.name
   - 推奨フィールド: description, spec.type, spec.lifecycle, links

3. **MCP ツールで生成・検証**:
   - `generate_catalog_info` に yaml を渡す
   - 結果の yaml と validation を確認
   - error があれば修正、warning があればユーザーに伝える

4. **ユーザーに確認**:
   - 生成された yaml を表示
   - カスタマイズしたい点を聞く（色、コメント、リンク追加等）
   - 修正があれば再度 `generate_catalog_info` で検証

5. **プレビュー**:
   - `preview_card` でブラウザプレビューを表示
   - ユーザーに確認を求める

6. **ファイル配置**:
   - OK ならリポジトリルートに `catalog-info.yaml` を配置（Write ツール）
   - 「git push 後、次回の cron（最大1時間）で Creators Dashboard に反映されます」と案内
   - topic `creators-dashboard` の追加を案内

#### 検証モード

1. 既存の `catalog-info.yaml` を読む
2. `validate_catalog_info` に渡す
3. 結果を表示（errors / warnings）
4. 修正提案があれば提示

#### プレビューモード

1. 既存の `catalog-info.yaml` を読む
2. `preview_card` でブラウザプレビューを表示

#### 更新モード

1. 既存の `catalog-info.yaml` を読む
2. ユーザーに何を更新したいか聞く（バージョン、ヘッドライン、コメント等）
3. yaml を編集
4. `generate_catalog_info` で検証
5. `preview_card` でプレビュー
6. OK なら保存

### Step 3: yaml 組み立てのガイドライン

#### spec.type の選び方

| 値 | 用途 |
|----|------|
| `website` | Web サイト、Web アプリ |
| `service` | API サービス、SaaS |
| `library` | ライブラリ、フレームワーク |
| `game` | ゲーム |
| `tool` | CLI ツール、デスクトップアプリ |
| `docs` | ドキュメント、ブログ |

#### spec.lifecycle の選び方

| 値 | 用途 |
|----|------|
| `experimental` | 開発中、ベータ |
| `production` | 安定版リリース済み |
| `deprecated` | 非推奨 |
| `archived` | アーカイブ済み |

#### カード色のヒント

- 暗い背景 + 明るい文字が読みやすい
- `bg: "#1a1a2e"` + `fg: "#e0e0e0"` は安全な組み合わせ
- プロジェクトのブランドカラーを使うのも良い
- 6桁 hex（`#RRGGBB`）のみ。3桁や rgba は不可

#### description / headline / comment の書き方

- **description**: プロジェクトの概要。何をするものか
- **headline**: 最新リリースの変更内容。「何が変わったか」
- **comment**: 作者の一言。カジュアルに。巻末コメント風
- short は1行（カード表示用）、long は複数行可（org ページ用）

### Step 4: topic 追加の案内

yaml を配置したら、GitHub リポジトリに topic `creators-dashboard` を追加するよう案内する:

```
リポジトリ → Settings → General → Topics → 「creators-dashboard」を追加
```

これが opt-in の仕組み。topic 追加 = 掲載同意。

## Output

- 生成/検証/プレビューの結果を表示
- 必要に応じて catalog-info.yaml をリポジトリに配置
- topic 追加の案内

## Example Interactions

**User**: 「このリポジトリを Creators Dashboard に掲載したい」
→ 新規作成モード。README を読み、yaml 生成 → 検証 → プレビュー → 配置。

**User**: 「catalog-info.yaml を検証して」
→ 検証モード。validate_catalog_info を実行。

**User**: 「カードがどう見えるか確認したい」
→ プレビューモード。preview_card を実行。

**User**: 「v2.0.0 をリリースしたので yaml を更新したい」
→ 更新モード。release.current を編集 → 検証 → プレビュー → 保存。
