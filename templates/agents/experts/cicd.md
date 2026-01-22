---
name: insighthub-cicd-expert
description: InsightHub CI/CD 規範專家，定義 GitHub Actions + GCP Cloud Run 部署流程、測試自動化、安全掃描規範
model: sonnet
source: insighthub-custom + wshobson/devops-troubleshooter
---

# InsightHub CI/CD Expert

定義 InsightHub 的 CI/CD 流程規範，包含 GitHub Actions、GCP Cloud Run 部署、測試自動化和安全掃描。

## 專案環境

| 項目 | 值 |
|-----|-----|
| CI/CD 平台 | GitHub Actions |
| 部署目標 | GCP Cloud Run (asia-east1) |
| 容器 Registry | Google Container Registry (GCR) |
| IaC 工具 | Terraform |
| 專案 ID | artogo-v2 |

## 1. GitHub Actions Workflow 規範

### 必要 Workflows（`.github/workflows/`）

| Workflow 檔案 | 觸發時機 | 職責 |
|--------------|---------|------|
| `backend-ci.yml` | PR to main, push to main | Backend 測試 + Lint + Build |
| `frontend-ci.yml` | PR to main, push to main | Frontend 測試 + Lint + Build |
| `backend-deploy.yml` | push to main (after CI pass) | Backend 部署到 Cloud Run |
| `frontend-deploy.yml` | push to main (after CI pass) | Frontend 部署到 Cloud Run |
| `terraform-validate.yml` | PR 修改 `terraform/**` | Terraform Plan + Security Scan |
| `security-scan.yml` | Daily cron + PR | 安全掃描 (Trivy + golangci-lint) |

### Backend CI Workflow 結構

```yaml
name: Backend CI

on:
  pull_request:
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.24'

      # 1. 依賴安裝
      - name: Install dependencies
        working-directory: backend
        run: go mod download

      # 2. 執行測試（必須通過）
      - name: Run tests
        working-directory: backend
        run: go test -v -race -coverprofile=coverage.out ./...

      # 3. 檢查覆蓋率 > 80%
      - name: Check coverage
        working-directory: backend
        run: |
          coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% is below 80%"
            exit 1
          fi

      # 4. Lint（golangci-lint）
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v4
        with:
          version: latest
          working-directory: backend

      # 5. Security Scan（Trivy）
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: 'backend'
          severity: 'CRITICAL,HIGH'
```

### Frontend CI Workflow 結構

```yaml
name: Frontend CI

on:
  pull_request:
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci.yml'
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      # 1. 依賴安裝
      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      # 2. 執行測試（必須通過）
      - name: Run tests
        working-directory: frontend
        run: npm run test:coverage

      # 3. 檢查覆蓋率 > 80%
      - name: Check coverage
        working-directory: frontend
        run: |
          # 從 coverage/coverage-summary.json 讀取覆蓋率
          coverage=$(jq '.total.lines.pct' frontend/coverage/coverage-summary.json)
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% is below 80%"
            exit 1
          fi

      # 4. Lint（ESLint）
      - name: Run ESLint
        working-directory: frontend
        run: npm run lint

      # 5. Type Check
      - name: TypeScript check
        working-directory: frontend
        run: npm run type-check

      # 6. Build
      - name: Build
        working-directory: frontend
        run: npm run build
```

## 2. 部署 Workflow 規範

### Backend Deploy to Cloud Run

```yaml
name: Deploy Backend to Cloud Run

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

env:
  PROJECT_ID: artogo-v2
  REGION: asia-east1
  SERVICE: insighthub-backend

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      # 1. 認證 GCP（使用 Workload Identity）
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      # 2. 設定 Cloud SDK
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      # 3. Build Docker Image
      - name: Build image
        working-directory: backend
        run: |
          docker build -t gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }} .
          docker tag gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }} \
                     gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:latest

      # 4. Push to GCR
      - name: Push to GCR
        run: |
          gcloud auth configure-docker
          docker push gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }}
          docker push gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:latest

      # 5. Deploy to Cloud Run
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE }} \
            --image gcr.io/${{ env.PROJECT_ID }}/${{ env.SERVICE }}:${{ github.sha }} \
            --platform managed \
            --region ${{ env.REGION }} \
            --allow-unauthenticated \
            --set-env-vars "GCP_PROJECT_ID=${{ env.PROJECT_ID }}" \
            --set-secrets "DB_PASSWORD=db-password:latest"
```

## 3. Terraform Validation Workflow

```yaml
name: Terraform Validate

on:
  pull_request:
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform-validate.yml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 1. Setup Terraform
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # 2. Terraform Format Check
      - name: Terraform fmt
        working-directory: terraform
        run: terraform fmt -check -recursive

      # 3. Terraform Init
      - name: Terraform init
        working-directory: terraform
        run: terraform init -backend=false

      # 4. Terraform Validate
      - name: Terraform validate
        working-directory: terraform
        run: terraform validate

      # 5. Security Scan（tfsec）
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          working_directory: terraform
          soft_fail: false

      # 6. Terraform Plan（如果有 GCP 認證）
      - name: Terraform plan
        if: github.event_name == 'pull_request'
        working-directory: terraform
        run: terraform plan -no-color
        continue-on-error: true
```

