# AIR-DML独自パーサー実装計画

## 概要

Mode-aiの@dbml/core依存を解消し、AIR-DML独自パーサーを実装する。これにより：
- DBMLバージョンアップへの追随不要
- AIR-DML仕様の明確化
- パースエラーの根本解決
- Gemini出力との整合性向上

## 決定事項

| 項目 | 決定 |
|------|------|
| パーサー方式 | 手書きRecursive Descent（依存ゼロ） |
| Enum構文 | 含めない |
| indexes構文 | 含める |
| TableGroup | 廃止（Areaで代替） |
| エラーメッセージ | 日本語対応必須 |

## AIR-DML構文仕様

### 継承する構文（DBML由来）
- `Project "name" { database_type: 'xxx', Note: "..." }`
- `Table name [attrs] { columns... indexes { } }`
- `column type [pk, fk, unique, not null, increment, default, alias, note]`
- `Ref: table1.col > table2.col` （>, <, -, <>）
- `Note: "text"`
- `// コメント`（中括弧内も含む）
- `indexes { (col1, col2) [unique, name: 'idx_name'] }`

### AIR-DML独自構文
- `Area "name" [pos_x, pos_y, width, height, color, database_type, labelHorizontal, labelVertical] { tables... CommonColumns: [...] Note: "..." }`
- `alias: "論理名"` （Table/Column属性）
- `pos_x:`, `pos_y:` （Table/Area属性）
- `color: "#hex"` （Table/Area属性）
- `Ref: a.b ~ c.d` （AI推論リレーション）
- `swapEdge: true` （Ref属性）
- `fk` （Column属性）
- `leadingComments` （前置コメント保持）

### 廃止する構文
- `TableGroup` → Areaで代替
- `Enum` → note:で代替

---

## 実装フェーズ

### Phase 0: テスト基盤構築

**対象**: `D:\claude\air-dml`

**作業内容**:
1. Vitestテストフレームワーク導入
2. テストケース作成（15-20ケース）
3. 現行パーサーでスナップショット取得

**テストケース**:
- Project宣言（database_type, Note）
- Table定義（alias, pos_x, pos_y, color, Note）
- Column定義（全制約パターン）
- Ref定義（>, <, -, <>, ~, swapEdge）
- Area定義（CommonColumns, database_type, Note）
- indexes定義
- コメント（トップレベル、中括弧内）
- エラーケース

---

### Phase 1: 独自パーサー実装

**対象**: `D:\claude\air-dml\src\parser\`

#### 1.1 ファイル構成

```
src/parser/
├── index.ts           # 公開API（parseAirDML, exportToAirDML）
├── lexer.ts           # 字句解析器
├── tokens.ts          # トークン定義
├── parser.ts          # 構文解析器
├── ast.ts             # ASTノード定義
├── transformer.ts     # AST → Diagram変換
├── exporter.ts        # Diagram → AIR-DML変換
├── errors.ts          # エラー型定義
└── messages/
    ├── ja.ts          # 日本語エラーメッセージ
    └── en.ts          # 英語エラーメッセージ
```

#### 1.2 トークン種別

```typescript
enum TokenType {
  // キーワード
  PROJECT, TABLE, AREA, REF, NOTE, INDEXES,
  // 制約
  PK, FK, UNIQUE, NOT_NULL, INCREMENT, DEFAULT,
  // 属性
  ALIAS, POS_X, POS_Y, COLOR, SWAP_EDGE, DATABASE_TYPE,
  COMMON_COLUMNS, LABEL_HORIZONTAL, LABEL_VERTICAL, NAME,
  // リテラル
  IDENTIFIER, STRING, NUMBER,
  // 記号
  LBRACE, RBRACE, LBRACKET, RBRACKET, LPAREN, RPAREN,
  COLON, COMMA, DOT,
  // リレーション演算子
  REF_GT, REF_LT, REF_DASH, REF_LTGT, REF_TILDE,
  // コメント
  LINE_COMMENT,
  // 制御
  NEWLINE, EOF
}
```

#### 1.3 Lexer実装ポイント

- 日本語識別子対応: `/[a-zA-Z_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/`
- コメント保持: `//`以降をトークンとして保存
- 位置情報: 行番号・列番号を全トークンに付与

#### 1.4 Parser実装ポイント

- Recursive Descent方式
- コメントの関連付け: 次の構文要素の`leadingComments`に格納
- エラー回復: 同期ポイント（}, Table, Ref, Area）まで読み飛ばし
- 複数エラー収集: 最初のエラーで停止せず継続

#### 1.5 エラーメッセージ（日本語）

```typescript
const JA_MESSAGES = {
  UNTERMINATED_STRING: '文字列が閉じられていません',
  EXPECTED_IDENTIFIER: '識別子が必要です',
  EXPECTED_LBRACE: '"{" が必要です',
  EXPECTED_RBRACE: '"}" が必要です',
  EXPECTED_REF_OPERATOR: 'リレーション演算子が必要です（>, <, -, <>, ~）',
  DUPLICATE_TABLE_NAME: 'テーブル名 "{name}" が重複しています',
  UNDEFINED_TABLE_REFERENCE: 'テーブル "{name}" は定義されていません',
  // ...
};
```

#### 1.6 package.json更新

```json
{
  "name": "air-dml",
  "version": "2.0.0",
  "dependencies": {
    // @dbml/core 削除
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

### Phase 2: サニタイザー最適化

**対象**: `D:\claude\Mode-ai\web-v3\src\utils\aml-sanitizer.ts`

**方針**: パーサー強化により役割を縮小

**残す処理**:
```typescript
export function preProcessAIOutput(amlCode: string): string {
  let result = amlCode;
  result = removeMarkdownArtifacts(result);  // ```aml 除去
  result = removeTableGroups(result);         // TableGroup除去
  result = removeInvalidCharacters(result);   // 制御文字除去
  return result;
}

