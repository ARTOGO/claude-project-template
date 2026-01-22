# Multi-Agent Review Pattern

> 通用的多 Agent 審查模式，適用於各種工作流程（開發、設計、文件、部署等）。

---

## 核心概念：Producer vs Reviewer

**重要**：Producer Agent 和 Reviewer Agents 是**完全分開的角色**，不會互相交叉。

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Producer vs Reviewer                         │
└─────────────────────────────────────────────────────────────────┘

  Producer Agent（生產者）         Reviewer Agents（審查者）
  ──────────────────────          ────────────────────────
  • 負責「做事」                   • 負責「檢查」
  • 產出實際產物                   • 不產出，只審查
  • 一個場景只有一個 Producer      • 一個場景有多個 Reviewers
  • 收到 feedback 後修改           • 產出 findings 給 Producer

  ┌──────────────┐
  │   Producer   │──── 產出 ────▶ 產物（Code / Design / Plan）
  │   Agent      │                        │
  └──────────────┘                        ▼
                                 ┌────────────────────┐
                                 │   Reviewer A       │
                                 │   Reviewer B       │ ← 並行審查
                                 │   Reviewer C       │
                                 └─────────┬──────────┘
                                           │
                                      Findings
                                           │
                                           ▼
                                 ┌──────────────┐
                                 │   Producer   │ ← 收到 feedback 後修改
                                 │   Agent      │
                                 └──────────────┘
```

### 各場景的 Producer 和 Reviewers

| 場景              | Producer Agent    | Reviewer Agents                                   |
| ----------------- | ----------------- | ------------------------------------------------- |
| **Code Review**   | Engineer Agent    | Security, Test, Quality, PM                       |
| **Design Review** | UI Designer Agent | PRD Alignment, Accessibility, Design System       |
| **Plan Review**   | PM (Plan) Agent   | Scope Validator, Technical Architect, Estimator   |
| **Deploy Review** | DevOps Agent      | Security Scanner, Infra Validator, Rollback       |

### 錯誤理解 vs 正確理解

```text
❌ 錯誤：所有 Agent 都做事，然後互相審查
   Security Agent 寫 code → Test Agent 審查 Security 的 code
   Test Agent 寫 code → Quality Agent 審查 Test 的 code

✅ 正確：Producer 做事，Reviewers 各自審查不同面向
   Engineer Agent 寫 code → Security Agent 審查安全性
                         → Test Agent 審查測試覆蓋
                         → Quality Agent 審查程式碼品質
                         → PM Agent 審查驗收條件
```

---

## 架構概述

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Review Orchestrator                        │
│                                                                 │
│  1. 收集待審查產出物                                             │
│  2. 並行啟動所有 Reviewer Agents                                 │
│  3. 收集各 Agent 審查結果                                        │
│  4. 執行 Consensus Check（共識檢查）                             │
│  5. 決定：通過 / 回饋迴圈 / 失敗                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心概念

### 1. Reviewer Agent 結構

每個 Reviewer Agent 必須遵循統一介面：

```typescript
interface IReviewerAgent {
  // Agent 識別
  name: string           // e.g., "Security", "Test", "UI"
  priority: 'critical' | 'high' | 'medium' | 'low'

  // 審查範圍
  scope: string[]        // 審查哪些檔案類型或領域

  // 審查規則
  rules: IReviewRule[]   // 具體審查項目

  // 執行審查
  review(artifacts: IArtifact[]): IReviewResult
}

interface IReviewResult {
  status: 'APPROVED' | 'NEEDS_CHANGES' | 'BLOCKED'
  findings: IFinding[]
  summary: string
}

interface IFinding {
  severity: 'critical' | 'major' | 'minor' | 'suggestion'
  location: string       // 檔案路徑或位置
  message: string        // 問題描述
  suggestion?: string    // 建議修改方式
}
```

### 2. 優先級規則

| Priority | 行為 | 範例 |
|----------|------|------|
| `critical` | BLOCKED 時整個 Review 立即失敗 | Security Agent |
| `high` | NEEDS_CHANGES 時觸發回饋迴圈 | Test, Quality Agent |
| `medium` | NEEDS_CHANGES 時記錄但可繼續 | Style Agent |
| `low` | 只記錄 suggestions | Documentation Agent |

### 3. Consensus Check 規則

```text
Consensus 邏輯：