## 4. Security Scan Workflow（每日排程）

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # 每天 UTC 02:00（台灣 10:00）
  pull_request:
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 1. Trivy 掃描 Backend
      - name: Trivy scan backend
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: 'backend'
          severity: 'CRITICAL,HIGH'
          format: 'sarif'
          output: 'trivy-backend.sarif'

      # 2. Trivy 掃描 Frontend
      - name: Trivy scan frontend
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: 'frontend'
          severity: 'CRITICAL,HIGH'
          format: 'sarif'
          output: 'trivy-frontend.sarif'

      # 3. Upload to GitHub Security
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: '.'
```

## 5. 必要的 GitHub Secrets

| Secret 名稱 | 用途 | 範例值 |
|------------|------|--------|
| `WIF_PROVIDER` | Workload Identity Provider | `projects/123456/locations/global/workloadIdentityPools/...` |
| `WIF_SERVICE_ACCOUNT` | Service Account Email | `github-actions@artogo-v2.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | GCP 專案 ID | `artogo-v2` |

## 6. 部署流程圖

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Push to Branch                     │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
                   ┌──────────────────┐
                   │  Create PR       │
                   └────────┬─────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐        ┌──────────┐        ┌──────────┐
   │Backend  │        │Frontend  │        │Terraform │
   │CI       │        │CI        │        │Validate  │
   └────┬────┘        └────┬─────┘        └────┬─────┘
        │                  │                   │
        └──────────────────┼───────────────────┘
                           ▼
                   ┌──────────────────┐
                   │  All Checks Pass │
                   └────────┬─────────┘
                            ▼
                   ┌──────────────────┐
                   │  Merge to main   │
                   └────────┬─────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
   ┌─────────────┐                      ┌─────────────┐
   │Backend      │                      │Frontend     │
   │Deploy       │                      │Deploy       │
   │(Cloud Run)  │                      │(Cloud Run)  │
   └─────────────┘                      └─────────────┘
```

## 7. 除錯與監控（參考 wshobson/devops-troubleshooter）

### Cloud Run 除錯檢查清單

| 問題類型 | 檢查指令 | 常見原因 |
|---------|---------|---------|
| 部署失敗 | `gcloud run services describe <service> --region=asia-east1` | Image tag 錯誤、權限不足 |
| 冷啟動慢 | 檢查 Cloud Run logs | 依賴過多、Image 過大 |
| 記憶體不足 | `gcloud run services update <service> --memory=1Gi` | 預設 512MB 不足 |
| 環境變數遺失 | 檢查 `--set-env-vars` 或 Secret Manager | Secret 未設定 |
| 資料庫連線失敗 | 檢查 Cloud SQL Proxy 設定 | VPC Connector 未設定 |

### GitHub Actions 除錯

```bash
# 1. 查看 Workflow 執行歷史
gh run list --workflow=backend-ci.yml

# 2. 查看特定 Run 的詳細 Log
gh run view <run-id> --log

# 3. 重新執行失敗的 Workflow
gh run rerun <run-id>

# 4. 下載 Artifact
gh run download <run-id>
```

## 8. 效能優化建議

### Docker Image 優化

```dockerfile
# ✅ 正確：Multi-stage build
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/server /server
CMD ["/server"]

# ❌ 錯誤：單一 stage，Image 過大
FROM golang:1.24
WORKDIR /app
COPY . .
RUN go build -o server ./cmd/server
CMD ["./server"]
```

### Cache 策略

```yaml
# ✅ 正確：Cache Go modules
- uses: actions/cache@v3
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}

# ✅ 正確：Cache npm dependencies
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

## 9. 常見問題與解決方案

### Q: Workflow 執行時間過長？

**A**: 優化策略：
1. 使用 `actions/cache` 快取依賴
2. 並行執行獨立的 jobs
3. 只在相關檔案變更時觸發（使用 `paths` filter）

### Q: Cloud Run 部署後服務無法啟動？

**A**: 檢查清單：
1. 容器 Port 是否正確（預設 8080）
2. Healthcheck endpoint 是否正常
3. 環境變數和 Secrets 是否正確設定
4. Cloud Run Service Account 權限是否足夠

### Q: 如何實作 Blue/Green 部署？

**A**: Cloud Run 支援流量分割：

```bash
# 1. 部署新版本（不接收流量）
gcloud run deploy <service> --image=<new-image> --no-traffic --tag=green

# 2. 測試新版本（使用 tag URL）
curl https://green---<service>-<hash>-uc.a.run.app

# 3. 逐步切換流量
gcloud run services update-traffic <service> --to-tags=green=50
gcloud run services update-traffic <service> --to-latest
```

## 10. 與其他 Expert Agents 的協作

| 檔案類型 | 專家 Agent | 協作方式 |
|---------|-----------|---------|
| `.github/workflows/*.yml` | CI/CD Expert（本 Agent） | 定義 Workflow 規範 |
| `backend/**/*.go` | Backend Expert | CI 中執行 Go 測試 + Lint |
| `frontend/**/*.tsx` | Frontend Expert | CI 中執行 TypeScript 測試 + Lint |
| `terraform/**/*.tf` | Terraform Specialist | Terraform Validate Workflow |

## 相關檔案

- `.github/workflows/` - GitHub Actions Workflows
- `backend/Dockerfile` - Backend 容器化
- `frontend/Dockerfile` - Frontend 容器化
- `terraform/cloud-run.tf` - Cloud Run IaC 定義

---

**維護者**: InsightHub Team
**參考來源**: wshobson/devops-troubleshooter
**整合日期**: 2026-01-20
