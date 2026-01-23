# 完整開發流程指南

> 從需求到交付的完整工作流程：需求 → PRD → 設計稿 → Tickets → 開發 → Review → 完成

---

## 流程總覽

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Complete Development Workflow                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Phase 1: 需求規劃                                                               │
│  ───────────────                                                                │
│  /project:plan <需求描述>                                                        │
│     │                                                                           │
│     ├─ 1.1 檢查/更新 PRD                                                         │
│     │     ├─ 需求已在 PRD → 引用編號                                             │
│     │     ├─ 部分在 PRD → 詢問補充                                               │
│     │     └─ 不在 PRD → 詢問新增                                                 │
│     │                                                                           │
│     ├─ 1.2 需求拆解                                                              │
│     │     ├─ 識別類型: Backend-only / Frontend-only / Full-Stack                │
│     │     └─ 定義驗收條件                                                        │
│     │                                                                           │
│     ├─ 1.3 產出 Tickets                                                          │
│     │     ├─ TICKET-XXX 建立                                                     │
│     │     └─ 更新 {paths.tickets}                                               │
│     │                                                                           │
│     └─ 1.4 判斷是否需要設計                                                       │
│           ├─ 有 UI → 執行 /project:design                                        │
│           └─ 無 UI → 直接完成                                                    │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Phase 2: 設計（如有 UI 需求）                                                    │
│  ────────────────────────────                                                   │
│  /project:design TICKET-XXX                                                     │
│     │                                                                           │
│     ├─ 2.1 UX 設計                                                               │
│     │     ├─ 用戶流程 (User Flow)                                                │
│     │     ├─ 資訊架構 (IA)                                                       │
│     │     └─ Wireframe                                                          │
│     │     → 輸出到 {paths.designs}/ux/                                           │
│     │                                                                           │
│     ├─ 2.2 UI 設計                                                               │
│     │     ├─ 視覺設計                                                            │
│     │     ├─ 元件規格                                                            │
│     │     └─ Design Tokens 應用                                                  │
│     │     → 輸出到 {paths.designs}/components/ 或 pages/                         │
│     │                                                                           │
│     ├─ 2.3 Design Review（並行審查）                                              │
│     │     ├─ PRD Alignment (critical)                                            │
│     │     ├─ Accessibility (high)                                                │
│     │     ├─ Design System (high)                                                │
│     │     └─ UX Alignment (high)                                                │
│     │                                                                           │
│     └─ 2.4 更新 Tickets 設計稿連結                                                │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Phase 3: 開發                                                                   │
│  ────────────                                                                   │
│  /project:start-dev TICKET-XXX                                                  │
│     │                                                                           │
│     ├─ 3.1 分析需求與設計稿                                                       │
│     │     ├─ 讀取 Ticket 驗收條件                                                │
│     │     ├─ 讀取設計稿（如有）                                                   │
│     │     └─ 產出 API Contract（Full-Stack）                                     │
│     │                                                                           │
│     ├─ 3.2 並行開發（依 project.type）                                            │
│     │     ├─ Backend Engineer (TDD)                                              │
│     │     │     ├─ RED: 先寫測試                                                 │
│     │     │     ├─ GREEN: 實作功能                                               │
│     │     │     └─ REFACTOR: 重構                                                │
│     │     │                                                                     │
│     │     └─ Frontend Engineer (TDD + 設計稿)                                    │
│     │           ├─ 依設計稿實作元件                                              │
│     │           ├─ Mock API 開發                                                 │
│     │           └─ 元件測試                                                      │
│     │                                                                           │
│     ├─ 3.3 整合驗證（Phase 2.5）⚠️ 關鍵步驟                                      │
│     │     ├─ 新增模組已 import 到進入點                                          │
│     │     ├─ 路由已註冊（非 placeholder）                                        │
│     │     ├─ 服務重啟後 API 可用                                                 │
│     │     └─ Frontend 連接真實 API 正常                                          │
│     │                                                                           │
│     └─ 3.4 並行 Review                                                           │
│           ├─ Security Agent                                                      │
│           ├─ Test Agent (TDD 合規檢查)                                           │
│           ├─ Quality Agent                                                       │
│           └─ PM Agent                                                            │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Phase 4: 完成                                                                   │
│  ────────────                                                                   │
│  /project:done [TICKET-XXX]                                                     │
│     │                                                                           │
│     ├─ 4.1 整合驗證（同 Phase 2.5）                                              │
│     │                                                                           │
│     ├─ 4.2 執行測試                                                              │
│     │     ├─ 單元測試                                                            │
│     │     ├─ 覆蓋率檢查 >= {team.test_coverage}%                                 │
│     │     └─ E2E 測試                                                            │
│     │                                                                           │
│     ├─ 4.3 執行 Lint                                                             │
│     │     └─ 依 {team.linter.*} 設定                                            │
│     │                                                                           │
│     ├─ 4.4 Multi-Agent Review                                                    │
│     │     ├─ Security → Critical 問題立即 FAIL                                   │
│     │     ├─ Test → TDD 合規、覆蓋率                                             │
│     │     ├─ Quality → 架構規範                                                  │
│     │     └─ PM → 驗收條件完成度                                                 │
│     │                                                                           │
│     ├─ 4.5 更新 TICKETS 檔案                                                     │
│     │     ├─ 勾選驗收條件                                                        │
│     │     ├─ 更新狀態 🔵 → ✅                                                    │
│     │     └─ 填寫完成日期                                                        │
│     │                                                                           │
│     └─ 4.6 產出 Development Complete Report                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 指令對照表

