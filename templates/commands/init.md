# Init Command

> 初始化專案 Claude Code 設定。AI 引導式詢問，自動產出 project.yaml 和相關檔案。

## 使用方式

```bash
/project:init
```

---

## 執行流程總覽

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              /project:init                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Step 0: 專案狀態選擇（使用者手動選擇）                                          │
│     │                                                                           │
│     │  詢問: "這是既有專案還是全新專案？"                                        │
│     │                                                                           │
│     │  選項:                                                                    │
│     │    A. 既有專案 - 已有程式碼，需要加入 Claude Code 設定                     │
│     │    B. 全新專案 - 從零開始，需要完整規劃                                    │
│     │                                                                           │
│     └─ 根據選擇進入不同流程                                                     │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                     A. 既有專案流程                                        │ │
│  │  ─────────────────────────────────────────────────────────────────────── │ │
│  │  1. 分析現有程式碼結構                                                     │ │
│  │  2. 推斷技術棧（語言、框架、資料庫）                                       │ │
│  │  3. 詢問無法從程式碼推斷的問題                                             │ │
│  │  4. 確認設定並產出檔案                                                     │ │
│  │  5. 建議下一步：/project:plan                                              │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                     B. 全新專案流程                                        │ │
│  │  ─────────────────────────────────────────────────────────────────────── │ │
│  │  1. 收集需求概述                                                           │ │
│  │  2. 討論並提供架構建議（多選項）                                           │ │
│  │  3. 詢問技術棧偏好                                                         │ │
│  │  4. 詢問團隊規範                                                           │ │
│  │  5. 確認設定並產出檔案                                                     │ │
│  │  6. 建議下一步：/project:plan <需求>                                       │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## A. 既有專案流程

### 既有專案流程圖

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         既有專案初始化流程                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Step A1: 分析現有程式碼                                                         │
│     │                                                                           │
│     ├─ 掃描專案結構（目錄、檔案類型）                                            │
│     ├─ 讀取 package.json / go.mod / requirements.txt 等                         │
│     ├─ 識別框架、資料庫、測試工具                                                │
│     └─ 產出技術棧推斷報告                                                        │
│                                                                                 │
│  Step A2: 確認推斷結果                                                           │
│     │                                                                           │
│     │  顯示: "根據程式碼分析，您的專案使用："                                    │
│     │    • 後端: Go 1.24 + Gin + GORM                                           │
│     │    • 前端: Next.js 16 + React 19                                          │
│     │    • 資料庫: PostgreSQL                                                    │
│     │    • 測試: go test + Jest + Playwright                                    │
│     │                                                                           │
│     └─ 詢問: "以上推斷是否正確？需要修正嗎？"                                    │
│                                                                                 │
│  Step A3: 詢問無法推斷的問題                                                     │
│     │                                                                           │
│     │  這些問題無法從程式碼得知，需要詢問：                                      │
│     │                                                                           │
│     ├─ 🎨 設計系統相關                                                          │
│     │     • "專案是否有既有的 Design System？"                                   │
│     │     • "是否使用 Figma 管理設計稿？"                                        │
│     │     • "Design Tokens 是否已經定義？"                                       │
│     │                                                                           │
│     ├─ 🔄 CI/CD 相關                                                            │
│     │     • "是否已有 CI/CD Pipeline？"                                         │
│     │     • "部署目標環境是？" (GCP/AWS/Azure/Vercel)                           │
│     │     • "是否使用 IaC？" (Terraform/Pulumi/CDK)                             │
│     │                                                                           │
│     ├─ 👥 團隊規範相關                                                          │
│     │     • "團隊的測試覆蓋率要求？" (80%/70%/60%)                              │
│     │     • "是否強制 E2E 測試？"                                               │
│     │     • "Git 工作流程？" (GitHub Flow/GitFlow/Trunk)                        │
│     │     • "Commit 規範？" (Conventional/Angular/自訂)                         │
│     │                                                                           │
│     ├─ 📋 文件相關                                                              │
│     │     • "是否有現有的 PRD 文件？位置？"                                      │
│     │     • "是否有現有的 Tickets/Issues 管理？"                                │
│     │                                                                           │
│     └─ 🔒 安全相關                                                              │
│           • "是否有特殊的安全合規要求？" (HIPAA/SOC2/GDPR)                       │
│                                                                                 │
│  Step A4: 產出設定檔                                                             │
│     │                                                                           │
│     ├─ 產出 .claude/project.yaml                                                │
│     ├─ 產出 .claude/CLAUDE.md                                                   │
│     ├─ 條件式複製 Agents/Commands                                               │
│     └─ 如果沒有 PRD/TICKETS，產出模板                                           │
│                                                                                 │
│  輸出建議                                                                        │
│     │                                                                           │
│     └─ "初始化完成！建議下一步："                                                │
│          • 如有新功能需求 → /project:plan <需求>                                 │
│          • 如需開發既有 Ticket → /project:start-dev TICKET-XXX                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 無法從程式碼推斷的問題清單

