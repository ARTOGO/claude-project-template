# Terraform/IaC Expert

> Terraform/IaC 規範專家 Agent，定義雲端基礎建設、Terraform 模組設計、狀態管理規範

---

## 核心職責

定義專案的 Terraform/IaC 規範，包含雲端基礎建設、模組設計、狀態管理和最佳實踐。

## 技術棧（從 project.yaml 讀取）

執行前請讀取 `.claude/project.yaml`，確認以下設定：

| 項目 | project.yaml 路徑 | 說明 |
|------|-------------------|------|
| 雲端平台 | `tech_stack.infrastructure.cloud` | gcp / aws / azure |
| 運算服務 | `tech_stack.infrastructure.compute` | cloud-run / ecs / lambda / k8s |
| Region | `tech_stack.infrastructure.region` | 部署區域 |
| Terraform 目錄 | `paths.terraform` | Terraform 配置目錄位置 |

## 專案環境（依 project.yaml 調整）

| 項目 | 說明 |
|-----|-----|
| IaC 工具 | Terraform 1.7+ |
| 雲端平台 | 依 `tech_stack.infrastructure.cloud` |
| Region | 依 `tech_stack.infrastructure.region` |
| 狀態後端 | GCS / S3 / Azure Blob（依雲端平台） |

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

### provider.tf（依雲端平台選擇）

**GCP**:
```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
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
```

**AWS**:
```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}
```

**Azure**:
```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## 3. Remote State 配置規範

### backend.tf（依雲端平台選擇）

**GCP (GCS)**:
```hcl
terraform {
  backend "gcs" {
    bucket  = "${var.project_id}-terraform-state"
    prefix  = "${var.project_name}/state"
  }
}
```

**AWS (S3)**:
```hcl
terraform {
  backend "s3" {
    bucket         = "${var.project_name}-terraform-state"
    key            = "state/terraform.tfstate"
    region         = var.region
    encrypt        = true
    dynamodb_table = "${var.project_name}-terraform-locks"
  }
}
```

**Azure (Blob Storage)**:
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "${var.project_name}-rg"
    storage_account_name = "${var.project_name}tfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
```

**State 儲存設定要求**：
- 啟用 Versioning（版本控制）
- 啟用 Object Locking / State Locking（防止並行修改）
- 設定 Lifecycle Policy（保留 30 天歷史版本）
- 限制存取權限（只允許 Terraform Service Account）

## 4. 變數定義規範

### variables.tf

```hcl
# ✅ 正確：完整的變數定義
variable "project_id" {
  description = "雲端專案 ID / Account ID"
  type        = string

  # 依雲端平台調整 validation
}

variable "project_name" {
  description = "專案名稱，用於資源命名"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project_name))
    error_message = "project_name 必須是小寫字母開頭，只能包含小寫字母、數字和連字號"
  }
}

variable "region" {
  description = "部署區域"
  type        = string
  # 從 project.yaml 的 tech_stack.infrastructure.region 讀取
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
variable "project_name" {
  type = string
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

**所有雲端資源必須包含以下標籤/Tags**：

| 標籤 Key | 用途 | 範例值 |
|---------|------|--------|
| `app` | 應用名稱 | `{project.name}` |
| `component` | 元件類型 | `backend`, `frontend`, `database` |
| `environment` | 部署環境 | `dev`, `staging`, `production` |
| `managed-by` | 管理工具 | `terraform` |
| `cost-center` | 成本中心（可選） | `engineering` |

## 6. Module 設計規範

### 運算服務 Module（依 tech_stack.infrastructure.compute 選擇）

**GCP Cloud Run**:
```hcl
# modules/cloud-run/main.tf
resource "google_cloud_run_service" "this" {
  name     = var.service_name
  location = var.region

  template {
    spec {
      containers {
        image = var.image
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
      }
    }
  }
}
```

**AWS ECS**:
```hcl
# modules/ecs/main.tf
resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = var.security_group_ids
  }
}
```

**AWS Lambda**:
```hcl
# modules/lambda/main.tf
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = var.role_arn
  handler       = var.handler
  runtime       = var.runtime
  filename      = var.filename
}
```

### Module 使用範例

```hcl
# main.tf
module "backend_service" {
  source = "./modules/${var.compute_type}"  # cloud-run / ecs / lambda

  service_name = "${var.project_name}-backend"
  region       = var.region
  image        = "${var.container_registry}/${var.project_name}-backend:latest"

