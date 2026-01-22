# Doc Co-Authoring Skill - 文件協作

結構化協作文件創建指南，透過三個階段：情境收集、精煉與結構、讀者測試。

## 概述

本 skill 引導使用者透過結構化的協作文件創建，分為三個階段：情境收集、精煉與結構、讀者測試。

## 觸發條件

當使用者提及撰寫文件任務時啟動，例如「寫一份文件」、「草擬提案」，或創建特定文件類型（PRD、設計文件、決策文件、RFC）。

## 階段 1: 情境收集

**目的**：彌合使用者和 Claude 之間的知識差距。

初始問題涵蓋文件類型、受眾、期望影響、格式要求和限制。使用者可以提供資訊作為非結構化轉儲、透過團隊頻道或鏈接文件。

關鍵方法：「詢問是否應該搜尋已連接的工具以了解更多」，然後在訪問外部來源之前提出 5-10 個澄清問題，以驗證理解。當問題揭示對邊緣情況和權衡的理解時退出。

## 階段 2: 精煉與結構

**目的**：透過腦力激盪和精煉逐節構建。

每個章節的流程：
1. 提出 5-10 個澄清問題
2. 腦力激盪 5-20 個選項
3. 使用者選擇保留/移除/合併的內容
4. 草擬章節
5. 根據反饋迭代精煉

工作流程建議「從最多未知數的章節開始」，通常是核心提案或技術方法。接近完成時，審查整個文件的流暢性、冗餘和連貫性。

## 階段 3: 讀者測試

**目的**：驗證文件對沒有作者背景的新讀者有效。

生成 5-10 個實際的讀者問題，然後用新的 Claude 實例測試。檢查讀者 Claude 是否正確回答，並識別模糊或錯誤假設。對有問題的章節迭代，直到出現一致的正確答案。

## 最終審查

使用者執行最終閱讀，在完成前驗證準確性和影響達成。

---

## InsightHub 文件協作指南

### 文件類型模板

#### 1. PRD (Product Requirement Document)

```markdown
# [功能名稱] - PRD

## 概述
- 功能描述
- 目標用戶
- 商業價值

## 背景
- 問題陳述
- 當前解決方案的限制
- 競品分析

## 需求

### 功能需求
1. [功能 1]
   - 描述
   - 驗收條件
   - 優先級

### 非功能需求
- 效能要求
- 安全性要求
- 可用性要求

## 技術方案
- 架構概述
- 技術棧
- 資料模型

## Tickets
### TICKET-XXX: [功能名稱]

**描述**: ...

**Backend 驗收條件**:
- [ ] 條件 1
- [ ] 條件 2

**Frontend 驗收條件**:
- [ ] 條件 1
- [ ] 條件 2

**可部署產出**: ...

## 時程規劃
- Milestone 1: ...
- Milestone 2: ...

## 風險與依賴
- 風險 1: ...
- 依賴 1: ...
```

#### 2. 技術設計文件

```markdown
# [系統/功能] 技術設計

## 系統概述
- 目的
- 範圍
- 術語表

## 架構設計

### Clean Architecture 層級
```text
Domain → Application → Interface → External
```

### 元件圖
[架構圖]

### 資料流
[資料流圖]

## 詳細設計

### Backend
- Service 層設計
- Repository 介面
- API 端點

### Frontend
- Component 架構
- State 管理
- API 整合

## 資料模型

### PostgreSQL Schema
```sql
CREATE TABLE ...
```

### GORM Model
```go
type Model struct { ... }
```

## API 規範

### OpenAPI 定義
```yaml
paths:
  /api/v1/xxx:
    post:
      ...
```

## 安全性考量
- 認證/授權
- 資料加密
- SQL Injection 防護

## 測試策略
- 單元測試
- 整合測試
- E2E 測試

## 部署計劃
- 環境配置
- Migration 步驟
- Rollback 策略
```

#### 3. API 文件