| 類別 | 問題 | 為什麼需要詢問 |
| ---- | ---- | ------------- |
| **設計系統** | 是否有既有 Design System？ | 程式碼可能使用 UI 庫，但不代表有完整設計系統 |
| **設計系統** | 是否使用 Figma？ | 無法從程式碼得知設計工具 |
| **設計系統** | Design Tokens 是否已定義？ | CSS 變數存在不代表有系統化管理 |
| **CI/CD** | 是否已有 CI/CD Pipeline？ | 可能在外部系統（GitHub Actions 外） |
| **CI/CD** | 部署目標環境？ | 程式碼不一定能看出部署環境 |
| **團隊規範** | 測試覆蓋率要求？ | 目前覆蓋率不代表團隊要求 |
| **團隊規範** | 是否強制 E2E 測試？ | 有 E2E 測試不代表是強制的 |
| **團隊規範** | Git 工作流程？ | Branch 結構可能不代表正式流程 |
| **文件** | PRD/Tickets 位置？ | 可能在 Notion/Jira 等外部系統 |
| **安全** | 特殊合規要求？ | 程式碼無法看出業務合規需求 |

---

## B. 全新專案流程

### 全新專案流程圖

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         全新專案初始化流程                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Step B1: 收集需求概述                                                           │
│     │                                                                           │
│     │  詢問: "請簡單描述您要建立的專案（1-3 句話）"                              │
│     │                                                                           │
│     │  範例回答:                                                                 │
│     │    "一個 SaaS 平台，讓用戶可以連接資料庫並用自然語言查詢"                  │
│     │    "企業內部的工時管理系統"                                                │
│     │    "電商平台的後台管理系統"                                                │
│     │                                                                           │
│     └─ AI 分析需求，準備架構建議                                                 │
│                                                                                 │
│  Step B2: 討論並提供架構建議                                                     │
│     │                                                                           │
│     │  根據需求，提供 2-3 種架構選項：                                           │
│     │                                                                           │
│     │  ┌─────────────────────────────────────────────────────────────────────┐ │
│     │  │ 選項 A: 全端 Monolith（推薦入門）                                    │ │
│     │  │ • Next.js Full-Stack                                                │ │
│     │  │ • 優點：開發快、部署簡單                                             │ │
│     │  │ • 適合：MVP、小型團隊                                                │ │
│     │  └─────────────────────────────────────────────────────────────────────┘ │
│     │                                                                           │
│     │  ┌─────────────────────────────────────────────────────────────────────┐ │
│     │  │ 選項 B: 前後端分離（推薦中型專案）                                   │ │
│     │  │ • 前端：Next.js / 後端：Go + Gin                                    │ │
│     │  │ • 優點：職責分明、可獨立擴展                                         │ │
│     │  │ • 適合：中型團隊、需要 API 給多端使用                                │ │
│     │  └─────────────────────────────────────────────────────────────────────┘ │
│     │                                                                           │
│     │  ┌─────────────────────────────────────────────────────────────────────┐ │
│     │  │ 選項 C: 微服務架構                                                   │ │
│     │  │ • 多個獨立服務、API Gateway                                         │ │
│     │  │ • 優點：高度解耦、獨立部署                                           │ │
│     │  │ • 適合：大型團隊、複雜業務邏輯                                       │ │
│     │  └─────────────────────────────────────────────────────────────────────┘ │
│     │                                                                           │
│     └─ 詢問: "您傾向哪種架構？或有其他考量？"                                    │
│                                                                                 │
│  Step B3: 詢問技術棧偏好                                                         │
│     │                                                                           │
│     │  根據選擇的架構，詢問具體技術偏好：                                        │
│     │                                                                           │
│     │  如果選擇前後端分離：                                                      │
│     │    • "後端語言偏好？" Go (推薦) / Python / Node.js                        │
│     │    • "前端框架偏好？" Next.js (推薦) / React / Vue                        │
│     │    • "資料庫偏好？" PostgreSQL (推薦) / MySQL / MongoDB                   │
│     │    • "UI 框架偏好？" MUI (前台) / Ant Design (後台) / shadcn              │
│     │                                                                           │
│     │  如果沒有偏好，提供推薦組合：                                              │
│     │    "沒有特別偏好？推薦使用：Go + Next.js + PostgreSQL"                    │
│     │                                                                           │
│     └─ 確認技術棧選擇                                                           │
│                                                                                 │
│  Step B4: 詢問團隊規範                                                           │
│     │                                                                           │
│     ├─ 測試覆蓋率要求？ 80% (推薦) / 70% / 60%                                  │
│     ├─ 是否強制 E2E 測試？ Yes (推薦) / No                                      │
│     ├─ Git 工作流程？ GitHub Flow (推薦) / GitFlow / Trunk                      │
│     ├─ Commit 規範？ Conventional (推薦) / Angular / 自訂                       │
│     └─ Review Agents？ [x] Security [x] Test [x] Quality [x] PM                 │
│                                                                                 │
│  Step B5: 詢問設計系統（如有前端）                                               │
│     │                                                                           │
│     ├─ "是否需要建立 Design System？" Yes (推薦) / No                           │
│     └─ "是否使用 Figma？" Yes / No                                              │
│                                                                                 │
│  Step B6: 詢問基礎設施                                                           │
│     │                                                                           │
│     ├─ "雲端平台？" GCP / AWS / Azure / Vercel / 暫不決定                       │
│     └─ "是否使用 IaC？" Terraform / Pulumi / 暫不使用                           │
│                                                                                 │
│  Step B7: 產出設定檔                                                             │
│     │                                                                           │
│     ├─ 產出 .claude/project.yaml                                                │
│     ├─ 產出 .claude/CLAUDE.md                                                   │
│     ├─ 條件式複製 Agents/Commands                                               │
│     ├─ 產出 docs/PRD.md 模板                                                    │
│     └─ 產出 docs/TICKETS.md 模板                                                │
│                                                                                 │
│  輸出建議                                                                        │
│     │                                                                           │
│     └─ "初始化完成！建議下一步："                                                │
│          • 執行 /project:plan <需求> 開始完整規劃                                │
│          • 這會產出：PRD → UX/UI 設計 → TICKETS                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 架構建議對照表