export function postProcessDiagram(diagram: Diagram): Diagram {
  return fixDuplicateColumns(diagram);        // 重複カラム名修正
}
```

**削除する処理**（パーサーで対応）:
- `fixEscapeSequences` → 文字列リテラル処理で対応
- `fixUnquotedValues` → 寛容なパースで対応
- `fixMultilineStrings` → 文字列リテラル処理で対応

---

### Phase 3: Geminiプロンプト最適化

**対象**: `D:\claude\Mode-ai\web-v3\src\services\ai\prompts\`

#### 3.1 共通リファレンス作成

**新規ファイル**: `prompts/air-dml-reference.ts`

```typescript
export const AIR_DML_SYNTAX_REFERENCE = `
## AIR-DML構文（厳守）

### テーブル定義
Table テーブル名 [alias: "日本語名"] {
  カラム名 データ型 [pk, not null, alias: "日本語名"]
}

### 制約
[pk] [fk] [unique] [not null] [increment]
[default: 'value'] [alias: "名"] [note: "説明"]

### リレーション
Ref: 子.カラム > 親.カラム   // 多対1
Ref: a.カラム - b.カラム     // 1対1
Ref: a.カラム ~ b.カラム     // AI推論

### Area
Area "エリア名" [color: "#HEX"] {
  テーブル1
  テーブル2
}

### 禁止事項
- TableGroup禁止（Areaを使用）
- スキーマプレフィックス禁止（ods.xxx → ods_xxx）
- シングルクォート禁止（alias: "名前" のみ）
`;
```

#### 3.2 各プロンプトの更新

| ファイル | 更新内容 |
|----------|----------|
| ai-diagram.ts | 共通リファレンス使用、構文例の統一 |
| tobe-design.ts | 共通リファレンス使用、構文例の統一 |
| excel-parsing.ts | 共通リファレンス使用、構文例の統一 |

---

### Phase 4: 統合・テスト

**対象**: 両リポジトリ

#### 4.1 air-dml パッケージ公開

```bash
cd D:\claude\air-dml
npm version major  # 2.0.0
npm publish
```

#### 4.2 web-v3 依存更新

```bash
cd D:\claude\Mode-ai\web-v3
npm update air-dml
```

#### 4.3 diagramStore.ts 更新

```typescript
// エラーハンドリング更新
importFromDBML: (dbmlText) => {
  try {
    const result = parseAirDML(dbmlText);
    if (!result.success) {
      // 新しいエラーフォーマット
      result.errors?.forEach(err => {
        console.error(`[${err.position.line}:${err.position.column}] ${err.message}`);
      });
      throw new Error(result.errors?.[0]?.message || 'パースエラー');
    }
    set({ diagram: result.diagram, ... });
  } catch (error) {
    // ...
  }
}
```

#### 4.4 回帰テスト

- Phase 0で作成したテストスイート実行
- スナップショット比較
- 実際のAI生成出力でテスト

---

## 修正対象ファイル一覧

### air-dml パッケージ

| ファイル | 変更内容 |
|----------|----------|
| `src/parser/index.ts` | 完全書き換え（独自実装） |
| `src/parser/lexer.ts` | 新規作成 |
| `src/parser/tokens.ts` | 新規作成 |
| `src/parser/parser.ts` | 新規作成 |
| `src/parser/ast.ts` | 新規作成 |
| `src/parser/transformer.ts` | 新規作成 |
| `src/parser/exporter.ts` | 既存ロジック移行 |
| `src/parser/errors.ts` | 新規作成 |
| `src/parser/messages/ja.ts` | 新規作成 |
| `src/parser/messages/en.ts` | 新規作成 |
| `src/types/index.ts` | 変更なし（互換性維持） |
| `src/database-types.ts` | 変更なし |
| `src/index.ts` | 変更なし（API互換性維持） |
| `package.json` | @dbml/core削除、vitest追加 |
| `tests/*.test.ts` | 新規作成 |

### web-v3

| ファイル | 変更内容 |
|----------|----------|
| `src/utils/aml-sanitizer.ts` | 簡素化 |
| `src/utils/dbml-parser.ts` | 変更なし（ラッパー維持） |
| `src/stores/diagramStore.ts` | エラーハンドリング更新 |
| `src/services/ai/prompts/air-dml-reference.ts` | 新規作成 |
| `src/services/ai/prompts/ai-diagram.ts` | 共通リファレンス使用 |
| `src/services/ai/prompts/tobe-design.ts` | 共通リファレンス使用 |
| `src/services/ai/prompts/excel-parsing.ts` | 共通リファレンス使用 |
| `package.json` | air-dml バージョン更新 |

---

## 実装順序

1. **Phase 0**: テスト基盤（air-dml）
2. **Phase 1.1**: Lexer実装
3. **Phase 1.2**: Parser実装（Project, Table, Column）
4. **Phase 1.3**: Parser実装（Ref, Area, indexes）
5. **Phase 1.4**: Transformer, Exporter実装
6. **Phase 1.5**: エラーメッセージ日本語化
7. **Phase 1.6**: テスト通過確認、@dbml/core削除
8. **Phase 2**: サニタイザー最適化（web-v3）
9. **Phase 3**: Geminiプロンプト最適化（web-v3）
10. **Phase 4**: 統合テスト、リリース

---

## リスク対策

| リスク | 対策 |
|--------|------|
| パーサー実装の複雑化 | 段階的実装、十分なテスト |
| 後方互換性の破壊 | API維持、回帰テスト |
| AI生成出力の多様性 | サニタイザー維持、プロンプト最適化 |
