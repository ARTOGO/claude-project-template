# Claude Project Template

> 可重用的 Claude Code 專案模板，提供標準化的開發流程、Multi-Agent Review 系統、設計工作流程。

## 功能特色

- 📋 **標準化開發流程** - Plan → Design → Develop → Review → Done
- 🤖 **Multi-Agent Review** - Security、Test、Quality、PM 四大審查 Agent
- 🎨 **設計系統整合** - UX/UI 設計稿模板、Figma 同步支援
- 📝 **YAML 設定** - 透過 `project.yaml` 定義專案特定設定
- 🚀 **一鍵初始化** - `/project:init` 命令引導設定

## 快速開始

### 安裝

```bash
# npm
npm install -g @anthropic/claude-project-template

# 或直接使用 npx
npx @anthropic/claude-project-template init
```

### 初始化專案

在專案根目錄執行：

```bash
# 互動式初始化
npx claude-project-template init

# 或在 Claude Code 中使用
/project:init
```

AI 會依序詢問：
1. **專案類型** - Web App / CLI Tool / Library / Microservice
2. **技術棧** - 前後端框架、語言版本
3. **團隊規範** - 測試要求、程式碼風格、Git 工作流程

### 產出結構

初始化後會在專案中建立：

```text
your-project/
├── .claude/
│   ├── project.yaml          # 專案設定（自動生成）
│   ├── CLAUDE.md            # 專案指引（自動生成）
│   ├── WORKFLOWS.md         # 工作流程總覽
│   ├── agents/
│   │   ├── experts/         # 技術規範 Agents
│   │   ├── reviewers/       # Review Agents
│   │   └── workers/         # 執行型 Agents
│   ├── commands/            # Claude Commands
│   └── templates/           # 文件模板
└── docs/
    ├── PRD.md              # 產品需求文件（模板）
    └── TICKETS.md          # Ticket 追蹤（模板）
```

## 核心概念

### 開發流程

```text
┌─────────────────────────────────────────────────────────────────┐
│  Phase 0        Phase 1       Phase 2       Phase 3   Phase 4  │
│  ──────────     ──────────    ──────────    ────────  ──────── │
│  /project:plan  /project:     開發循環      E2E 測試  /project:│
│  (產出 Tickets) start-dev     TDD 實作      (強制)    done     │
│                 或 /project:                          Review   │
│  有 UI? →設計稿 tdd                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Agent Review

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Review Orchestrator                          │
├───────────────┬─────────────┬───────────────┬───────────────────┤
│   Security    │    Test     │   Quality     │       PM          │
│   (最高優先)   │  (測試覆蓋)  │  (程式碼品質)  │   (驗收條件)       │
└───────────────┴─────────────┴───────────────┴───────────────────┘
```

### project.yaml 設定

```yaml
# .claude/project.yaml
project:
  name: "my-project"
  type: "web-app"  # web-app | cli | library | microservice

tech_stack:
  backend:
    language: "go"
    version: "1.24"
    framework: "gin"
  frontend:
    language: "typescript"
    version: "5.x"
    framework: "next"
    framework_version: "16.x"

team:
  test_coverage: 80
  code_style: "google"
  git_workflow: "github-flow"
  review_required: true
```

## 可用指令

### 核心指令

| 指令 | 說明 |
| ---- | ---- |
| `/project:init` | 初始化專案設定 |
| `/project:plan <需求>` | 規劃功能，產出 Tickets |
| `/project:start-dev TICKET-XXX` | 多 Agent 協作開發 |
| `/project:tdd TICKET-XXX` | TDD 模式開發 |
| `/project:done` | 完成開發，執行 Review |

### 輔助指令

| 指令 | 說明 |
| ---- | ---- |
| `/project:design <元件>` | 設計 UI 元件 |
| `/project:fix <問題>` | 快速修復 Bug |
| `/project:review` | 執行 Code Review |
| `/project:test` | 執行測試 |

## 自訂與擴展

### 新增技術棧支援

1. 在 `templates/agents/experts/` 新增專家 Agent
2. 更新 `schema/tech-stacks.yaml`
3. 在 `templates/commands/` 新增相關命令

### 自訂 Review 流程

編輯 `templates/agents/reviewers/` 中的 Agent 定義檔。

## 相關文件

- [完整工作流程](docs/WORKFLOWS.md)
- [project.yaml Schema](schema/project-schema.yaml)
- [貢獻指南](CONTRIBUTING.md)

## License

MIT
