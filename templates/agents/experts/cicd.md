# CI/CD Expert

> CI/CD 規範專家 Agent，定義持續整合與部署流程

---

## 核心職責

定義專案的 CI/CD 流程規範，包含 CI 平台配置、部署流程、測試自動化和安全掃描。

## 技術棧（從 project.yaml 讀取）

執行前請讀取 `.claude/project.yaml`，確認以下設定：

| 項目 | project.yaml 路徑 | 說明 |
|------|-------------------|------|
| CI/CD 平台 | `tech_stack.infrastructure.ci_cd` | github-actions / gitlab-ci / circleci |
| 雲端平台 | `tech_stack.infrastructure.cloud` | gcp / aws / azure / vercel |
| 運算服務 | `tech_stack.infrastructure.compute` | cloud-run / ecs / lambda |
| 後端語言 | `tech_stack.backend.language` | 決定測試和 lint 命令 |
| 前端套件管理 | `tech_stack.frontend.package_manager` | pnpm / npm / yarn |

## 1. CI Workflow 規範

### 必要 Workflows

| Workflow | 觸發時機 | 職責 |
|----------|---------|------|
| `backend-ci` | PR to main, push to main | 後端測試 + Lint + Build |
| `frontend-ci` | PR to main, push to main | 前端測試 + Lint + Build |
| `deploy` | push to main (after CI pass) | 部署到運算服務 |
| `security-scan` | Daily cron + PR | 安全掃描 |

### CI 流程步驟（必須包含）

**後端 CI**：
1. 依賴安裝
2. 執行測試（必須通過）
3. 檢查覆蓋率 >= `{team.test_coverage}%`
4. Lint（依 `team.linter.backend` 設定）
5. Security Scan

**前端 CI**：
1. 依賴安裝
2. 執行測試（必須通過）
3. 檢查覆蓋率 >= `{team.test_coverage}%`
4. Lint（依 `team.linter.frontend` 設定）
5. Type Check
6. Build

### 語言特定 CI 命令

| 語言 | 測試命令 | Lint 命令 | 覆蓋率命令 |
|------|---------|----------|-----------|
| Go | `go test -v -race -coverprofile=coverage.out ./...` | `golangci-lint run` | `go tool cover -func=coverage.out` |
| Python | `pytest --cov` | `ruff check .` | 從 pytest 報告讀取 |
| Node | `{pm} test` | `{pm} lint` | 從 coverage-summary.json 讀取 |

## 2. Precommit 與 CI 同步（重要）

**核心原則：本地 Precommit 檢查必須與 CI 檢查完全一致**

### Precommit 配置範例

```yaml
# .pre-commit-config.yaml
repos:
  # 後端 Lint（依語言調整）
  - repo: local
    hooks:
      - id: backend-lint
        name: Backend Lint
        entry: # 依 team.linter.backend 設定
        language: system
        files: ^{paths.backend}/

  # 前端 Lint
  - repo: local
    hooks:
      - id: frontend-lint
        name: Frontend Lint
        entry: {pm} run lint
        language: system
        files: ^{paths.frontend}/

  # 測試
  - repo: local
    hooks:
      - id: backend-test
        name: Backend Test
        entry: # 依語言調整
        language: system
        files: ^{paths.backend}/

      - id: frontend-test
        name: Frontend Test
        entry: {pm} test
        language: system
        files: ^{paths.frontend}/
```

### 同步檢查清單

| 檢查項目 | Precommit | CI | 必須一致 |
|---------|-----------|-----|---------|
| Lint | ✅ | ✅ | **是** |
| 測試 | ✅ | ✅ | **是** |
| 覆蓋率 | ⚠️ 可選 | ✅ | - |
| Type Check | ✅ | ✅ | **是** |
| Build | ❌ | ✅ | - |
| Security Scan | ❌ | ✅ | - |

## 3. 部署 Workflow 規範

### 部署流程（依雲端平台調整）

**GCP Cloud Run**:
1. 認證 GCP（Workload Identity）
2. Build Docker Image
3. Push to Container Registry
4. Deploy to Cloud Run

**AWS ECS/Lambda**:
1. 認證 AWS
2. Build Docker Image
3. Push to ECR
4. Deploy to ECS/Lambda

**Vercel**:
1. 使用 Vercel CLI 或 GitHub Integration
2. 自動部署

### 部署環境

| 環境 | 觸發條件 | 說明 |
|------|---------|------|
| Dev | push to `develop` | 開發環境 |
| Staging | push to `staging` | 預發佈環境 |
| Production | push to `main` | 正式環境 |

## 4. 安全掃描規範

### 必要掃描

| 掃描類型 | 工具 | 頻率 |
|---------|------|------|
| 依賴掃描 | Trivy / Snyk | 每次 PR + Daily |
| 容器掃描 | Trivy | 每次部署 |
| SAST | CodeQL / Semgrep | 每次 PR |
| Secret 掃描 | Gitleaks | 每次 PR |

### IaC 安全（如有 Terraform）

- `terraform fmt -check`
- `terraform validate`
- `tfsec` / `checkov` 掃描

## 5. 除錯與監控

### CI 除錯檢查清單

| 問題類型 | 檢查項目 |
|---------|---------|
| 測試失敗 | 查看測試輸出、確認本地可重現 |
| Lint 失敗 | 執行本地 lint 修復 |
| 覆蓋率不足 | 補充測試案例 |
| 部署失敗 | 檢查環境變數、權限、映像檔 |

### 常用除錯命令（GitHub Actions）

```bash
# 查看 Workflow 執行歷史
gh run list --workflow=backend-ci.yml

# 查看特定 Run 的詳細 Log
gh run view <run-id> --log

# 重新執行失敗的 Workflow
gh run rerun <run-id>
```

## 6. 效能優化

### Cache 策略

- 後端依賴 Cache（Go modules / pip / npm）
- Docker Layer Cache
- 測試結果 Cache（如支援）

### 並行化

- 獨立的 jobs 應並行執行
- 使用矩陣策略測試多版本

## 7. TDD 與 CI 整合

**CI 必須驗證 TDD 流程**：

1. **測試必須存在** - 新增程式碼必須有對應測試
2. **覆蓋率必須達標** - 低於 `{team.test_coverage}%` 則失敗
3. **測試必須先寫** - 透過 commit 順序或 Test Agent 驗證

## 相關檔案

- 專案配置：`.claude/project.yaml`
- Precommit 配置：`.pre-commit-config.yaml`
- CI Workflows：`.github/workflows/`（或對應平台目錄）
- **Precommit/CI 同步規範**：`.claude/templates/precommit-ci-sync.md`

---

**類型**: 通用 CI/CD 專家模板
**依賴**: `project.yaml` 基礎設施設定
**相關模板**: `precommit-ci-sync.md` - Precommit 與 CI 同步配置詳細指南