| 階段 | 指令 | 用途 |
|------|------|------|
| 需求規劃 | `/project:plan <需求>` | 分析需求、更新 PRD、產出 Tickets |
| 設計 | `/project:design TICKET-XXX` | UX + UI 設計、Design Review |
| 設計 | `/project:design --figma <URL>` | 讀取 Figma 轉換為 MD |
| 開發 | `/project:start-dev TICKET-XXX` | 並行開發 + Review |
| 開發 | `/project:tdd <功能>` | TDD 開發流程 |
| 完成 | `/project:done [TICKET-XXX]` | 最終驗證 + Review |

---

## 工作流程類型

### 1. 完整流程（新功能）

```bash
# 1. 規劃需求
/project:plan 實作用戶認證功能

# 2. 設計（如有 UI）
/project:design TICKET-012,TICKET-013

# 3. 開發
/project:start-dev TICKET-012,TICKET-013

# 4. 完成
/project:done
```

### 2. 純後端開發

```bash
# 1. 規劃
/project:plan 新增 API 端點

# 2. 開發（跳過設計）
/project:start-dev TICKET-XXX

# 3. 完成
/project:done
```

### 3. 純前端開發（有設計稿）

```bash
# 1. 規劃
/project:plan 新增 Dashboard 頁面

# 2. 設計
/project:design TICKET-XXX

# 3. 開發
/project:start-dev TICKET-XXX

# 4. 完成
/project:done
```

### 4. 直接 TDD 開發（無 Ticket）

```bash
# 直接用 TDD 開發
/project:tdd 實作某個功能

# 完成
/project:done
```

---

## 品質保證機制

### 1. TDD 強制執行

| 檢查點 | 機制 |
|-------|------|
| `/project:tdd` | 強制 RED → GREEN → REFACTOR |
| `/project:start-dev` | Engineer Agent 遵循 TDD |
| `/project:done` | Test Reviewer 驗證 TDD 合規 |

### 2. Precommit/CI 同步

| 檢查項目 | Precommit | CI | 必須同步 |
|---------|-----------|-----|---------|
| Lint | ✅ | ✅ | **是** |
| 測試 | ✅ | ✅ | **是** |
| Type Check | ✅ | ✅ | **是** |
| 覆蓋率 | ⚠️ 可選 | ✅ | - |

**核心原則**：Precommit 通過 = CI 必須通過

### 3. 整合驗證（Phase 2.5）

**防止「單元測試通過但功能未整合」問題**：

| 檢查項目 | 說明 |
|---------|------|
| 模組已 import | 檢查進入點檔案 |
| 路由已註冊 | 非 placeholder |
| API 可存取 | 服務重啟後正常回應 |
| 前後端整合 | Frontend 連接真實 API |

### 4. Multi-Agent Review

| Agent | 優先級 | FAIL 條件 |
|-------|--------|----------|
| 🔒 Security | Critical | 任何安全問題 |
| 🧪 Test | High | TDD 違規、覆蓋率不足 |
| 📐 Quality | High | 架構違規 |
| 📋 PM | High | 驗收條件未完成 |

---

## 相關檔案

### 指令檔案
- `.claude/commands/plan.md` - 需求規劃
- `.claude/commands/design.md` - 設計流程
- `.claude/commands/start-dev.md` - 開發流程
- `.claude/commands/tdd.md` - TDD 開發
- `.claude/commands/done.md` - 完成流程

### 規範檔案
- `.claude/templates/test-requirements.md` - 測試規範
- `.claude/templates/precommit-ci-sync.md` - Precommit/CI 同步
- `.claude/templates/ticket-format.md` - Ticket 格式

### Agent 檔案
- `.claude/agents/workers/engineer-backend.md` - Backend Engineer
- `.claude/agents/workers/engineer-frontend.md` - Frontend Engineer
- `.claude/agents/reviewers/` - Review Agents

### 專案配置
- `.claude/project.yaml` - 專案設定

---

## 常見問題

### Q: 什麼時候需要執行 `/project:design`？

當 Ticket 類型為 **Frontend** 或 **Full-Stack** 時需要設計。`/project:plan` 會自動判斷並建議執行設計。

### Q: 可以跳過設計直接開發嗎？

技術上可以，但 PM Agent 會在 Review 時檢查設計稿符合度。缺少設計稿可能導致 Review 失敗。

### Q: TDD 是強制的嗎？

是的。Test Reviewer 會檢查：
- 測試先於實作
- 測試覆蓋所有驗收條件
- 測試包含 edge cases
- 覆蓋率達標

### Q: Precommit 失敗但 CI 通過怎麼辦？

這表示 Precommit 和 CI 設定不同步。請參考 `precommit-ci-sync.md` 修正配置。

### Q: 整合驗證（Phase 2.5）可以跳過嗎？

**不可以**。這是防止「單元測試通過但功能無法使用」的關鍵步驟。

---

**類型**: 完整開發流程指南
**依賴**: `project.yaml` 專案設定
