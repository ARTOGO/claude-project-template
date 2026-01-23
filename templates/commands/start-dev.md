# Multi-Agent Development Command

啟動多 Agent 協作開發流程，Backend 與 Frontend 並行開發。

## Usage

```bash
/project:start-dev <TICKET-XXX 或功能描述>
```

## 執行流程總覽

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: 需求分析與 API Contract 協商                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Orchestrator 分析需求                                          │   │
│  │  → 讀取 TICKET 的設計稿（如有）                                 │   │
│  │  → 產出 API Contract (TypeScript types)                         │   │
│  │  → 確認 Backend/Frontend 驗收條件                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: 並行開發                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐             │
│  │  Backend Engineer    │         │  Frontend Engineer   │             │
│  │  (golang-pro)        │  並行   │  (frontend-developer)│             │
│  │                      │ ═══════ │                      │             │
│  │  - TDD 開發 API      │         │  - Mock API 開發 UI  │             │
│  │  - 單元測試          │         │  - 依設計稿實作元件  │             │
│  │  - 註冊路由 main.go  │         │                      │             │
│  └──────────────────────┘         └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2.5: 整合驗證 ⚠️ 關鍵步驟，不可跳過！                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ☐ Handler 已在 main.go import                                  │   │
│  │  ☐ Handler 已在 handlers struct                                 │   │
│  │  ☐ Handler 已初始化                                             │   │
│  │  ☐ 路由已註冊（非 notImplemented）                              │   │
│  │  ☐ Docker 重啟後 API 返回 200（非 501）                         │   │
│  │  ☐ Frontend 連接真實 API 正常                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ※ 單元測試通過 ≠ 整合完成！必須驗證 API 實際可用                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: 並行 Review                                                   │
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
# 讀取 docs/TICKETS.md 取得驗收條件
Read docs/TICKETS.md
```

### 1.2 檢查設計稿（重要）

**判斷 TICKET 類型**：

1. 讀取 TICKET 的 `**類型**` 欄位
2. 檢查是否有 `**設計稿**` 欄位

```markdown
### 🎫 TICKET-006: 組織成員管理

**類型**: Full-Stack  ← 判斷是否有 UI

**設計稿**:           ← 如有此欄位，必須讀取設計稿
- [MemberList.md](designs/components/MemberList.md)
- [InviteMemberDialog.md](designs/components/InviteMemberDialog.md)
```

**如果 TICKET 有設計稿**：

```bash
# 讀取所有關聯的設計稿
Read docs/designs/components/MemberList.md
Read docs/designs/components/InviteMemberDialog.md
Read docs/designs/design-system.md  # 確保使用正確的 Design Tokens
```

**設計稿內容將用於**：

- Frontend Engineer: 依設計稿實作元件（Props、狀態、樣式）
- PM Agent: 驗證 UI 是否符合設計稿

### 1.3 產出 API Contract

建立 `frontend/src/lib/api/contracts/<feature>.ts`

**Contract 模板**：→ `frontend/src/lib/api/contracts/_template.ts`

### 1.4 確認理解

向用戶確認：

```markdown
## 開發計畫確認

**TICKET**: TICKET-006
**類型**: Full-Stack
**設計稿**: ✅ 有 (2 個元件設計)

### 驗收條件摘要

**Backend**:
- [ ] ...

**Frontend**:
- [ ] 依照設計稿實作 MemberList 元件
- [ ] 依照設計稿實作 InviteMemberDialog 元件
- [ ] ...

確認開始開發？
```

---

## Phase 2: 並行開發

**單一訊息同時**啟動 2 個 Engineer Agent：

| Agent | subagent_type | 任務 |
| ----- | ------------- | ---- |
| Backend Engineer | golang-pro | 實作 API（TDD + Clean Arch） |
| Frontend Engineer | frontend-developer | 實作 UI（MSW mock + **依設計稿**） |

### Frontend Engineer 額外指示（有設計稿時）

當 TICKET 有設計稿時，Frontend Engineer 的 prompt 須包含：

```markdown
## 設計稿參照

請嚴格依照以下設計稿實作：

1. **MemberList** (`docs/designs/components/MemberList.md`)
   - Props 介面: 依設計稿定義
   - 狀態: 依設計稿的狀態矩陣
   - 樣式: 使用設計稿的 CSS Modules
   - 無障礙: 滿足設計稿的無障礙要求

2. **InviteMemberDialog** (`docs/designs/components/InviteMemberDialog.md`)
   - ...

## Design Tokens