| 專案類型 | 推薦架構 | 技術棧建議 |
| -------- | -------- | --------- |
| **MVP / 個人專案** | Full-Stack Monolith | Next.js + PostgreSQL |
| **SaaS 平台** | 前後端分離 | Go + Next.js + PostgreSQL |
| **企業後台** | 前後端分離 | Go/Python + React + PostgreSQL |
| **行動 App 後端** | REST/GraphQL API | Go + PostgreSQL |
| **大型系統** | 微服務 | Go + gRPC + PostgreSQL |
| **資料密集型** | 前後端分離 | Python + React + PostgreSQL |

---

## 共通流程：技術棧詢問詳細

### Phase: 專案類型詢問

```text
│  Phase 1: 專案類型詢問                                                          │
│     │                                                                           │
│     │  詢問: "這是什麼類型的專案？"                                              │
│     │                                                                           │
│     │  選項:                                                                    │
│     │    1. Web App (前後端)                                                    │
│     │    2. 純前端應用                                                          │
│     │    3. 純後端服務                                                          │
│     │    4. CLI 工具                                                            │
│     │    5. Library / SDK                                                       │
│     │    6. Microservice                                                        │
│     │    7. Monorepo                                                            │
│     │                                                                           │
│     └─ 根據選擇決定後續問題                                                     │
│                                                                                 │
│  Phase 2: 技術棧詢問                                                            │
│     │                                                                           │
│     ├─ 後端（如適用）                                                           │
│     │     │                                                                     │
│     │     ├─ "後端使用什麼語言？"                                               │
│     │     │    → Go / Python / Node.js / Java / Rust / C#                      │
│     │     │                                                                     │
│     │     ├─ "使用什麼框架？"                                                   │
│     │     │    → (依語言動態顯示選項)                                           │
│     │     │                                                                     │
│     │     ├─ "使用什麼 ORM / 資料存取層？"                                      │
│     │     │    → (依語言動態顯示選項)                                           │
│     │     │                                                                     │
│     │     └─ "架構模式？"                                                       │
│     │          → Clean Architecture / Hexagonal / Layered                       │
│     │                                                                           │
│     ├─ 前端（如適用）                                                           │
│     │     │                                                                     │
│     │     ├─ "前端使用什麼框架？"                                               │
│     │     │    → Next.js / React / Vue / Angular / Svelte                       │
│     │     │                                                                     │
│     │     ├─ "UI 框架？"                                                        │
│     │     │    → MUI / Ant Design / shadcn / Tailwind / Chakra                  │
│     │     │                                                                     │
│     │     ├─ "樣式方案？"                                                       │
│     │     │    → CSS Modules / Tailwind / Styled Components                     │
│     │     │                                                                     │
│     │     └─ "套件管理器？"                                                     │
│     │          → pnpm / npm / yarn / bun                                        │
│     │                                                                           │
│     └─ 資料庫（如適用）                                                         │
│           │                                                                     │
│           ├─ "使用什麼資料庫？"                                                 │
│           │    → PostgreSQL / MySQL / MongoDB / SQLite                          │
│           │                                                                     │
│           └─ "Migration 工具？"                                                 │
│                → (依選擇動態顯示)                                               │
│                                                                                 │
│  Phase 3: 團隊規範詢問                                                          │
│     │                                                                           │
│     ├─ "最低測試覆蓋率要求？"                                                   │
│     │    → 80% (推薦) / 70% / 60% / 自訂                                        │
│     │                                                                           │
│     ├─ "是否強制 E2E 測試？"                                                    │
│     │    → Yes (推薦) / No                                                      │
│     │                                                                           │
│     ├─ "Git 工作流程？"                                                         │
│     │    → GitHub Flow (推薦) / GitFlow / Trunk-based                           │
│     │                                                                           │
│     ├─ "Commit 規範？"                                                          │
│     │    → Conventional Commits (推薦) / Angular / 自訂                         │
│     │                                                                           │
│     └─ "啟用哪些 Review Agents？"                                               │
│          → [x] Security (推薦必選)                                              │
│            [x] Test                                                             │
│            [x] Quality                                                          │
│            [x] PM                                                               │
│                                                                                 │
│  Phase 4: 設計系統詢問（如有前端）                                               │
│     │                                                                           │
│     ├─ "是否啟用設計系統？"                                                     │
│     │    → Yes / No                                                             │
│     │                                                                           │
│     └─ "是否整合 Figma？"                                                       │
│          → Yes / No                                                             │
│          → (如 Yes) 請提供 Design System URL                                    │
│                                                                                 │
│  Phase 5: 基礎設施詢問（可選）                                                   │
│     │                                                                           │
│     ├─ "雲端平台？"                                                             │
│     │    → GCP / AWS / Azure / Vercel / None                                    │
│     │                                                                           │
│     ├─ "運算服務？"                                                             │
│     │    → (依雲端動態顯示)                                                     │
│     │                                                                           │
│     └─ "IaC 工具？"                                                             │
│          → Terraform / Pulumi / CDK / None                                      │
│                                                                                 │
│  Phase 6: 產出檔案                                                              │
│     │                                                                           │
│     ├─ 建立 .claude/ 目錄                                                       │
│     │                                                                           │
│     ├─ 產出 .claude/project.yaml                                               │
│     │                                                                           │
│     ├─ 產出 .claude/CLAUDE.md（專案指引）                                       │
│     │                                                                           │
│     ├─ 複製 WORKFLOWS.md                                                       │
│     │                                                                           │
│     ├─ 複製相關 agents/                                                        │
│     │     ├─ experts/（依技術棧選擇）                                           │
│     │     ├─ reviewers/（依 Review Agents 選擇）                               │
│     │     └─ workers/                                                          │
│     │                                                                           │
│     ├─ 複製 commands/                                                          │
│     │                                                                           │
│     ├─ 產出 docs/PRD.md（模板）                                                │
│     │                                                                           │
│     └─ 產出 docs/TICKETS.md（模板）                                            │
│                                                                                 │
│  輸出摘要                                                                       │
│     - 專案設定完成                                                              │
│     - 檔案清單                                                                  │
│     - 下一步建議                                                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: 技術棧詢問詳細

### 後端語言選項與對應框架

| 語言 | 框架選項 | ORM 選項 |
| ---- | -------- | -------- |
| **Go** | Gin, Echo, Fiber, Chi | GORM, sqlx, ent |
| **Python** | FastAPI, Django, Flask | SQLAlchemy, Django ORM, Tortoise |
| **Node.js** | Express, NestJS, Fastify, Hono | Prisma, TypeORM, Sequelize, Drizzle |
| **Java** | Spring Boot, Quarkus, Micronaut | JPA/Hibernate, MyBatis |
| **Rust** | Actix, Axum, Rocket | Diesel, SeaORM |
| **C#** | ASP.NET Core | Entity Framework |

### 前端框架選項

| 框架 | 版本建議 | 特點 |
| ---- | -------- | ---- |
| **Next.js** | 15.x / 16.x | App Router, Server Components |
| **React** | 19.x | SPA, 需搭配路由 |
| **Vue** | 3.x | Composition API |
| **Angular** | 18.x | Enterprise |
| **Svelte** | 5.x | Runes |
| **Nuxt** | 3.x | Vue SSR |

### UI 框架選項

| 框架 | 適用場景 | 樣式方案 |
| ---- | -------- | -------- |
| **MUI** | 前台應用 | CSS-in-JS |
| **Ant Design** | 後台管理 | Less/CSS |
| **shadcn/ui** | 高度客製 | Tailwind |
| **Tailwind** | 原子化 | Utility |
| **Chakra UI** | 快速開發 | CSS-in-JS |

---

## Phase 3: 團隊規範預設值

### 測試覆蓋率建議

| 等級 | 覆蓋率 | 適用場景 |
| ---- | ------ | -------- |
| **嚴格** | 90%+ | 金融、醫療、關鍵系統 |
| **標準** | 80% | 一般商業應用（推薦） |
| **基本** | 70% | 內部工具、MVP |
| **寬鬆** | 60% | 原型、實驗專案 |

### Review Agents 建議

| Agent | 建議 | 說明 |
| ----- | ---- | ---- |
| **Security** | **強制** | 安全性是底線 |
| **Test** | 推薦 | 確保測試品質 |
| **Quality** | 推薦 | 確保程式碼品質 |
| **PM** | 視情況 | 有明確驗收條件時啟用 |

---

## 產出檔案結構

```text
your-project/
├── .claude/
│   ├── project.yaml           # 專案設定（自動生成）
│   ├── CLAUDE.md             # 專案指引（自動生成）
│   ├── WORKFLOWS.md          # 工作流程總覽
│   ├── agents/
│   │   ├── experts/          # 依技術棧複製
│   │   │   ├── backend.md    # (如有後端)
│   │   │   ├── frontend.md   # (如有前端)
│   │   │   └── database.md   # (如有資料庫)
│   │   ├── reviewers/        # 依設定複製
│   │   │   ├── security.md   # (強制)
│   │   │   ├── test.md       # (依設定)
│   │   │   ├── quality.md    # (依設定)
│   │   │   └── pm.md         # (依設定)
│   │   └── workers/
│   │       └── engineer.md
│   ├── commands/
│   │   ├── plan.md
│   │   ├── start-dev.md
│   │   ├── tdd.md
│   │   ├── done.md
│   │   ├── fix.md
│   │   ├── refactor.md
│   │   ├── design.md         # (如有前端)
│   │   └── test.md
│   └── templates/
│       ├── ticket-format.md
│       └── design-templates.md  # (如有前端)
├── docs/
│   ├── PRD.md               # PRD 模板
│   └── TICKETS.md           # Tickets 模板
└── (其他專案檔案...)
```

---

## 產出範例：project.yaml

```yaml
# .claude/project.yaml
# 由 /project:init 自動生成
# 生成日期: 2026-01-22

