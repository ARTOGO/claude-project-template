# Multi-Agent Development Command

啟動多 Agent 協作開發流程，支援 Backend 與 Frontend 並行開發。

## Usage

```bash
/project:start-dev <TICKET-XXX 或功能描述>
```

## 執行前準備

**讀取專案配置**：
```bash
# 讀取 .claude/project.yaml 確認：
# - project.type: 專案類型（web-app / backend-only / frontend-only）
# - paths.*: 各目錄路徑
# - tech_stack.*: 技術棧設定
# - design.enabled: 是否有設計系統
```

## 執行流程總覽

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: 需求分析與 API Contract 協商                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Orchestrator 分析需求                                          │   │
│  │  → 讀取 TICKET 的設計稿（如有）                                 │   │
│  │  → 產出 API Contract                                            │   │
│  │  → 確認 Backend/Frontend 驗收條件                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: 並行開發（依 project.type 調整）                              │
│  ┌──────────────────────┐         ┌──────────────────────┐             │
│  │  Backend Engineer    │         │  Frontend Engineer   │             │
│  │                      │  並行   │                      │             │
│  │  - TDD 開發 API      │ ═══════ │  - Mock API 開發 UI  │             │
│  │  - 單元測試          │         │  - 依設計稿實作元件  │             │
│  │  - 註冊路由          │         │                      │             │
│  └──────────────────────┘         └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2.5: 整合驗證 ⚠️ 關鍵步驟，不可跳過！                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ☐ 新增模組已 import 到進入點                                   │   │
│  │  ☐ 路由/端點已註冊（非 placeholder）                            │   │
│  │  ☐ 服務重啟後 API 返回預期狀態碼                                │   │
│  │  ☐ Frontend 連接真實 API 正常（如適用）                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ※ 單元測試通過 ≠ 整合完成！必須驗證 API 實際可用                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: 並行 Review（依 team.review_agents 設定）                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ 🔒 Security│ │ 🧪 Test    │ │ 📐 Quality │ │ 📋 PM      │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4: 並行修復 (如有問題，最多 5 輪)                                │
│  ┌──────────────────────┐         ┌──────────────────────┐             │
│  │  Backend Engineer    │         │  Frontend Engineer   │             │
│  │  修復 Backend 問題   │  並行   │  修復 Frontend 問題  │             │
│  └──────────────────────┘         └──────────────────────┘             │
│                                                                         │
│  ※ 如有 API 變更：Backend 先修 → 通知 Frontend → Frontend 再修         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 需求分析與 API Contract 協商

### 1.1 讀取 TICKET 資訊

```bash
# 解析 $ARGUMENTS（TICKET 編號或功能描述）
# 讀取 {paths.tickets} 取得驗收條件
Read {paths.tickets}
```

### 1.2 檢查設計稿（當 design.enabled = true）

**判斷 TICKET 類型**：

1. 讀取 TICKET 的 `**類型**` 欄位
2. 檢查是否有 `**設計稿**` 欄位

```markdown
### 🎫 TICKET-006: 功能名稱

**類型**: Full-Stack  ← 判斷是否有 UI

**設計稿**:           ← 如有此欄位，必須讀取設計稿
- [ComponentA.md]({paths.designs}/components/ComponentA.md)
- [ComponentB.md]({paths.designs}/components/ComponentB.md)
```

**如果 TICKET 有設計稿**：

```bash
# 讀取所有關聯的設計稿
Read {paths.designs}/components/<ComponentA>.md
Read {paths.designs}/components/<ComponentB>.md
Read {paths.designs}/design-system.md  # 確保使用正確的 Design Tokens
```

**設計稿內容將用於**：

- Frontend Engineer: 依設計稿實作元件（Props、狀態、樣式）
- PM Agent: 驗證 UI 是否符合設計稿

### 1.3 產出 API Contract（Full-Stack 專案）

建立 API Contract 檔案（位置依專案結構決定）

### 1.4 確認理解

向用戶確認：

```markdown
## 開發計畫確認

**TICKET**: TICKET-XXX
**類型**: Full-Stack / Backend-Only / Frontend-Only
**設計稿**: ✅ 有 / ❌ 無

### 驗收條件摘要

**Backend**:
- [ ] ...

**Frontend**:
- [ ] 依照設計稿實作元件
- [ ] ...

確認開始開發？
```

---

## Phase 2: 並行開發

**依 `project.type` 決定啟動哪些 Engineer Agent**：

| project.type | 啟動的 Agents |
| ------------ | ------------- |
| web-app | Backend Engineer + Frontend Engineer（並行） |
| backend-only | Backend Engineer |
| frontend-only | Frontend Engineer |
| microservice | Backend Engineer |

**單一訊息同時啟動**（並行）：

| Agent | 任務 |
| ----- | ---- |
| Backend Engineer | 實作 API（TDD + 架構規範） |
| Frontend Engineer | 實作 UI（Mock API + **依設計稿**） |

### Frontend Engineer 額外指示（有設計稿時）

當 TICKET 有設計稿時，Frontend Engineer 的 prompt 須包含：

```markdown
## 設計稿參照

請嚴格依照以下設計稿實作：

1. **ComponentA** (`{paths.designs}/components/ComponentA.md`)
   - Props 介面: 依設計稿定義
   - 狀態: 依設計稿的狀態矩陣
   - 樣式: 使用 Design Tokens
   - 無障礙: 滿足設計稿的無障礙要求

2. **ComponentB** (`{paths.designs}/components/ComponentB.md`)
   - ...

## Design Tokens

使用 `{design.tokens_path}` 中定義的 CSS Variables。
```

