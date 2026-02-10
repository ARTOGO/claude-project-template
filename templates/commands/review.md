# Code Review Command (Multi-Agent)

對當前變更進行 Multi-Agent Code Review。

## Usage

```bash
/project:review [TICKET-XXX]
/project:review --security    # 只執行 Security Agent
/project:review --test        # 只執行 Test Agent
/project:review --quality     # 只執行 Quality Agent
/project:review --pm          # 只執行 PM Agent
/project:review --mode=teams  # 強制使用 Agent Teams 模式
```

## 執行前準備

**讀取專案配置**：

```bash
# 讀取 .claude/project.yaml 確認：
# - team.collaboration_mode: 協作模式 (subagent / agent-teams)
# - team.review_agents: 啟用的 Review Agents
```

## 參考 Agents

### Review Agents（審查員）

| Agent | 檔案位置 | 職責 |
| ----- | -------- | ---- |
| 🔒 Security | `.claude/agents/reviewers/security.md` | OWASP Top 10、Secrets 檢測 |
| 🧪 Test | `.claude/agents/reviewers/test.md` | 測試覆蓋率檢查 |
| 📐 Quality | `.claude/agents/reviewers/quality.md` | 程式碼品質檢查 |
| 📋 PM | `.claude/agents/reviewers/pm.md` | 驗收條件檢查 |

### Expert Agents（規範參考，被 Quality Agent 載入）

| Agent | 檔案位置 | 載入時機 |
| ----- | -------- | -------- |
| Frontend Expert | `.claude/agents/experts/frontend.md` | 審查 `.tsx` 檔案時 |
| Backend Expert | `.claude/agents/experts/backend.md` | 審查 `.go` 檔案時 |
| Database Expert | `.claude/agents/experts/database.md` | 審查 DB Schema 時 |
| CI/CD Expert | `.claude/agents/experts/cicd.md` | 審查 `.github/workflows/*.yml` 時 |
| Terraform Expert | `.claude/agents/experts/terraform.md` | 審查 `terraform/*.tf` 時 |

## 執行流程

### 1. 準備

```bash
# 取得變更檔案
git diff --cached --name-only
git diff --name-only

# 識別 Ticket ID
git branch --show-current | grep -oE "TICKET-[0-9]+"
```

### 2. 根據協作模式執行 Review

**讀取 `team.collaboration_mode` 決定執行方式**：

---

#### 模式 A: Subagent（預設）

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Subagent Review 流程                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 取得變更檔案清單                                             │
│                                                                  │
│  2. 依序執行各 Reviewer（可平行化）                              │
│     │                                                            │
│     ├─→ Security Reviewer（必須先執行）                          │
│     │      • 讀取 .claude/agents/reviewers/security.md           │
│     │      • 檢查 OWASP Top 10、Secrets                          │
│     │      • FAIL → 立即停止                                     │
│     │                                                            │
│     ├─→ Test Reviewer                                            │
│     │      • 讀取 .claude/agents/reviewers/test.md               │
│     │      • 檢查測試覆蓋率、測試品質                            │
│     │                                                            │
│     ├─→ Quality Reviewer                                         │
│     │      • 讀取 .claude/agents/reviewers/quality.md            │
│     │      • 根據檔案類型載入對應 Expert                         │
│     │      • 檢查架構、程式碼品質                                │
│     │                                                            │
│     └─→ PM Reviewer（如啟用）                                    │
│            • 讀取 .claude/agents/reviewers/pm.md                 │
│            • 檢查驗收條件完成度                                  │
│                                                                  │
│  3. 主 Agent 整合所有結果                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**執行方式**：

1. 使用 Task tool 呼叫各 Reviewer
2. Security Reviewer 必須先執行，FAIL 則停止
3. 其他 Reviewer 可平行執行
4. 收集結果後整合報告

---

#### 模式 B: Agent Teams（實驗性）

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Teams Review 流程                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 確認 Agent Teams 已啟用                                      │
│     檢查 .claude/settings.json:                                  │
│     { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }   │
│                                                                  │
│  2. 建立 Review Team                                             │
│     成員：Security, Test, Quality, PM（依設定）                  │
│                                                                  │
│  3. 團隊協作審查                                                 │
│     • 各 Agent 獨立審查變更                                      │
│     • 發現問題時互相討論                                         │
│     • 例：Security 發現 SQL Injection                            │
│       → Quality: "這違反了 Clean Architecture"                   │
│       → Test: "我會建議加入 SQL Injection 測試"                  │
│                                                                  │
│  4. 達成共識                                                     │
│     • 討論解決方案                                               │
│     • 產出統一的審查報告                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**執行方式**：

1. 建立 Agent Team
2. 指定團隊任務：「審查以下變更...」
3. 讓團隊協作，等待達成共識
4. 收集團隊報告

**適用場景**：

- 複雜的架構變更需要多方討論
- 安全與效能的取捨需要權衡
- 跨領域的變更需要不同專家意見

---

### 3. 產出報告

```markdown
# Multi-Agent Code Review Report

## 審查資訊

| 項目 | 值 |
| ---- | -- |
| Ticket | TICKET-XXX |
| 變更檔案數 | X |
| 協作模式 | subagent / agent-teams |

## Agent 審查結果

| Agent | 狀態 | 摘要 |
| ----- | ---- | ---- |
| 🔒 Security | ✅/❌ | ... |
| 🧪 Test | ✅/❌ | 覆蓋率 X% |
| 📐 Quality | ✅/❌ | Lint errors: X |
| 📋 PM | ✅/❌ | 驗收 X% |

## 詳細發現

### Security

- [ ] 問題 1: ...
- [ ] 問題 2: ...

### Test

- [ ] 缺少測試: ...

### Quality

- [ ] 架構違規: ...

### PM

- [ ] 未完成驗收條件: ...

## 最終狀態

✅ PASS - Ready for merge

或

❌ FAIL - 必須修復: [問題清單]
```

## 單一 Agent 模式

使用 `--security`、`--test`、`--quality`、`--pm` 參數可只執行特定 Agent：

```bash
# 只執行安全檢查
/project:review --security

# 只執行測試檢查
/project:review --test
```

此模式忽略 `collaboration_mode` 設定，直接執行指定的 Agent。

## 強制 Agent Teams 模式

即使 `project.yaml` 設定為 `subagent`，也可以強制使用 Agent Teams：

```bash
/project:review --mode=teams
```

適用於：

- 臨時需要深度討論的 Review
- 評估是否要切換到 Agent Teams 模式

## 協作模式比較

| 特性 | Subagent | Agent Teams |
| ---- | -------- | ----------- |
| 執行速度 | 較快 | 較慢 |
| Token 成本 | 較低 | 較高 |
| 討論深度 | 各自獨立 | 可互相討論 |
| 適用場景 | 一般 Review | 複雜變更 |
| 需要設定 | 無 | 需啟用實驗功能 |

## 相關檔案

- `.claude/project.yaml` - 專案配置（協作模式設定）
- `.claude/settings.json` - Claude Code 設定（Agent Teams 啟用）
- `.claude/agents/reviewers/security.md`
- `.claude/agents/reviewers/test.md`
- `.claude/agents/reviewers/quality.md`
- `.claude/agents/reviewers/pm.md`
