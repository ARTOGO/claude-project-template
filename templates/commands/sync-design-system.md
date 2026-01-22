# Sync Design System Command

從既有 Figma Design System 同步設計規範到專案，產出與從頭設計相同的文件格式，並比對現有程式碼產出差異報告。

## Usage

```bash
/project:sync-design-system <Figma Design System URL>

# 範例
/project:sync-design-system https://figma.com/design/ABC123/DesignSystem?node-id=0-1
```

## 執行流程

```text
┌─────────────────────────────────────────────────────────────────────┐
│              /project:sync-design-system <Figma URL>                │
├─────────────────────────────────────────────────────────────────────┤
│  Phase 1: 讀取 Figma Design System                                  │
│     ├─ get_variable_defs: Design Tokens（色彩、字體、間距）          │
│     ├─ get_design_context: 元件結構、樣式                           │
│     └─ get_screenshot: 視覺參考截圖                                 │
│                                                                     │
│  Phase 2: 讀取現有程式碼                                             │
│     ├─ frontend/src/styles/*.css - CSS Variables                   │
│     ├─ frontend/src/components/ - 元件清單                          │
│     └─ docs/designs/ - 現有設計文件（如有）                          │
│                                                                     │
│  Phase 3: 轉換成專案格式（與從頭設計產出相同）                        │
│     ├─ docs/designs/tokens/*.css                                    │
│     ├─ docs/designs/design-system.md                                │
│     └─ docs/designs/components/*.md                                 │
│                                                                     │
│  Phase 4: 比對分析，產出差異報告                                     │
│     └─ docs/designs/sync-report.md                                  │
│                                                                     │
│  Phase 5: 產出摘要                                                   │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
    後續正常流程
    /project:design <功能> [--figma <URL>]
```

---

## Phase 1: 讀取 Figma Design System

### 1.1 解析 Figma URL

從 URL 提取 `fileKey` 和 `nodeId`：

```text
https://figma.com/design/ABC123/FileName?node-id=1-2
                         ↑                    ↑
                    fileKey=ABC123      nodeId=1:2
```

### 1.2 使用 Figma MCP 工具

```text
1. get_variable_defs(fileKey, nodeId)
   → 取得 Design Tokens（色彩、字體、間距、圓角等）

2. get_design_context(fileKey, nodeId)
   → 取得元件結構、Props、狀態、樣式

3. get_screenshot(fileKey, nodeId)
   → 取得視覺參考截圖
```

### 1.3 預期取得資料

| 類型 | 內容 |
|------|------|
| **Colors** | Primary, Secondary, Neutral, Semantic (Success/Warning/Error) |
| **Typography** | Font Family, Font Size, Line Height, Font Weight |
| **Spacing** | 4px 基數系統（4, 8, 12, 16, 24, 32, 48, 64） |
| **Border Radius** | Small, Medium, Large, Full |
| **Shadows** | Elevation levels |
| **Components** | Button, Input, Card, Modal 等 |

---

## Phase 2: 讀取現有程式碼

### 2.1 CSS Variables 位置

```bash
# 讀取現有樣式定義
Read frontend/src/styles/globals.css
Read frontend/src/styles/variables.css
Glob frontend/src/styles/**/*.css
```

### 2.2 元件清單

```bash
# 讀取現有元件
Glob frontend/src/components/**/*.tsx
Glob frontend/src/components/**/index.ts
```

### 2.3 現有設計文件

```bash
# 讀取現有設計文件（如有）
Read docs/designs/design-system.md
Glob docs/designs/components/*.md
Glob docs/designs/tokens/*.css
```

---

## Phase 3: 轉換成專案格式

### 3.1 輸出檔案結構

```text
docs/designs/
├── design-system.md          # 設計系統總覽
├── tokens/
│   ├── colors.css            # 色彩 Tokens
│   ├── typography.css        # 字體 Tokens
│   ├── spacing.css           # 間距 Tokens
│   └── misc.css              # 圓角、陰影等
├── components/
│   ├── Button.md             # 元件設計稿
│   ├── Input.md
│   └── ...
└── sync-report.md            # 差異報告
```

### 3.2 design-system.md 格式

→ 參考 [design-templates.md](../templates/design-templates.md)

**Figma → design-system.md 欄位對應**：

| Figma 資料 | design-system.md 欄位 |
| ---------- | --------------------- |
| File name / Description | 設計系統名稱、說明 |
| Variable Collections | Token 檔案清單 |
| Component Set names | 元件清單 |
| Page names | 頁面設計清單（如有） |

### 3.3 元件設計稿格式

