# Document Co-authoring Skill

> 文件協作專家。專精協同編輯、版本控制、內容審查與文件工作流程。

**來源**: 整合自 [anthropics/skills](https://github.com/anthropics/skills) - doc-coauthoring

---

## 適用時機

當需要進行文件協作、內容審查、版本管理時，自動載入此 Skill。

---

## 核心能力

### 協同編輯

- 即時協作支援
- 衝突解決策略
- 變更追蹤
- 評論與回覆

### 版本控制

- 版本歷史追蹤
- 差異比較
- 版本還原
- 分支合併

### 內容審查

- 審查工作流程
- 批准/拒絕變更
- 建議修改
- 品質檢查

### 文件格式

- Markdown
- Rich Text
- HTML
- 結構化文件（JSON/YAML）

---

## 協作模式

### 1. 即時協作

適用於需要多人同時編輯的場景：

```text
┌─────────────────────────────────────────────────────────────┐
│                    Real-time Collaboration                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User A ─────┐                                              │
│              │    ┌──────────────┐    ┌───────────────┐   │
│  User B ─────┼───→│   Document   │───→│   Broadcast   │   │
│              │    │    Server    │    │   Changes     │   │
│  User C ─────┘    └──────────────┘    └───────────────┘   │
│                          │                                  │
│                          ↓                                  │
│                   ┌──────────────┐                         │
│                   │   Conflict   │                         │
│                   │  Resolution  │                         │
│                   └──────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. 異步審查

適用於需要審核批准的流程：

```text
作者提交 → 審查者審核 → 批准/要求修改 → 合併
    │           │              │
    └───────────┴──────────────┘
           可能多次循環
```

### 3. 版本分支

適用於需要平行開發的場景：

```text
main ────●────●────●────●────●
          \         /
feature    ○───○───○
```

---

## 使用模式

### Markdown 協作

```markdown
<!-- 變更標記 -->
~~刪除的內容~~ → 新增的內容

<!-- 評論 -->
這是一段文字 <!-- @reviewer: 這裡需要更多說明 -->

<!-- 建議修改 -->
> [!SUGGESTION]
> 建議將這段改為更清楚的說明
```

### 變更追蹤格式

```typescript
interface DocumentChange {
  id: string;
  author: string;
  timestamp: Date;
  type: 'insert' | 'delete' | 'modify';
  position: {
    start: number;
    end: number;
  };
  oldContent?: string;
  newContent: string;
  status: 'pending' | 'approved' | 'rejected';
  comments: Comment[];
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
}
```

### 衝突解決

```typescript
interface ConflictResolution {
  documentId: string;
  conflictId: string;
  resolution: 'accept_theirs' | 'accept_mine' | 'merge_manual';
  mergedContent?: string;
  resolvedBy: string;
  resolvedAt: Date;
}

async function resolveConflict(
  conflict: DocumentConflict,
  strategy: 'auto' | 'manual'
): Promise<ResolvedDocument> {
  if (strategy === 'auto') {
    // 自動合併（適用於不重疊的變更）
    return autoMerge(conflict);
  } else {
    // 手動解決（需要人工介入）
    return presentConflictUI(conflict);
  }
}
```

---

## 審查工作流程

### 標準審查流程

```typescript
enum ReviewStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  MERGED = 'merged'
}

interface ReviewWorkflow {
  document: Document;
  author: User;
  reviewers: User[];
  status: ReviewStatus;
  comments: ReviewComment[];
  approvals: Approval[];
  requiredApprovals: number;
}

async function submitForReview(doc: Document, reviewers: User[]) {
  return {
    ...doc,
    status: ReviewStatus.PENDING_REVIEW,
    reviewers,
    submittedAt: new Date()
  };
}

async function approveDocument(review: ReviewWorkflow, reviewer: User) {
  const approvals = [...review.approvals, { reviewer, timestamp: new Date() }];
  
  if (approvals.length >= review.requiredApprovals) {
    return { ...review, status: ReviewStatus.APPROVED, approvals };
  }
  
  return { ...review, approvals };
}
```

### 審查檢查清單

```markdown
## 文件審查檢查清單

### 內容品質
- [ ] 內容完整且準確
- [ ] 邏輯清晰，結構合理
- [ ] 無錯字或文法錯誤
- [ ] 術語使用一致

### 格式規範
- [ ] 遵循專案文件格式
- [ ] 標題層級正確
- [ ] 程式碼區塊有語法標記
- [ ] 圖片有替代文字

### 技術準確性
- [ ] 程式碼範例可執行
- [ ] API 說明準確
- [ ] 版本資訊正確
- [ ] 連結有效
```

---

## 版本比較

### 差異顯示

```typescript
interface DiffResult {
  additions: number;
  deletions: number;
  changes: DiffChange[];
}

interface DiffChange {
  type: 'add' | 'delete' | 'modify';
  lineNumber: number;
  oldLine?: string;
  newLine?: string;
}

function generateDiff(oldContent: string, newContent: string): DiffResult {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // 使用 Myers diff 算法
  return computeDiff(oldLines, newLines);
}
```

### 視覺化差異

```text
  1    1   # Document Title
  2    2   
- 3      - This is the old content.
     3   + This is the updated content with improvements.
  4    4   
  5    5   ## Section 2
- 6      - Outdated information here.
     6   + Current and accurate information.
     7   + Additional new paragraph added.
```

---

## 與專案整合

### 配置範例

```yaml
# project.yaml
collaboration:
  review:
    required_approvals: 2
    auto_merge: false
    protect_main: true
  
  permissions:
    viewer: [read]
    editor: [read, edit, comment]
    reviewer: [read, edit, comment, approve]
    admin: [read, edit, comment, approve, merge, delete]
```

### 工作流程自動化

```typescript
// 自動化審查提醒
async function sendReviewReminder(review: ReviewWorkflow) {
  const pendingReviewers = review.reviewers.filter(
    r => !review.approvals.find(a => a.reviewer.id === r.id)
  );
  
  for (const reviewer of pendingReviewers) {
    await notify(reviewer, {
      type: 'review_reminder',
      document: review.document,
      deadline: review.deadline
    });
  }
}
```

---

## 最佳實踐

### 1. 原子性變更

每次變更應該是獨立且完整的：

```markdown
✅ 好的變更：
- 修正單一章節的錯誤
- 新增完整的新功能說明

❌ 避免的變更：
- 同時修改多個不相關的部分
- 不完整的變更（需要後續補充）
```

### 2. 清晰的變更說明

```markdown
## 變更說明

### 變更類型
- [ ] 內容新增
- [x] 內容修正
- [ ] 格式調整
- [ ] 錯誤修復

### 變更描述
更新 API 端點說明，修正回應格式範例。

### 相關議題
- Fixes #123
- Related to #456
```

### 3. 有效的審查回饋

```markdown
## 審查意見

### 必要修改
1. 第 45 行：API 回應範例缺少 `status` 欄位
2. 第 78 行：錯誤處理說明不完整

### 建議改進
1. 考慮新增更多使用範例
2. 建議加入效能注意事項

### 整體評價
內容架構清晰，技術說明準確。完成上述修改後可批准。
```

---

## 相關檔案

- PDF 處理：`.claude/skills/pdf/SKILL.md`
- Excel 處理：`.claude/skills/xlsx/SKILL.md`
- 品質審查：`.claude/agents/reviewers/quality.md`

---

**類型**: 文件協作 Skill
**來源**: [anthropics/skills](https://github.com/anthropics/skills) - doc-coauthoring
