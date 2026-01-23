# Test Requirements

> 測試規範共用模板，供 CLAUDE.md 和各 Agent 引用

---

## 技術棧（從 project.yaml 讀取）

執行前請讀取 `.claude/project.yaml`，確認以下設定：

| 項目 | project.yaml 路徑 | 說明 |
|------|-------------------|------|
| 測試覆蓋率 | `team.test_coverage` | 預設 80% |
| 後端語言 | `tech_stack.backend.language` | 決定測試框架 |
| 前端測試 | `tech_stack.frontend.testing` | vitest / jest |
| E2E 測試 | `tech_stack.frontend.e2e` | playwright / cypress |

---

## E2E 測試強制規範（最重要）

**所有涉及用戶流程的功能，必須撰寫 E2E 測試覆蓋驗收條件。**

### 為什麼 E2E 測試是強制性的？

單元測試只能驗證單一模組的行為，無法發現**跨模組的整合問題**。例如：

- 前端使用 `organizations.length > 0` 判斷是否有組織
- 後端使用 `user.organizationId` 判斷是否有組織
- 這種不一致導致無限迴圈，**只有 E2E 測試才能發現**

### E2E 測試撰寫時機

| 功能類型 | 需要 E2E 測試 | 說明 |
|---------|-------------|------|
| 用戶認證流程 | **強制** | 註冊、登入、登出、OAuth |
| 狀態變更後的導航 | **強制** | 例：建立組織後導向 /app |
| 多步驟業務流程 | **強制** | 例：onboarding 完整流程 |
| 表單提交 + 後端互動 | **強制** | 確保前後端契約正確 |
| 純前端展示 | 建議 | 可用單元測試替代 |

### E2E 測試必須覆蓋的驗收條件

每個 Ticket 的驗收條件，**至少要有一個對應的 E2E 測試案例**：

```typescript
// 範例：TICKET-005 組織管理
// 驗收條件 1：新使用者必須先建立或加入組織才能進入主頁面

test('新使用者完整 onboarding 流程', async ({ page }) => {
  // 1. 註冊新使用者
  const email = `test-${Date.now()}@example.com`
  await page.goto('/register')
  // ... 填寫表單 ...

  // 2. 應該導向 onboarding（驗收條件：沒有組織的使用者被導向 onboarding）
  await page.waitForURL('/app/onboarding')

  // 3. 建立組織
  await page.fill('input[name="name"]', 'My Organization')
  await page.fill('input[name="slug"]', 'my-org')
  await page.click('button[type="submit"]')

  // 4. 應該導向 /app 且不會再跳回 onboarding（驗收條件：建立組織後可進入主頁面）
  await page.waitForURL('/app')

  // 5. 重新整理確認不會無限迴圈
  await page.reload()
  await expect(page).toHaveURL('/app')
})
```

### E2E 測試檔案位置

```text
{paths.frontend}/e2e/
├── auth.spec.ts           # 認證流程（登入、註冊、OAuth）
├── onboarding.spec.ts     # Onboarding 流程（如適用）
├── [feature].spec.ts      # 功能模組測試
└── ...
```

### E2E 測試 FAIL 條件

1. **Ticket 驗收條件未被 E2E 測試覆蓋**（最重要）
   - 每個驗收條件至少要有一個對應的 E2E 測試案例
   - 缺少任何一個 = FAIL
2. E2E 測試執行失敗
3. **缺少完整流程驗證**：
   - 用戶流程必須從頭到尾測試（例：註冊 → onboarding → 建立組織 → 進入主頁）
   - 缺少「重新整理後狀態保持」的驗證
4. E2E 測試缺少關鍵檢查:
   - 缺少 `waitForLoadState('networkidle')`
   - 缺少 `waitForURL()` 導航驗證
   - 錯誤情境沒有驗證錯誤訊息

### 必須存在的 E2E 測試（依專案類型調整）

| 功能模組 | 測試檔案 | 關鍵流程 | 優先級 |
|---------|---------|---------|------|
| Authentication | `e2e/auth.spec.ts` | 登入、登出、Token refresh | **必須** |
| Registration | `e2e/auth.spec.ts` | 使用者註冊流程 | **必須** |
| 核心功能 | `e2e/[feature].spec.ts` | 主要業務流程 | **必須** |
| 表單提交 | `e2e/forms.spec.ts` | 表單驗證、提交、錯誤處理 | **必須** |
| 導航流程 | `e2e/navigation.spec.ts` | 頁面切換、權限控制 | 建議 |

