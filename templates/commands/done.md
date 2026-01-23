# Done Command

完成開發流程，執行 Multi-Agent Code Review。

## Usage

```
/project:done [TICKET-XXX]
```

## 執行流程

### 1. 整合驗證（關鍵步驟）

**此步驟防止「單元測試通過但 API 未註冊」的問題！**

```bash
# 檢查新增的 handler 是否已註冊到 main.go
# 例如：檢查 connection handler
grep -q "connHandler" backend/cmd/server/main.go || echo "❌ FAIL: Handler not in main.go"

# 檢查路由是否使用實際 handler（非 notImplemented）
grep "/connections" backend/cmd/server/main.go | grep -v "notImplemented" || echo "❌ FAIL: Route uses notImplemented"

# 重啟 Docker 驗證 API 可用
docker restart insighthub-backend && sleep 5
docker logs insighthub-backend 2>&1 | tail -20
# 確認看到真實 handler 路由，而非 notImplemented
```

**整合驗證 Checklist**：

| 項目 | 狀態 |
| ---- | ---- |
| Handler 已在 main.go import | ☐ |
| Handler 已在 handlers struct | ☐ |
| Handler 已初始化 | ☐ |
| 路由已註冊（非 notImplemented） | ☐ |
| Docker 重啟後 API 返回 200 | ☐ |

### 2. 執行測試

```bash
# Backend (Go)
cd backend && go test -v -race -coverprofile=coverage.out ./...

# Frontend Unit Tests (Vitest)
cd frontend && pnpm run test:coverage

# Frontend E2E Tests (Playwright)
cd frontend && pnpm run test:e2e
```

### 3. 執行 Lint

```bash
# Backend
cd backend && golangci-lint run

# Frontend
cd frontend && pnpm run lint
```

### 4. 檢查 Git 狀態

```bash
git status
git diff --stat
```

### 5. Multi-Agent Review

→ 參考 [code-review-agents.md](../templates/code-review-agents.md)

**Security FAIL → 立即停止**

### 6. 產出報告

```
# Development Complete Report

## Summary
| 項目 | 結果 |
|-----|------|
| Status | PASS / FAIL |
| Ticket | TICKET-XXX |

## Test Results
- Backend: X passed, XX% coverage
- Frontend Unit: X passed, XX% coverage
- Frontend E2E: X passed (auth, flows)

## Multi-Agent Review
| Agent | 狀態 | 摘要 |
|-------|------|------|
| 🔒 Security | ✅/❌ | ... |
| 🧪 Test | ✅/❌ | ... |
| 📐 Quality | ✅/❌ | ... |
| 📋 PM | ✅/❌ | ... |

## Final Status
✅ PASS - Ready to commit
或
❌ FAIL - 必須修復: [問題清單]
```

### 7. 更新 TICKETS.md

**當 Review PASS 後，必須立即更新 `docs/TICKETS.md`：**

1. **勾選驗收條件**：將完成的驗收條件 `[ ]` 改為 `[x]`
2. **更新狀態**：在進度追蹤表格中，將 Ticket 狀態從 🔵 改為 ✅
3. **填寫完成日期**：格式 `YYYY-MM-DD`（如 `2026-01-20`）
4. **更新進度統計**：更新 Phase 進度百分比

**範例：**

```markdown
| Ticket | 名稱 | 狀態 | 完成日期 | 備註 |
|--------|------|------|----------|------|
| 001 | 基礎專案架構與 CI/CD | ✅ | 2026-01-20 | GitHub Actions 本地同步完成 |
```

**重要**：不更新 TICKETS.md = 工作未完成

## FAIL 條件

1. **整合驗證失敗** - Handler 未註冊到 main.go、API 返回 501 NOT_IMPLEMENTED
2. 測試失敗或覆蓋率 < 80%
3. E2E 測試失敗（關鍵流程）
4. Lint errors
5. Security Agent: Critical 問題
6. Test Agent: 缺少測試檔案
7. Quality Agent: 架構違規
8. PM Agent: 驗收未完成

## 相關檔案

- `.claude/agents/reviewers/security.md`
- `.claude/agents/reviewers/test.md`
- `.claude/agents/reviewers/quality.md`
- `.claude/agents/reviewers/pm.md`
