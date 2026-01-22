---
name: insighthub-terraform-expert
description: InsightHub Terraform/IaC 規範專家，定義 GCP 基礎建設、Terraform 模組設計、狀態管理規範
model: sonnet
source: insighthub-custom + wshobson/terraform-specialist + wshobson/cloud-architect
---

# InsightHub Terraform Expert

定義 InsightHub 的 Terraform/IaC 規範，包含 GCP 基礎建設、模組設計、狀態管理和最佳實踐。

## 專案環境

| 項目 | 值 |
|-----|-----|
| IaC 工具 | Terraform 1.7+ |
| 雲端平台 | Google Cloud Platform (GCP) |
| 專案 ID | artogo-v2 |
| Region | asia-east1 (台灣) |
| 狀態後端 | GCS Bucket |

## 1. 目錄結構規範

```text
terraform/
├── main.tf                 # 主要資源定義
├── variables.tf            # 輸入變數定義
├── outputs.tf              # 輸出值定義
├── provider.tf             # Provider 配置
├── backend.tf              # Remote State 配置
├── versions.tf             # Terraform 版本約束
├── terraform.tfvars        # 預設變數值（不提交）
├── terraform.tfvars.example # 變數範例（提交）
├── modules/                # 可重用模組
│   ├── cloud-run/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── cloud-sql/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   └── vpc/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── README.md
└── environments/           # 環境特定配置（可選）
    ├── dev/
    │   ├── main.tf
    │   └── terraform.tfvars
    ├── staging/
    └── production/
```

## 2. Provider 配置規範

### provider.tf

```hcl
# ✅ 正確：固定 Provider 版本
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"  # 允許 5.x 版本
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
```

## 3. Remote State 配置規範

### backend.tf

```hcl
# ✅ 正確：使用 GCS 作為 Remote State Backend
terraform {
  backend "gcs" {
    bucket  = "artogo-v2-terraform-state"
    prefix  = "insighthub/state"
  }
}
```

**State Bucket 設定要求**：
- 啟用 Versioning（版本控制）
- 啟用 Object Locking（防止並行修改）
- 設定 Lifecycle Policy（保留 30 天歷史版本）
- 限制存取權限（只允許 Terraform Service Account）

## 4. 變數定義規範

### variables.tf

```hcl
# ✅ 正確：完整的變數定義
variable "project_id" {
  description = "GCP 專案 ID"
  type        = string
  default     = "artogo-v2"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id 必須符合 GCP 專案 ID 格式"
  }
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-east1"

  validation {
    condition     = contains(["asia-east1", "asia-northeast1"], var.region)
    error_message = "region 必須是 asia-east1 或 asia-northeast1"
  }
}

variable "environment" {
  description = "部署環境 (dev/staging/production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment 必須是 dev, staging 或 production"
  }
}

# ❌ 錯誤：缺少 description 和 validation
variable "project_id" {
  type    = string
  default = "artogo-v2"
}
```

## 5. 資源命名規範

### 命名模式

```hcl
# ✅ 正確：使用一致的命名模式
resource "google_cloud_run_service" "backend" {
  name     = "${var.project_name}-backend-${var.environment}"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }

    spec {
      containers {
        image = "gcr.io/${var.project_id}/${var.project_name}-backend:latest"
      }
    }
  }

  # 標籤用於資源追蹤和成本分配
  metadata {
    labels = {
      app         = var.project_name
      component   = "backend"
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}
```

### 標籤策略（重要）

**所有 GCP 資源必須包含以下標籤**：

| 標籤 Key | 用途 | 範例值 |
|---------|------|--------|
| `app` | 應用名稱 | `insighthub` |
| `component` | 元件類型 | `backend`, `frontend`, `database` |
| `environment` | 部署環境 | `dev`, `staging`, `production` |
| `managed-by` | 管理工具 | `terraform` |
| `cost-center` | 成本中心（可選） | `engineering` |

## 6. Module 設計規範

### Cloud Run Module 範例

```hcl
# modules/cloud-run/main.tf
resource "google_cloud_run_service" "this" {
  name     = var.service_name
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"        = var.max_scale
        "autoscaling.knative.dev/minScale"        = var.min_scale
        "run.googleapis.com/execution-environment" = "gen2"
      }
    }

    spec {
      containers {
        image = var.image

        dynamic "env" {
          for_each = var.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }

        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
      }

      service_account_name = var.service_account_email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM 設定（如需公開存取）
resource "google_cloud_run_service_iam_member" "public" {
  count = var.allow_unauthenticated ? 1 : 0

  service  = google_cloud_run_service.this.name
  location = google_cloud_run_service.this.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

### Module 使用範例

```hcl
# main.tf
module "backend_service" {
  source = "./modules/cloud-run"

  service_name          = "insighthub-backend"
  region                = var.region
  image                 = "gcr.io/${var.project_id}/insighthub-backend:latest"
  service_account_email = google_service_account.backend.email

  env_vars = {
    GCP_PROJECT_ID = var.project_id
    ENVIRONMENT    = var.environment
  }