project:
  name: "my-app"
  type: "web-app"
  description: ""

tech_stack:
  backend:
    language: "go"
    version: "1.24"
    framework: "gin"
    orm: "gorm"
    architecture: "clean"
  frontend:
    language: "typescript"
    version: "5.x"
    framework: "next"
    framework_version: "16.x"
    ui_framework:
      default: "mui"
    styling: "css-modules"
    package_manager: "pnpm"
  database:
    type: "postgresql"
    version: "16"

team:
  test_coverage: 80
  e2e_required: true
  e2e_framework: "playwright"
  git_workflow: "github-flow"
  commit_convention: "conventional"
  review_required: true
  review_agents:
    - security
    - test
    - quality
    - pm

design:
  enabled: true
  figma:
    enabled: false

paths:
  prd: "docs/PRD.md"
  tickets: "docs/TICKETS.md"
```

---

## 產出範例：CLAUDE.md

初始化會根據 project.yaml 產出專案專屬的 CLAUDE.md，包含：

1. **開發流程** - 標準化流程圖
2. **技術棧說明** - 根據設定顯示
3. **程式碼規範** - 根據語言/框架顯示
4. **可用指令** - 根據設定啟用的指令
5. **Agent 說明** - 根據設定啟用的 Agents

---

## 互動式問答範例

```text
🤖 Claude: 歡迎使用 Claude Code 專案初始化！讓我們開始設定您的專案。