---

## 單元測試檔案清單

### Backend（依 `tech_stack.backend.language` 調整）

**Go**:
| 檔案類型 | 需要測試 | 測試檔案命名 |
|---------|---------|------------|
| `service.go` | **必須** | `service_test.go` |
| `handler.go` | **必須** | `handler_test.go` |
| `repository.go` | **必須** | `repository_test.go` |
| `domain.go` | 如有邏輯 | `domain_test.go` |
| `middleware.go` | **必須** | `middleware_test.go` |

**Python**:
| 檔案類型 | 需要測試 | 測試檔案命名 |
|---------|---------|------------|
| `service.py` | **必須** | `test_service.py` |
| `routes.py` / `views.py` | **必須** | `test_routes.py` |
| `repository.py` | **必須** | `test_repository.py` |
| `models.py` | 如有邏輯 | `test_models.py` |

**Node.js**:
| 檔案類型 | 需要測試 | 測試檔案命名 |
|---------|---------|------------|
| `*.service.ts` | **必須** | `*.service.test.ts` |
| `*.controller.ts` | **必須** | `*.controller.test.ts` |
| `*.repository.ts` | **必須** | `*.repository.test.ts` |

### Frontend (TypeScript)

| 檔案類型 | 需要測試 | 說明 |
|---------|---------|------|
| `hooks/use*.ts` | **必須** | Custom hooks |
| `utils/*.ts` | **必須** | Utility functions |
| `stores/*.ts` | **必須** | State management |
| `components/*.tsx` | 建議 | 至少測試互動邏輯 |
| `app/**/page.tsx` | 可選 | Page components |

### 豁免清單

以下檔案類型可以不需要測試：

- `**/main.go` - 程式進入點
- `**/*_mock.go` - Mock 檔案
- `**/*.pb.go` - Protocol buffer 生成檔
- `**/types.ts` - 純型別定義
- `**/*.d.ts` - TypeScript 宣告檔
- `**/index.ts` - 純 re-export 檔案

---

## 測試覆蓋率要求

**目標**: > `{team.test_coverage}%`（預設 80%）

### 依語言執行覆蓋率檢查

**Go**:
```bash
cd {paths.backend} && go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total
```

**Python**:
```bash
cd {paths.backend} && pytest --cov --cov-report=term-missing
```

**Node.js (Backend)**:
```bash
cd {paths.backend} && {pm} test:coverage
```

**Frontend**:
```bash
cd {paths.frontend} && {pm} test:coverage
```

---

## TDD 流程

```text
1. RED      → 先寫測試，確認測試失敗
2. GREEN    → 寫最少的程式碼讓測試通過
3. REFACTOR → 重構，保持測試通過
```

### 測試命名規範

**Go**:
```go
// Test<Function>_<Scenario>
func TestUserService_Create_Success(t *testing.T) {}
func TestUserService_Create_DuplicateEmail(t *testing.T) {}
func TestUserService_Create_InvalidInput(t *testing.T) {}
```

**Python**:
```python
# test_<function>_<scenario>
def test_user_service_create_success():
    pass

def test_user_service_create_duplicate_email():
    pass
```

**TypeScript/JavaScript**:
```typescript
// describe + it
describe('useAuth', () => {
  it('should return user when authenticated', () => {});
  it('should return null when not authenticated', () => {});
});
```

### 測試涵蓋範圍

- [ ] Happy path (正常流程)
- [ ] Edge cases (邊界條件)
- [ ] Error handling (錯誤處理)
- [ ] Input validation (輸入驗證)

---

---

## 相關檔案

- 專案配置：`.claude/project.yaml`
- Precommit/CI 同步：`.claude/templates/precommit-ci-sync.md`
- TDD 流程：`.claude/commands/tdd.md`
- Test Reviewer：`.claude/agents/reviewers/test.md`

## 使用方式

在其他文件中引用：

```markdown
## E2E 測試規範

→ 參考 [test-requirements.md](.claude/templates/test-requirements.md#e2e-測試強制規範最重要)

## 單元測試清單

→ 參考 [test-requirements.md](.claude/templates/test-requirements.md#單元測試檔案清單)
```

---

**類型**: 通用測試規範模板
**依賴**: `project.yaml` 測試設定