  env_vars = {
    PROJECT_ID  = var.project_id
    ENVIRONMENT = var.environment
  }
}
```

## 7. 資料庫配置規範

### 依雲端平台選擇託管資料庫服務

**GCP Cloud SQL**:
```hcl
resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-${var.environment}"
  database_version = var.database_version
  region           = var.region

  settings {
    tier            = var.tier
    disk_autoresize = true

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }
  }

  deletion_protection = var.environment == "production"
}
```

**AWS RDS**:
```hcl
resource "aws_db_instance" "main" {
  identifier        = "${var.project_name}-db-${var.environment}"
  engine            = var.engine  # mysql / postgres
  engine_version    = var.engine_version
  instance_class    = var.instance_class
  allocated_storage = var.storage_size

  backup_retention_period = var.environment == "production" ? 7 : 1
  deletion_protection     = var.environment == "production"
}
```

**Azure Database**:
```hcl
resource "azurerm_mysql_flexible_server" "main" {
  name                = "${var.project_name}-db-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_name            = var.sku_name
  version             = var.mysql_version
}
```

## 8. 網路配置規範

### 依雲端平台選擇 VPC/網路設定

**GCP VPC**:
```hcl
resource "google_compute_network" "vpc" {
  name                    = "${var.project_name}-vpc-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.project_name}-subnet-${var.environment}"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id
}
```

**AWS VPC**:
```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc-${var.environment}"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = var.availability_zone
}
```

**Azure VNet**:
```hcl
resource "azurerm_virtual_network" "main" {
  name                = "${var.project_name}-vnet-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = [var.vnet_cidr]
}
```

## 9. IAM / Service Account 配置規範

### 依雲端平台設定服務身份

**GCP Service Account**:
```hcl
resource "google_service_account" "backend" {
  account_id   = "${var.project_name}-backend-${var.environment}"
  display_name = "Backend Service Account (${var.environment})"
}

resource "google_project_iam_member" "backend_db" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}
```

**AWS IAM Role**:
```hcl
resource "aws_iam_role" "backend" {
  name = "${var.project_name}-backend-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "backend_db" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSDataFullAccess"
}
```

**Azure Managed Identity**:
```hcl
resource "azurerm_user_assigned_identity" "backend" {
  name                = "${var.project_name}-backend-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
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
          # 依雲端平台設定認證
          # GCP: GOOGLE_CREDENTIALS
          # AWS: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
          # Azure: ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_SUBSCRIPTION_ID, ARM_TENANT_ID
          CLOUD_CREDENTIALS: ${{ secrets.CLOUD_CREDENTIALS }}
```

## 11. 安全規範

### Secret 管理（依雲端平台選擇）

**GCP Secret Manager**:
```hcl
resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.project_name}-db-password-${var.environment}"
  replication {
    auto {}
  }
}
```

**AWS Secrets Manager**:
```hcl
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.project_name}/db-password/${var.environment}"
}
```

**Azure Key Vault**:
```hcl
resource "azurerm_key_vault_secret" "db_password" {
  name         = "${var.project_name}-db-password-${var.environment}"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.main.id
}
```

**禁止事項**：
```hcl
# ❌ 錯誤：硬編碼 Secret
resource "xxx_database_user" "user" {
  name     = "backend"
  password = "hardcoded_password_123"  # 嚴重安全問題！
}
```

### State 檔案安全

- 啟用 State 加密（GCS / S3 / Azure Blob 都支援）
- 使用 Remote State（不要使用 local state）
- 限制 State Bucket 存取權限

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

**A**: 匯入現有資源到 State（依雲端平台調整）：

```bash
# GCP - 匯入 Cloud Run Service
terraform import google_cloud_run_service.backend \
  projects/{project_id}/locations/{region}/services/{service_name}

# AWS - 匯入 ECS Service
terraform import aws_ecs_service.backend \
  {cluster_name}/{service_name}

# Azure - 匯入 App Service
terraform import azurerm_linux_web_app.backend \
  /subscriptions/{sub_id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{name}
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

- `{paths.terraform}` - Terraform 配置目錄（從 project.yaml 讀取）
- `.github/workflows/terraform-validate.yml` - Terraform CI/CD
- `{paths.backend}/Dockerfile` - 容器化配置（影響運算資源需求）

---

**類型**: 通用 Terraform/IaC 專家模板
**依賴**: `project.yaml` 基礎設施設定
**參考來源**: wshobson/terraform-specialist, wshobson/cloud-architect