📋 Step 1/5: 專案類型

這是什麼類型的專案？

1. Web App (前後端)
2. 純前端應用
3. 純後端服務
4. CLI 工具
5. Library / SDK
6. Microservice
7. Monorepo

請選擇 (1-7): 1

────────────────────────────────────────────

📋 Step 2/5: 技術棧

後端使用什麼語言？

1. Go (推薦)
2. Python
3. Node.js (TypeScript)
4. Java
5. Rust
6. C#

請選擇 (1-6): 1

Go 框架？

1. Gin (推薦)
2. Echo
3. Fiber
4. Chi

請選擇 (1-4): 1

...

────────────────────────────────────────────

✅ 初始化完成！

產出檔案：
- .claude/project.yaml
- .claude/CLAUDE.md
- .claude/WORKFLOWS.md
- .claude/agents/ (8 files)
- .claude/commands/ (7 files)
- docs/PRD.md
- docs/TICKETS.md

下一步：
1. 編輯 docs/PRD.md 定義產品需求
2. 執行 /project:plan <需求> 開始規劃
```

---

## 🔌 開源 Agents 與 Skills 推薦

初始化完成後，建議瀏覽以下開源資源，選擇適合專案的 Agents 和 Skills：

### 推薦 Agents 來源

**[wshobson/agents](https://github.com/wshobson/agents/tree/main)**

社群維護的高品質 Agents 集合，包含：

| Agent | 說明 | 適用場景 |
| ----- | ---- | -------- |
| `golang-pro` | Go 專業實踐 | Go 後端專案 |
| `frontend-developer` | 前端開發專家 | React/Vue/Angular 專案 |
| `database-architect` | 資料庫架構師 | 需要複雜資料庫設計 |
| `cloud-architect` | 雲架構專家 | 多雲部署、大型系統 |
| `devops-troubleshooter` | DevOps 問題排查 | 生產環境除錯 |
| `test-automator` | 測試自動化 | AI 生成測試 |

**使用方式**：

```bash
# 複製到專案
curl -o .claude/agents/reference/golang-pro.md \
  https://raw.githubusercontent.com/wshobson/agents/main/golang-pro.md