1. 任何 critical Agent 為 BLOCKED → 整體 BLOCKED
2. 任何 high Agent 為 NEEDS_CHANGES → 整體 NEEDS_CHANGES
3. 全部 APPROVED → 整體 APPROVED
4. 其他情況 → NEEDS_CHANGES（附帶 findings）
```

---

## 適用場景

### 場景 1：Code Review（開發）

```yaml
name: Code Review
max_iterations: 5

reviewers:
  - agent: Security
    priority: critical
    scope: ["**/*.go", "**/*.ts", "**/*.tsx"]
    rules:
      - owasp_top_10
      - secrets_detection
      - sql_injection
      - xss_prevention

  - agent: Test
    priority: high
    scope: ["**/*_test.go", "**/*.test.ts"]
    rules:
      - test_file_exists
      - coverage_threshold_80
      - e2e_covers_acceptance

  - agent: Quality
    priority: high
    scope: ["**/*.go", "**/*.ts", "**/*.tsx"]
    rules:
      - clean_architecture
      - lint_passes
      - naming_conventions

  - agent: PM
    priority: high
    scope: ["docs/TICKETS.md"]
    rules:
      - acceptance_criteria_met
      - ticket_updated

feedback_loop:
  enabled: true
  target: Engineer Agent
```

### 場景 2：Design Review（設計）

```yaml
name: Design Review
max_iterations: 3

reviewers:
  - agent: PRD Alignment
    priority: critical
    scope: ["docs/designs/**/*.md", "figma://"]
    rules:
      - prd_coverage_complete
      - user_flow_covered
      - edge_cases_handled

  - agent: Accessibility
    priority: high
    scope: ["docs/designs/**/*.md"]
    rules:
      - wcag_aa_compliance
      - aria_requirements
      - color_contrast
      - keyboard_navigation

  - agent: Design System
    priority: high
    scope: ["docs/designs/**/*.md"]
    rules:
      - uses_design_tokens
      - responsive_breakpoints
      - component_consistency

  - agent: Technical Feasibility
    priority: medium
    scope: ["docs/designs/**/*.md"]
    rules:
      - props_interface_valid
      - state_design_complete
      - no_impossible_requirements

feedback_loop:
  enabled: true
  target: Design Agent
```

### 場景 3：Plan Review（規劃）

```yaml
name: Plan Review
max_iterations: 3

reviewers:
  - agent: Scope Validator
    priority: critical
    scope: ["docs/TICKETS.md"]
    rules:
      - prd_alignment
      - no_scope_creep
      - dependencies_valid

  - agent: Technical Architect
    priority: high
    scope: ["docs/TICKETS.md"]
    rules:
      - architecture_sound
      - tech_stack_appropriate
      - security_considered

  - agent: Effort Estimator
    priority: medium
    scope: ["docs/TICKETS.md"]
    rules:
      - tickets_appropriately_sized
      - no_hidden_complexity

feedback_loop:
  enabled: true
  target: Plan Agent
```

### 場景 4：Deploy Review（部署）

```yaml
name: Deploy Review
max_iterations: 2

reviewers:
  - agent: Security Scanner
    priority: critical
    scope: ["terraform/**/*", "Dockerfile", ".github/workflows/*"]
    rules:
      - no_exposed_secrets
      - iac_security_scan
      - container_security

  - agent: Infrastructure Validator
    priority: critical
    scope: ["terraform/**/*"]
    rules:
      - terraform_plan_clean
      - no_destructive_changes
      - resource_limits_set

  - agent: Rollback Checker
    priority: high
    scope: ["*"]
    rules:
      - rollback_plan_exists
      - health_check_configured
      - monitoring_enabled

feedback_loop:
  enabled: false  # 部署前必須全部通過，不做迴圈
```

---

## Orchestrator 實作模板

```markdown
# Review Orchestrator Template

## 輸入
- artifacts: 待審查產出物列表
- config: Review 設定（使用哪個場景）

## 執行流程