```markdown
# [服務名稱] API 文件

## 認證
- 方法: JWT Bearer Token
- 取得 Token: POST /api/v1/auth/login

## 端點列表

### 查詢相關

#### POST /api/v1/queries/execute

執行自然語言查詢。

**請求**:
```json
{
  "connection_id": "uuid",
  "query": "string"
}
```

**回應**:
```json
{
  "query_id": "uuid",
  "columns": ["col1", "col2"],
  "rows": [[val1, val2]],
  "execution_time": 0.5
}
```

**錯誤碼**:
- 400: 無效查詢
- 401: 未授權
- 403: 權限不足
- 500: 執行錯誤

## 錯誤處理

所有錯誤回應格式：
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "詳細訊息",
    "details": {}
  }
}
```

## 速率限制
- 每分鐘 60 次請求
- Header: X-RateLimit-Remaining

## 版本控制
- 當前版本: v1
- 棄用政策: 提前 3 個月通知
```

### 階段 1 實施：情境收集問題範本

針對 InsightHub 文件的標準問題：

**通用問題**:
1. 文件類型：PRD / 技術設計 / API 文件 / 其他？
2. 目標受眾：開發團隊 / PM / 客戶 / 全部？
3. 技術深度：概念性 / 詳細實作 / 兩者皆有？
4. 相關 Ticket：是否有對應的 TICKET-XXX？
5. 依賴其他文件：是否參考現有 PRD 或設計文件？

**PRD 特定問題**:
6. 功能範圍：單一功能 / 完整模組？
7. 驗收條件：已知 / 需要定義？
8. 優先級：P0 (MVP) / P1 (重要) / P2 (Nice to have)？

**技術設計特定問題**:
9. 架構層級：需要涵蓋哪些層（Domain / Application / Interface）？
10. Clean Architecture 要求：是否需要詳細的依賴規則說明？
11. 測試策略：需要包含測試計劃嗎？

### 階段 2 實施：章節腦力激盪

**範例：PRD 的「技術方案」章節**

澄清問題：
1. 後端使用哪些現有 service？
2. 前端需要新的 component 嗎？
3. 資料庫 schema 變更多大？
4. 是否需要新的 API 端點？
5. 與現有功能的整合點在哪？

腦力激盪選項：
1. 使用現有 auth service + 新增 query service
2. 擴展現有 connection service
3. 創建新的 analytics service
4. ...（5-20 個選項）

### 階段 3 實施：讀者測試

**測試問題範例**（針對 PRD）：

1. 這個功能解決什麼問題？
2. 主要用戶流程是什麼？
3. 驗收條件有哪些？
4. 技術上有什麼風險？
5. 與現有系統如何整合？

**評估標準**：
- ✅ 讀者 Claude 能正確回答所有問題
- ❌ 讀者 Claude 誤解或無法回答 → 修正該章節

### InsightHub 特定模板

在 `.claude/skills/doc-coauthoring/templates/` 目錄下：

```text
templates/
├── prd-template.md           # PRD 模板
├── tech-design-template.md   # 技術設計模板
├── api-doc-template.md       # API 文件模板
└── decision-doc-template.md  # 決策文件模板
```

## 整合到 /project:docs

增強 `.claude/commands/docs.md` 以使用本 skill：

```markdown
# Documentation Command (Enhanced)

## 執行流程

### Phase 1: 文件類型識別
- 識別文件類型（PRD / 技術設計 / API）
- 載入對應模板

### Phase 2: 使用 Doc Co-Authoring Skill
參考: `.claude/skills/doc-coauthoring/SKILL.md`

1. **情境收集**：使用 InsightHub 特定問題
2. **精煉與結構**：逐章節編寫
3. **讀者測試**：驗證清晰度

### Phase 3: 儲存與連結
- 儲存到 `docs/` 目錄
- 更新 TICKETS.md 鏈接
- 通知相關團隊成員
```

## 相關檔案

- Command: `.claude/commands/docs.md`
- Templates: `.claude/skills/doc-coauthoring/templates/`

---

**Skill 來源**: Anthropic Skills - `doc-coauthoring`
**整合日期**: 2026-01-20
**維護者**: InsightHub Team
