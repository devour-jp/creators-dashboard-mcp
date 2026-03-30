# Creators Dashboard MCP Server

[Creators Dashboard](https://creators-dashboard.devour.jp) の掲載者向け MCP サーバーです。

AI との対話で `catalog-info.yaml` の**生成・検証・プレビュー**をローカルで完結します。

## Quick Start

```bash
git clone https://github.com/devour-jp/creators-dashboard-mcp.git
cd creators-dashboard-mcp
npm install
npm run build
npm run demo
```

サンプルの catalog-info.yaml を検証し、カードプレビューがブラウザで開きます。

自分の yaml を指定することもできます:

```bash
# サンプルの yaml でプレビュー
npm run demo -- examples/sample.yaml

# 自分の yaml でプレビュー
npm run demo -- /path/to/your-catalog-info.yaml
```

## Claude Code で使う

### 1. MCP サーバーを登録

```bash
# clone したディレクトリ内で実行
npm run build
claude mcp add creators-dashboard-mcp node $PWD/dist/index.js
```

これだけで AI が MCP ツールを呼び出せるようになります。

> **注意**: MCP はデフォルトで実行時のディレクトリ（プロジェクト）に登録されます。どのリポジトリからでも使いたい場合は `--scope user` を追加してください:
> ```bash
> claude mcp add creators-dashboard-mcp --scope user node $PWD/dist/index.js
> ```

### 2. スキルを登録（任意・推奨）

`examples/skill-claude-code.md` は Claude Code スキルの事例です。登録すると、より最適なフローで動作します。スキル名やディレクトリ名はご自由に変更してください。

```bash
# スキルディレクトリを作成して配置
mkdir -p ~/.claude/skills/creators-dashboard-mcp
cp examples/skill-claude-code.md ~/.claude/skills/creators-dashboard-mcp/SKILL.md
```

### 使い方の例

```
# 新規作成（スキルが自動でフローを案内）
「このリポジトリを Creators Dashboard に掲載したい」

# 既存の yaml を検証
「catalog-info.yaml を検証して」

# カードの見た目を確認
「カードをプレビューして」

# リリース後の更新
「v2.0.0 をリリースしたので yaml を更新して」
```

スキルなしでも MCP ツールは直接使えますが、スキルがあると「掲載したい」の一言から生成 → 検証 → プレビュー → 配置まで一気通貫で実行されます。

## Tools

### generate_catalog_info

AI が組み立てた catalog-info.yaml を整形・補完・検証します。

- `apiVersion` / `kind` が未設定なら自動補完
- 生成後に自動で検証を実行

### validate_catalog_info

catalog-info.yaml をスキーマとセマンティックルールで検証します。

- **Schema validation（error）**: 必須フィールド、型、許可値
- **Semantic validation（warning）**: 文字数推奨、URL ドメイン、ベストプラクティス

### preview_card

catalog-info.yaml からカードプレビュー HTML を生成し、ブラウザで表示します。

- Creators Dashboard と同じ CSS を使用
- ネットワーク接続不要

## Local-only

このMCPサーバーは**ネットワーク通信を一切行いません**。

- HTTP 系ライブラリの依存なし
- yaml の生成・検証・プレビューすべてローカルで完結
- ファイルシステムや git は操作しません（AI 側の責務）

ソースコードは公開されています。`package.json` の dependencies で確認できます。

## なぜ MCP か

このツールは MCP（Model Context Protocol）で実装しています。

- **特定の AI ツールに依存しない** — Claude Code、Claude Desktop、その他の MCP 対応クライアントで利用できます
- **npm でも配布可能** — 将来的に `npx` での利用も検討中
- **構造化されたツール定義** — AI がツールの入出力を自動認識し、適切に呼び出せます

MCP の詳細は [modelcontextprotocol.io](https://modelcontextprotocol.io/) をご覧ください。

## なぜ npm publish しないのか

現時点では npm パッケージとしては配布せず、**git clone での利用を推奨**しています。

MCP サーバーはあなたのマシン上で動作するツールです。何が実行されるかを理解した上で使っていただきたいため、ソースコードを確認してからセットアップする git clone の流れを採用しています。

## Test

```bash
npm test
```

```
 Test Files  3 passed (3)
      Tests  30 passed (30)
```

### Coverage

```
-------------|---------|----------|---------|---------|
File         | % Stmts | % Branch | % Funcs | % Lines |
-------------|---------|----------|---------|---------|
All files    |   90.32 |    60.11 |     100 |   90.17 |
 generate.ts |   92.85 |       80 |     100 |   91.66 |
 preview.ts  |   90.47 |    58.41 |     100 |   91.13 |
 validate.ts |   89.77 |    59.67 |     100 |   89.02 |
-------------|---------|----------|---------|---------|
```

## catalog-info.yaml の書き方

Creators Dashboard に掲載するには、GitHub リポジトリのルートに `catalog-info.yaml` を配置し、topic `creators-dashboard` を追加します。

```yaml
apiVersion: devour.jp/v1alpha1
kind: Component
metadata:
  name: "my-project"
  description:
    short: "一言で説明"
    long: "詳しい説明。\n改行もできます。"
  links:
    - url: https://github.com/your-org/my-project
spec:
  type: game        # website | service | library | game | tool | docs
  lifecycle: production  # experimental | production | deprecated | archived
  devour:
    release:
      current:
        version: "1.0.0"
        date: "2026-03-30"
        headline:
          short: "初回リリース"
    author:
      comment:
        short: "遊んでみてください！"
    card:
      bg: "#1a1a2e"  # カード背景色（#RRGGBB）
      fg: "#e0e0e0"  # カード文字色（#RRGGBB）
```

詳細は [Creators Dashboard](https://creators-dashboard.devour.jp/how-to-use) をご覧ください。

## Examples

`examples/` ディレクトリにサンプルファイルがあります:

| ファイル | 内容 |
|---------|------|
| `sample.yaml` | catalog-info.yaml のサンプル |
| `demo.mjs` | 検証 + プレビューのデモスクリプト |
| `skill-claude-code.md` | Claude Code スキル定義のサンプル（`~/.claude/skills/` に配置して使用） |

## その他の MCP クライアント（動作未確認）

Claude Desktop 等、他の MCP 対応クライアントでも利用できる可能性があります。参考として設定例を記載します。

### Claude Desktop

`claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "creators-dashboard": {
      "command": "node",
      "args": ["/path/to/creators-dashboard-mcp/dist/index.js"]
    }
  }
}
```

## License

MIT