### Step 1: 初始化
\`\`\`
1. 載入 config 中定義的 reviewers
2. 收集所有待審查的 artifacts
3. 設定 iteration_count = 0
\`\`\`

### Step 2: 並行審查
\`\`\`
parallel for each reviewer in reviewers:
    result = reviewer.review(artifacts)
    results.append(result)
\`\`\`

### Step 3: Consensus Check
\`\`\`
overall_status = check_consensus(results)

if overall_status == BLOCKED:
    return FAIL with critical_findings

if overall_status == APPROVED:
    return PASS with summary

if overall_status == NEEDS_CHANGES:
    if iteration_count >= max_iterations:
        return FAIL with retrospective_report

    if feedback_loop.enabled:
        feedback = aggregate_findings(results)
        send_to(feedback_loop.target, feedback)
        iteration_count++
        goto Step 2
    else:
        return FAIL with findings
\`\`\`

### Step 4: 產出報告
\`\`\`
generate_review_report(results, overall_status)
\`\`\`
```

---

## Agent 定義模板

建立新 Reviewer Agent 時使用此模板：

```markdown
# {Agent Name} Reviewer Agent

## 基本資訊
- **名稱**: {Agent Name}
- **優先級**: critical | high | medium | low
- **審查範圍**: {file patterns or domains}

## 審查規則

### Rule 1: {Rule Name}
- **說明**: {規則描述}
- **檢查方式**: {如何檢查}
- **PASS 條件**: {通過條件}
- **FAIL 條件**: {失敗條件}

### Rule 2: {Rule Name}
...

## 輸出格式

\`\`\`json
{
  "agent": "{Agent Name}",
  "status": "APPROVED | NEEDS_CHANGES | BLOCKED",
  "findings": [
    {
      "severity": "critical | major | minor | suggestion",
      "rule": "{violated rule}",
      "location": "{file:line}",
      "message": "{問題描述}",
      "suggestion": "{建議修改}"
    }
  ],
  "summary": "{審查摘要}"
}
\`\`\`
```

---

## 與現有 Commands 整合

| Command | 使用的 Review Pattern |
|---------|---------------------|
| `/project:done` | Code Review |
| `/project:review` | Code Review |
| `/project:plan` | Plan Review + Design Review |
| `/project:design` | Design Review |
| `/project:deploy` | Deploy Review |

---

## 回饋迴圈機制

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Feedback Loop                               │
└─────────────────────────────────────────────────────────────────┘

  Iteration 1:
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Producer │───▶│ Reviewers│───▶│ Findings │
  │  Agent   │    │ (並行)    │    │          │
  └──────────┘    └──────────┘    └────┬─────┘
                                       │
                         NEEDS_CHANGES │
                                       ▼
  Iteration 2:              ┌──────────────────┐
  ┌──────────┐              │ Aggregated       │
  │ Producer │◀─────────────│ Feedback         │
  │  Agent   │              └──────────────────┘
  └────┬─────┘
       │ 修改後
       ▼
  ┌──────────┐    ┌──────────┐
  │ Reviewers│───▶│ APPROVED │ ✓
  │ (並行)    │    │ or 繼續... │
  └──────────┘    └──────────┘

  Max Iterations 後仍未通過 → 產出檢討報告
```

### 檢討報告格式

```markdown
# Review 失敗檢討報告

## 摘要
- **Review 類型**: {Code Review / Design Review / ...}
- **迭代次數**: {n} / {max}
- **最終狀態**: FAIL

## 未解決的問題

### Critical Issues
| # | Agent | Rule | Location | Message |
|---|-------|------|----------|---------|
| 1 | Security | sql_injection | handler.go:45 | 未使用參數化查詢 |

### Major Issues
...

## 根本原因分析
{分析為什麼經過多輪迭代仍無法解決}

## 建議下一步
1. {建議 1}
2. {建議 2}
```

---

## 使用範例

### 範例 1：在 `/project:done` 中使用

```text
User: /project:done

Orchestrator:
1. 識別變更的檔案
2. 載入 "Code Review" pattern
3. 並行啟動 4 個 Reviewers
4. 收集結果，執行 Consensus Check
5. 產出報告
```

### 範例 2：在 `/project:plan` 中使用

```text
User: /project:plan 實作通知系統

Plan Agent:
1. 分析需求，產出 Tickets

Orchestrator:
1. 載入 "Plan Review" pattern
2. 並行啟動 3 個 Reviewers (Scope, Architect, Estimator)
3. 若有問題，回饋給 Plan Agent 修改
4. 通過後產出最終 Tickets
```