**Agent 定義參考**：`.claude/agents/workers/engineer-backend.md`、`engineer-frontend.md`

---

## Phase 2.5: 整合驗證（關鍵步驟）

**此步驟為必要驗證，不可跳過！**

Backend 完成後，必須執行以下整合驗證：

### 2.5.1 驗證模組已註冊

**問題背景**：Engineer 可能完成了 handler/service/repository，但忘記在進入點檔案註冊，導致 API 無法存取。

**驗證方式**（依專案結構調整）：

```bash
# 檢查新的模組是否已註冊到進入點
# Go: grep -q "<feature>Handler" {paths.backend}/cmd/server/main.go
# Node: 檢查 routes 是否已 import
# Python: 檢查 router 是否已註冊

# 檢查路由是否已註冊（非 placeholder）
grep -q "/<feature>" {進入點檔案} || echo "❌ FAIL: Routes not registered"
```

**如果模組未註冊**：

1. 在進入點檔案 import 新模組
2. 初始化 handler/controller
3. 註冊路由

### 2.5.2 驗證 API 實際可用

```bash
# 重啟服務（依部署方式調整）
# Docker: docker restart <container-name>
# Local: 重啟開發伺服器
# K8s: kubectl rollout restart deployment/<name>

# 等待啟動
sleep 5

# 驗證 API 可用
curl -X GET http://localhost:<port>/api/v1/<feature>
# 預期：200 OK 或有意義的回應
# 失敗：501 NOT_IMPLEMENTED / 404 → 回到 2.5.1 修復
```

### 2.5.3 Frontend 連接真實 API（Full-Stack 專案）

Frontend Engineer 須：

1. 移除或禁用 Mock（MSW / mirage 等）
2. 連接真實 Backend API
3. 驗證 CRUD 操作正常運作
4. 確認錯誤處理正確

**整合驗證 Checklist**：

| 項目 | 狀態 |
| ---- | ---- |
| 新增模組已 import | ☐ |
| 路由已註冊 | ☐ |
| 服務重啟後 API 可用 | ☐ |
| Frontend 連接真實 API 正常 | ☐ |

### 2.5.4 整合驗證失敗處理

整合驗證未通過 = 開發未完成，不可進入 Phase 3 Review。

---

## Phase 3: 並行 Review

**單一訊息同時**啟動 Review Agents（依 `team.review_agents` 設定）：

| Agent | 職責 |
|-------|------|
| 🔒 Security | OWASP Top 10、Secrets 檢測 |
| 🧪 Test | 測試覆蓋率、E2E 完整性 |
| 📐 Quality | 架構規範、程式碼品質 |
| 📋 PM | 驗收條件完成度 |
| 🎨 UI（選配） | 設計稿符合度 |

### UI Reviewer Agent（當 design.enabled = true 且有設計稿）

UI Reviewer 會檢查：

- Props 介面是否與設計稿一致
- 所有狀態是否都有實作（Default、Hover、Disabled 等）
- 樣式是否使用 Design Tokens（禁止硬編碼）
- 響應式行為是否符合設計稿斷點
- 無障礙要求是否滿足（ARIA、鍵盤導航）

**Agent 定義參考**：`.claude/agents/reviewers/ui.md`

---

## Phase 4: 修復循環 (最多 5 輪)

| Feedback 類型 | 路由 |
| ------------- | ---- |
| Backend only | Backend Engineer（可並行） |
| Frontend only | Frontend Engineer（可並行） |
| 設計稿不符 | Frontend Engineer（需參照設計稿修復） |
| API Contract 變更 | Backend 先修 → Frontend 再修（串行） |

---

## 輸出

**成功時**：Development Complete Report

```markdown
## Development Complete ✅

### TICKET: TICKET-XXX

### 驗收結果

| 類別 | 完成度 | 狀態 |
| ---- | ------ | ---- |
| Backend | 100% | ✅ |
| Frontend | 100% | ✅ |
| 設計稿符合度 | 100% | ✅ |

### Review Results

| Agent | 結果 |
| ----- | ---- |
| 🔒 Security | ✅ PASS |
| 🧪 Test | ✅ PASS (覆蓋率 XX%) |
| 📐 Quality | ✅ PASS |
| 📋 PM | ✅ PASS |

### Suggested Commit Message

feat(<scope>): <description> - TICKET-XXX
```

**5 輪後仍失敗**：Development Review Report（含根本原因分析、各輪次問題摘要、建議下一步）

---

## 重要提醒

1. **Phase 1 必須檢查設計稿** - 如 TICKET 有設計稿欄位，必須讀取
2. Phase 1 必須產出 API Contract（Full-Stack 專案）
3. Phase 2/3 必須用**單一訊息**同時啟動多個 Agent（並行）
4. **Phase 2.5 整合驗證不可跳過** - 必須驗證模組已註冊
5. **Frontend Engineer 須依設計稿實作** - 有設計稿時
6. **PM Agent 須驗證設計稿符合度** - 有設計稿時
7. Security Critical → 整體立即 FAIL
8. API Contract 變更 → Backend 先修、Frontend 再修（串行）
9. 最多 5 輪，驗收條件 100% 才 PASS
10. **單元測試通過 ≠ 整合完成** - 必須驗證 API 實際可用

---

## 相關檔案

- **專案配置**: `.claude/project.yaml`
- **Engineers**: `.claude/agents/workers/engineer-backend.md`、`engineer-frontend.md`
- **Reviewers**: `.claude/agents/reviewers/`
- **設計稿**: `{paths.designs}` (從 project.yaml 讀取)