# 或直接下載整個目錄
git clone --depth 1 https://github.com/wshobson/agents.git /tmp/agents
cp /tmp/agents/*.md .claude/agents/reference/
```

### 推薦 Skills 來源

**[anthropics/skills](https://github.com/anthropics/skills)**

Anthropic 官方維護的 Skills 集合：

| Skill | 說明 | 適用場景 |
| ----- | ---- | -------- |
| `webapp-testing` | Playwright E2E 測試 | Web 應用 E2E 測試 |
| `pdf` | PDF 生成 | 報表、文件生成 |
| `xlsx` | Excel 處理 | 資料匯出、報表 |
| `doc-coauthoring` | 文件協作 | 結構化文件撰寫 |

**使用方式**：

```bash
# 複製到專案
mkdir -p .claude/skills
git clone --depth 1 https://github.com/anthropics/skills.git /tmp/skills
cp -r /tmp/skills/webapp-testing .claude/skills/
cp -r /tmp/skills/pdf .claude/skills/
```

### 新增到 project.yaml

```yaml
# .claude/project.yaml
external_resources:
  agents:
    - source: "wshobson/agents"
      selected:
        - golang-pro
        - database-architect
  skills:
    - source: "anthropics/skills"
      selected:
        - webapp-testing
        - xlsx
```

### 何時使用

| 情況 | 建議動作 |
| ---- | -------- |
| 專案初始化 | 瀏覽推薦資源，選擇需要的 |
| 新增功能模組 | 使用 `/project:add-feature` 後檢查推薦 |
| 遇到特定技術問題 | 搜尋對應的專業 Agent |
| 需要生成特定格式 | 搜尋對應的 Skill |

---

## 相關檔案

- [project-schema.yaml](../schema/project-schema.yaml) - Schema 完整定義
- [WORKFLOWS.md](../templates/WORKFLOWS.md) - 工作流程總覽
- [examples/project.yaml](../examples/project.yaml) - 設定範例
- [add-feature.md](./add-feature.md) - 新增功能模組