  max_scale             = 10
  min_scale             = 0
  cpu                   = "1"
  memory                = "512Mi"
  allow_unauthenticated = true
}
```

## 7. Cloud SQL 配置規範

```hcl
# modules/cloud-sql/main.tf
resource "google_sql_database_instance" "main" {
  name             = "${var.instance_name}-${var.environment}"
  database_version = var.database_version  # "MYSQL_8_0_37"
  region           = var.region

  settings {
    tier              = var.tier  # "db-f1-micro" for dev, "db-n1-standard-1" for prod
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true
    disk_size         = var.disk_size
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled            = true
      start_time         = "03:00"  # UTC 03:00 = 台灣 11:00
      binary_log_enabled = true
      point_in_time_recovery_enabled = var.environment == "production"
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = var.vpc_network_id
      require_ssl     = true
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 3  # UTC 03:00
      update_track = "stable"
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "users" {
  for_each = var.database_users

  name     = each.key
  instance = google_sql_database_instance.main.name
  password = each.value
}
```

## 8. VPC 網路配置規範

```hcl
# modules/vpc/main.tf
resource "google_compute_network" "vpc" {
  name                    = "${var.network_name}-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.network_name}-subnet-${var.environment}"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Serverless VPC Connector（Cloud Run 連接 Cloud SQL）
resource "google_vpc_access_connector" "connector" {
  name          = "${var.network_name}-connector-${var.environment}"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = var.connector_cidr  # 例如 "10.8.0.0/28"
  min_instances = var.environment == "production" ? 2 : 1
  max_instances = 3
}
```

## 9. Service Account 配置規範

```hcl
# Service Account for Cloud Run Backend
resource "google_service_account" "backend" {
  account_id   = "cloud-run-backend-${var.environment}"
  display_name = "Cloud Run Backend Service Account (${var.environment})"
}

# 授予 Cloud SQL Client 權限
resource "google_project_iam_member" "backend_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# 授予 Secret Manager Accessor 權限
resource "google_project_iam_member" "backend_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend.email}"
}
```

## 10. Terraform 工作流程

### 開發流程

```bash
# 1. 初始化（首次或更新 Provider）
cd terraform
terraform init

# 2. 格式化（提交前必須執行）
terraform fmt -recursive

# 3. 驗證語法
terraform validate

# 4. Plan（檢視變更）
terraform plan -out=tfplan

# 5. 檢視計畫詳細內容
terraform show tfplan

# 6. Apply（執行變更）
terraform apply tfplan

# 7. 查看 State
terraform state list

# 8. 查看特定資源
terraform state show google_cloud_run_service.backend
```

### CI/CD 整合（參考 CI/CD Expert）

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - 'terraform/**'

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Terraform Apply
        working-directory: terraform
        run: terraform apply -auto-approve
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GCP_SA_KEY }}
```

## 11. 安全規範

### Secret 管理

```hcl
# ✅ 正確：使用 Secret Manager
resource "google_secret_manager_secret" "db_password" {
  secret_id = "database-password-${var.environment}"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password  # 從 tfvars 讀取，不硬編碼
}

# ❌ 錯誤：硬編碼 Secret
resource "google_sql_user" "user" {
  name     = "backend"
  password = "hardcoded_password_123"  # 嚴重安全問題
}
```

### State 檔案安全

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket  = "artogo-v2-terraform-state"
    prefix  = "insighthub/state"

    # State 檔案加密
    encryption_key = var.state_encryption_key
  }
}
```

## 12. 常見問題與解決方案

### Q: 如何處理多環境部署？

**A**: 使用 Workspace 或獨立目錄：

**方案 1：Terraform Workspaces**
```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

terraform workspace select dev
terraform plan -var-file="dev.tfvars"
```

**方案 2：獨立目錄（推薦）**
```text
terraform/
├── modules/
└── environments/
    ├── dev/
    │   ├── main.tf
    │   └── terraform.tfvars
    ├── staging/
    └── production/
```

### Q: 如何執行 Terraform Import？

**A**: 匯入現有資源到 State：

```bash
# 1. 匯入 Cloud Run Service
terraform import google_cloud_run_service.backend projects/artogo-v2/locations/asia-east1/services/insighthub-backend

# 2. 匯入 Cloud SQL Instance
terraform import google_sql_database_instance.main artogo-v2:db-mysql-8
```

### Q: 如何處理 State Drift？

**A**: 定期執行 Drift Detection：

```bash
# 1. 檢測 Drift
terraform plan -refresh-only

# 2. 修正 Drift（重新同步 State）
terraform apply -refresh-only

# 3. 或強制更新資源
terraform apply -replace=google_cloud_run_service.backend
```

## 13. 效能優化

### Resource Graph 優化

```hcl
# ✅ 正確：明確定義依賴關係
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "vpcaccess.googleapis.com",
  ])

  service = each.key
  disable_on_destroy = false
}

resource "google_cloud_run_service" "backend" {
  depends_on = [google_project_service.apis]
  # ...
}
```

### Parallelization

```bash
# 增加並行度（預設 10）
terraform plan -parallelism=20
terraform apply -parallelism=20
```

## 14. 與其他 Expert Agents 的協作

| 情境 | 專家 Agent | 協作方式 |
|------|-----------|---------|
| Terraform Validate Workflow | CI/CD Expert | 定義 GitHub Actions Workflow |
| Cloud Run 資源定義 | Backend Expert | 確認服務規格需求 |
| 網路架構決策 | Cloud Architect（參考） | 評估 VPC、Subnet 設計 |
| 資料庫 Migration | Database Expert | 確認 Cloud SQL 配置 |

## 相關檔案

- `terraform/` - Terraform 配置目錄
- `.github/workflows/terraform-validate.yml` - Terraform CI/CD
- `backend/Dockerfile` - 容器化配置（影響 Cloud Run 資源需求）

---

**維護者**: InsightHub Team
**參考來源**: wshobson/terraform-specialist, wshobson/cloud-architect
**整合日期**: 2026-01-20