使用 `docs/designs/tokens/` 中定義的 CSS Variables。
```

**Prompt 參考**：`.claude/agents/workers/engineer-backend.md`、`engineer-frontend.md`

---

## Phase 2.5: 整合驗證（關鍵步驟）

**此步驟為必要驗證，不可跳過！**

Backend 完成後，必須執行以下整合驗證：

### 2.5.1 驗證 Handler 路由註冊

**問題背景**：Backend Engineer 可能完成了 handler/service/repository，但忘記在 `main.go` 註冊路由，導致 API 返回 501 NOT_IMPLEMENTED。

```bash
# 檢查新的 handler 是否已註冊到 main.go
grep -q "<feature>Handler" backend/cmd/server/main.go || echo "❌ FAIL: Handler not registered in main.go"

# 檢查路由是否已註冊
grep -q "/<feature>" backend/cmd/server/main.go || echo "❌ FAIL: Routes not registered"

# 範例：檢查 connection handler
grep -q "connHandler" backend/cmd/server/main.go
grep -q "/connections" backend/cmd/server/main.go
```

**如果 Handler 未註冊**：

1. 在 `main.go` import connection package
2. 在 `handlers` struct 加入 `connHandler`
3. 在 `initializeHandlers()` 初始化 handler
4. 在 `registerProtectedRoutes()` 註冊路由

### 2.5.2 驗證 API 實際可用

```bash
# 重啟 Backend Docker 容器
docker restart insighthub-backend

# 等待啟動
sleep 5

# 檢查路由是否出現在 log（不是 notImplemented）
docker logs insighthub-backend 2>&1 | grep -E "/<feature>" | grep -v "notImplemented"
```

### 2.5.3 執行 API 整合測試

```bash
# 手動測試 API（需要有效 token）
curl -X GET http://localhost:8787/api/v1/<feature> \
  -H "Authorization: Bearer $TOKEN"

# 預期：200 OK 或有意義的回應
# 失敗：501 NOT_IMPLEMENTED → 回到 2.5.1 修復
```

### 2.5.4 Frontend 連接真實 API

Frontend Engineer 須：

1. 移除或禁用 MSW mock
2. 連接真實 Backend API
3. 驗證 CRUD 操作正常運作
4. 確認錯誤處理正確

**整合驗證 Checklist**：

| 項目 | 狀態 |
| ---- | ---- |
| Handler 已在 main.go import | ☐ |
| Handler 已在 handlers struct | ☐ |
| Handler 已初始化 | ☐ |
| 路由已註冊（非 notImplemented） | ☐ |
| Docker 重啟後 API 可用 | ☐ |
| Frontend 連接真實 API 正常 | ☐ |

### 2.5.5 整合驗證失敗處理

整合驗證未通過 = 開發未完成，不可進入 Phase 3 Review。

---

## Phase 3: 並行 Review

→ 參考 [code-review-agents.md](../templates/code-review-agents.md)

**單一訊息同時**啟動 5 個 Review Agents（Security、Test、Quality、PM、UI）。

### UI Reviewer Agent

**當 TICKET 有設計稿時**，UI Reviewer 會檢查：

- Props 介面是否與設計稿一致
- 所有狀態是否都有實作（Default、Hover、Disabled 等）
- CSS Modules 是否使用 Design Tokens（禁止硬編碼）
- 響應式行為是否符合設計稿斷點
- 無障礙要求是否滿足（ARIA、鍵盤導航）
- 元件結構是否正確（4 檔案結構）

**Prompt 參考**：`.claude/agents/reviewers/ui.md`

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

### TICKET: TICKET-006

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
| 🧪 Test | ✅ PASS (覆蓋率 85%) |
| 📐 Quality | ✅ PASS |
| 📋 PM | ✅ PASS |

### Suggested Commit Message

\`\`\`
feat(organization): implement member management - TICKET-006
\`\`\`
```

**5 輪後仍失敗**：Development Review Report（含根本原因分析、各輪次問題摘要、建議下一步）

---

## 重要提醒

1. **Phase 1 必須檢查設計稿** - 如 TICKET 有設計稿欄位，必須讀取
2. Phase 1 必須產出 API Contract 檔案
3. Phase 2/3 必須用**單一訊息**同時啟動多個 Agent（並行）
4. **Phase 2.5 整合驗證不可跳過** - 必須驗證 Handler 已註冊到 main.go
5. **Frontend Engineer 須依設計稿實作** - 有設計稿時
6. **PM Agent 須驗證設計稿符合度** - 有設計稿時
7. Security Critical → 整體立即 FAIL
8. API Contract 變更 → Backend 先修、Frontend 再修（串行）
9. 最多 5 輪，驗收條件 100% 才 PASS
10. **單元測試通過 ≠ 整合完成** - 必須驗證 API 實際可用（非 501 NOT_IMPLEMENTED）

---

## 相關檔案

- **Engineer**: `.claude/agents/workers/engineer-backend.md`、`engineer-frontend.md`
- **Reviewers**: `.claude/agents/reviewers/`
- **Contract**: `frontend/src/lib/api/contracts/`
- **設計稿**: `docs/designs/`
