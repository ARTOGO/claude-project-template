# Done Command

完成開發流程，執行 Multi-Agent Code Review。

## Usage

```
/project:done [TICKET-XXX]
```

## 執行前準備

**讀取專案配置**：
```bash
# 讀取 .claude/project.yaml 確認：
# - paths.backend: 後端程式碼目錄
# - paths.frontend: 前端程式碼目錄
# - paths.tickets: Tickets 檔案路徑
# - tech_stack.backend.language: 後端語言
# - tech_stack.frontend.package_manager: 前端套件管理器
# - team.test_coverage: 測試覆蓋率要求
# - team.linter.backend / team.linter.frontend: Linter 設定
```

## 執行流程

### 1. 整合驗證（關鍵步驟）

**此步驟防止「單元測試通過但功能未整合」的問題！**

**整合驗證 Checklist**（依專案架構調整）：

| 項目 | 說明 |
| ---- | ---- |
| 新增的模組已 import | ☐ 檢查進入點檔案 |
| 路由/端點已註冊 | ☐ 非 placeholder/notImplemented |
| 服務可啟動 | ☐ 重啟後無錯誤 |
| API 可存取 | ☐ 返回預期狀態碼 |

**驗證命令範例**（依 project.yaml 調整）：

```bash
# 依 paths.backend 和專案結構調整以下命令

# 檢查模組是否已註冊（範例）
grep -q "<feature>Handler" ${paths.backend}/cmd/server/main.go

# 重啟服務驗證（依部署方式調整）
# Docker: docker restart <container-name>
# Local: 重啟開發伺服器
# K8s: kubectl rollout restart deployment/<name>

# 驗證 API 可用
curl -X GET http://localhost:<port>/api/v1/<endpoint>
```

### 2. 執行測試

**依 `project.yaml` 的 `tech_stack` 執行對應測試命令**：

| 語言/框架 | 單元測試 | E2E 測試 |
| --------- | -------- | -------- |
| Go | `go test -v -race -coverprofile=coverage.out ./...` | - |
| Python | `pytest --cov` | `pytest e2e/` |
| Node (pnpm) | `pnpm test:coverage` | `pnpm test:e2e` |
| Node (npm) | `npm run test:coverage` | `npm run test:e2e` |

### 3. 執行 Lint

**依 `project.yaml` 的 `team.linter` 設定執行**：

| Linter | 命令 |
| ------ | ---- |
| golangci-lint | `golangci-lint run` |
| eslint | `pnpm lint` 或 `npm run lint` |
| pylint/ruff | `ruff check .` |
| biome | `biome check .` |

### 4. 檢查 Git 狀態

```bash
git status
git diff --stat
```

### 5. Multi-Agent Review

啟動 Review Agents（依 `team.review_agents` 設定）：

| Agent | 職責 |
|-------|------|
| 🔒 Security | OWASP Top 10、Secrets 檢測 |
| 🧪 Test | 測試覆蓋率、E2E 完整性 |
| 📐 Quality | 架構規範、程式碼品質 |
| 📋 PM | 驗收條件完成度 |

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
- Frontend E2E: X passed

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

### 7. 更新 TICKETS 檔案

**當 Review PASS 後，更新 `{paths.tickets}` 檔案：**

1. **勾選驗收條件**：將 `[ ]` 改為 `[x]`
2. **更新狀態**：將 Ticket 狀態從 🔵 改為 ✅
3. **填寫完成日期**：格式 `YYYY-MM-DD`
4. **更新進度統計**：更新 Phase 進度百分比

**重要**：不更新 TICKETS = 工作未完成

## FAIL 條件

1. **整合驗證失敗** - 模組未註冊、API 無法存取
2. 測試失敗或覆蓋率 < `{team.test_coverage}%`
3. E2E 測試失敗（關鍵流程）
4. Lint errors
5. Security Agent: Critical 問題
6. Test Agent: 缺少測試檔案
7. Quality Agent: 架構違規
8. PM Agent: 驗收未完成

## 相關檔案

- `.claude/project.yaml` - 專案配置（路徑、技術棧）
- `.claude/agents/reviewers/security.md`
- `.claude/agents/reviewers/test.md`
- `.claude/agents/reviewers/quality.md`
- `.claude/agents/reviewers/pm.md`
