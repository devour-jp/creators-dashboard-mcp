# Changelog

## [Unreleased]

## [0.1.0] - 2026-03-30
### Added
- MCP サーバー（stdio）: `generate_catalog_info` / `validate_catalog_info` / `preview_card`
- JSON Schema: catalog-info.yaml のバリデーション定義（pg10 と共有）
- プレビュー: pg10 の CSS をバンドルしたカードプレビュー HTML 生成
- デモ: `npm run demo` でサンプル yaml の検証 + ブラウザプレビュー
- pg10 同期チェック: `make sync-check` で schema/CSS の不一致検出