→ 參考 [design-templates.md](../templates/design-templates.md#ui-元件設計稿模板)

**Figma → 元件設計稿欄位對應**：

| Figma 資料 | 元件設計稿欄位 |
| ---------- | -------------- |
| Component name | `# <ComponentName>` 標題 |
| Description | `> 簡短描述` |
| Component Properties | `Props 介面` |
| Variants | `狀態設計` 表格 |
| Auto Layout | `結構設計` ASCII |
| Constraints | `響應式行為` 表格 |
| Accessibility annotations | `無障礙要求` 清單 |
| Fills, Strokes, Effects | `樣式定義` CSS |
| Figma URL | `基本資訊 > Figma` 連結 |

### 3.4 Token CSS 格式

```css
/* docs/designs/tokens/colors.css */
/* 來源: Figma Design System - [URL] */
/* 同步日期: YYYY-MM-DD */

:root {
  /* Primary */
  --color-primary-50: #e3f2fd;
  --color-primary-100: #bbdefb;
  --color-primary-500: #2196f3;  /* Main */
  --color-primary-700: #1976d2;
  --color-primary-900: #0d47a1;

  /* Semantic */
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;

  /* ... */
}
```

---

## Phase 4: 差異分析與報告

### 4.1 檢查項目（優先級排序）

| 優先級 | 檢查項目 | 說明 |
|--------|---------|------|
| **P0** | Token 命名一致性 | Figma Token 名稱必須對應程式碼 CSS Variable 名稱 |
| **P0** | 元件命名一致性 | Figma 元件名稱必須對應程式碼元件名稱 |
| **P1** | Variant 完整性 | 所有 Figma Variant 都應在程式碼中實作 |
| **P1** | Token 值一致性 | Token 值（色彩、間距）應一致 |
| **P2** | 狀態完整性 | Default/Hover/Active/Disabled/Error 等狀態 |
| **P2** | 響應式定義 | 斷點定義是否一致 |
| **P3** | 無障礙合規 | 色彩對比、Focus 狀態 |

### 4.2 sync-report.md 格式

```markdown
# Design System Sync Report

## 基本資訊

| 項目 | 值 |
|------|-----|
| Figma URL | [連結](https://figma.com/...) |
| 同步日期 | YYYY-MM-DD |
| 執行者 | Claude Code |

---

## 摘要

| 類別 | 項目數 | 一致 | 差異 | 缺少 |
|------|-------|------|------|------|
| Design Tokens | X | X | X | X |
| Components | X | X | X | X |
| Variants | X | X | X | X |

**整體狀態**: ⚠️ 需要修改 / ✅ 已同步

---

## P0: Token 命名一致性

### 需要修改

| Figma Token | 程式碼 Variable | 建議動作 |
|-------------|----------------|---------|
| `brand/primary` | `--color-primary` | ✅ 一致 |
| `brand/secondary` | `--color-accent` | ⚠️ Figma 改名為 `brand/accent` 或程式碼改為 `--color-secondary` |
| `spacing/md` | (缺少) | ➕ 程式碼新增 `--spacing-md: 16px` |

### 對照表

完整的 Figma → 程式碼 對照表：

| Figma Token | CSS Variable | 值 | 狀態 |
|-------------|--------------|-----|------|
| `color/primary/500` | `--color-primary-500` | #2196f3 | ✅ |
| `color/primary/700` | `--color-primary-700` | #1976d2 | ✅ |
| ... | ... | ... | ... |

---

## P0: 元件命名一致性

### 需要修改

| Figma 元件 | 程式碼元件 | 建議動作 |
|-----------|-----------|---------|
| `Button` | `Button` | ✅ 一致 |
| `Text Field` | `Input` | ⚠️ 統一命名（建議 Figma 改為 `Input`）|
| `Dialog` | `Modal` | ⚠️ 統一命名（建議程式碼改為 `Dialog`）|
| `Chip` | (缺少) | ➕ 程式碼新增 `Chip` 元件 |

---

## P1: Variant 完整性

### Button

| Figma Variant | 程式碼實作 | 狀態 |
|---------------|-----------|------|
| `variant=primary` | `variant="primary"` | ✅ |
| `variant=secondary` | `variant="secondary"` | ✅ |
| `variant=outline` | `variant="outlined"` | ⚠️ 命名不一致 |
| `variant=ghost` | (缺少) | ❌ 未實作 |
| `size=sm` | `size="small"` | ⚠️ 命名不一致 |
| `size=md` | `size="medium"` | ✅ |
| `size=lg` | `size="large"` | ✅ |

**建議動作**:
1. 程式碼新增 `variant="ghost"`
2. 統一 size 命名：Figma `sm/md/lg` → 程式碼 `small/medium/large`（或反向）

### Input

| Figma Variant | 程式碼實作 | 狀態 |
|---------------|-----------|------|
| ... | ... | ... |

---

## P1: Token 值一致性

### 差異清單

| Token | Figma 值 | 程式碼值 | 差異 | 建議 |
|-------|---------|---------|------|------|
| `--color-primary-500` | #2196f3 | #1976d2 | 色相不同 | 以 Figma 為準 |
| `--spacing-lg` | 24px | 32px | 數值不同 | 以 Figma 為準 |
| `--radius-md` | 8px | 6px | 數值不同 | 以 Figma 為準 |

---

## P2: 狀態完整性

### Button 狀態檢查

| 狀態 | Figma | 程式碼 | 建議 |
|------|-------|-------|------|
| Default | ✅ | ✅ | - |
| Hover | ✅ | ✅ | - |
| Active/Pressed | ✅ | ❌ | 程式碼補充 `:active` 樣式 |
| Disabled | ✅ | ✅ | - |
| Loading | ✅ | ❌ | 程式碼補充 Loading 狀態 |
| Focus | ✅ | ⚠️ | Focus ring 顏色不一致 |

---

## P2: 響應式定義

| 斷點名稱 | Figma | 程式碼 | 狀態 |
|---------|-------|-------|------|
| Mobile | 375px | 360px | ⚠️ |
| Tablet | 768px | 768px | ✅ |
| Desktop | 1440px | 1200px | ⚠️ |

**建議**: 統一斷點定義，以 Figma 為準

---

## P3: 無障礙合規

### 色彩對比檢查

| 組合 | 對比度 | WCAG AA | WCAG AAA |
|------|-------|---------|----------|
| Primary on White | 4.5:1 | ✅ | ❌ |
| Secondary on White | 3.2:1 | ❌ | ❌ |
| Error on White | 4.8:1 | ✅ | ❌ |

**建議**: Secondary 色彩對比不足，建議加深

### Focus 狀態

- [ ] 所有互動元件有可見的 Focus 狀態
- [ ] Focus ring 使用一致的樣式
- [ ] Focus 順序符合視覺順序

---

## 修改建議摘要

### 優先處理（P0）

1. **Token 命名統一**
   - `brand/secondary` → `brand/accent`（或反向）
   - 新增缺少的 Token: `--spacing-md`

2. **元件命名統一**
   - Figma `Text Field` → `Input`
   - 程式碼 `Modal` → `Dialog`

### 需要補充（P1）

1. **新增 Variant**
   - Button: `variant="ghost"`

2. **Token 值同步**
   - 更新 `--color-primary-500` 為 #2196f3
   - 更新 `--spacing-lg` 為 24px

### 建議改善（P2-P3）

1. 補充 Button `:active` 和 Loading 狀態
2. 統一響應式斷點
3. 調整 Secondary 色彩以符合 WCAG AA

---

## 產出檔案清單

| 檔案 | 狀態 | 說明 |
|------|------|------|
| `docs/designs/design-system.md` | ✅ 已產出 | 設計系統總覽 |
| `docs/designs/tokens/colors.css` | ✅ 已產出 | 色彩 Tokens |
| `docs/designs/tokens/typography.css` | ✅ 已產出 | 字體 Tokens |
| `docs/designs/tokens/spacing.css` | ✅ 已產出 | 間距 Tokens |
| `docs/designs/tokens/misc.css` | ✅ 已產出 | 其他 Tokens |
| `docs/designs/components/Button.md` | ✅ 已產出 | Button 設計稿 |
| `docs/designs/components/Input.md` | ✅ 已產出 | Input 設計稿 |
| ... | ... | ... |

---

## 下一步

1. 檢視此報告，決定修改方向
2. 執行修改（手動或使用 `/project:fix`）
3. 使用正常設計流程開發新功能：
   - `/project:design <功能>` - AI 根據同步後的設計系統產出設計
   - `/project:design <功能> --figma <URL>` - 讀取 Figma 設計稿轉換
```

---

## Phase 5: 輸出摘要

執行完成後輸出：

```markdown
## Design System Sync Complete

### 同步結果

| 項目 | 數量 |
|------|------|
| Design Tokens | X 個 |
| Components | X 個 |
| 差異項目 | X 個 |

### 產出檔案

- `docs/designs/design-system.md`
- `docs/designs/tokens/*.css` (4 files)
- `docs/designs/components/*.md` (X files)
- `docs/designs/sync-report.md` ← **請檢視此報告**

### 下一步

1. 檢視 [sync-report.md](docs/designs/sync-report.md) 決定修改方向
2. 使用 `/project:design <功能>` 開始新功能設計
```

---

## 相關檔案

- `.claude/templates/design-templates.md` - 設計文件模板
- `.claude/agents/experts/design-system-architect.md` - 設計系統專家
- `.claude/commands/design.md` - 設計指令（後續流程）
