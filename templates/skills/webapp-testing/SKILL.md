# Web App Testing Skill

> E2E 測試專家。專精 Playwright 自動化測試、網頁應用程式品質驗證。

**來源**: 整合自 [anthropics/skills](https://github.com/anthropics/skills) - webapp-testing

---

## 適用時機

當需要進行 E2E 測試、網頁應用程式自動化測試時，自動載入此 Skill。

---

## 核心能力

### Playwright 測試框架

- 跨瀏覽器測試（Chromium、Firefox、WebKit）
- 自動等待機制
- 網路攔截與 Mock
- 截圖與錄影
- 追蹤與除錯

### 測試策略

- Page Object Model
- 測試隔離
- 平行執行
- 重試機制

---

## 決策框架：何時截圖

### 靜態內容應用

對於主要是靜態 HTML 且互動性有限的應用：

```typescript
// 導航後立即截圖
await page.goto(url);
await page.screenshot({ path: 'screenshot.png' });
```

### 動態內容應用

對於依賴 JavaScript 渲染或進行 API 呼叫的應用：

```typescript
// 等待網路閒置後再截圖
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'screenshot.png' });
```

### 何時使用 `networkidle`

| 場景 | 使用 networkidle |
|------|-----------------|
| SPA（React、Vue、Angular） | ✅ 是 |
| 動態載入資料的頁面 | ✅ 是 |
| 靜態 HTML 頁面 | ❌ 否 |
| 有即時更新的頁面 | ⚠️ 可能需要自訂等待 |

---

## 測試模式

### 基本導航測試

```typescript
import { test, expect } from '@playwright/test';

test('應該載入首頁', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
```

### 表單互動測試

```typescript
test('應該成功提交登入表單', async ({ page }) => {
  await page.goto('/login');

  // 填寫表單
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password123');

  // 提交
  await page.click('[data-testid="submit"]');

  // 驗證結果
  await expect(page).toHaveURL('/dashboard');
});
```

### 等待特定元素

```typescript
test('應該顯示載入後的內容', async ({ page }) => {
  await page.goto('/data-page');

  // 等待特定元素出現
  await page.waitForSelector('[data-testid="data-loaded"]');

  // 或等待特定文字
  await expect(page.locator('.content')).toContainText('Data loaded');
});
```

### API Mock 測試

```typescript
test('應該處理 API 錯誤', async ({ page }) => {
  // Mock API 回應
  await page.route('**/api/data', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Server Error' })
    });
  });

  await page.goto('/data-page');

  // 驗證錯誤處理
  await expect(page.locator('.error-message')).toBeVisible();
});
```

---

## 最佳實踐

### 1. 使用 data-testid 定位元素

```html
<!-- 推薦 -->
<button data-testid="submit-button">Submit</button>

<!-- 避免依賴不穩定的選擇器 -->
<button class="btn btn-primary">Submit</button>
```

### 2. 測試隔離

```typescript
test.beforeEach(async ({ page }) => {
  // 每個測試前重置狀態
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});
```

### 3. 合理的等待策略

```typescript
// ✅ 好：等待特定條件
await page.waitForSelector('.loaded');
await expect(page.locator('.data')).toBeVisible();

// ❌ 避免：硬編碼等待時間
await page.waitForTimeout(5000);
```

### 4. 截圖用於除錯

```typescript
test('複雜流程測試', async ({ page }) => {
  await page.goto('/checkout');

  // 在關鍵步驟截圖
  await page.screenshot({ path: 'screenshots/step-1-cart.png' });

  await page.click('[data-testid="proceed"]');
  await page.screenshot({ path: 'screenshots/step-2-payment.png' });
});
```

---

## 與專案整合

### 讀取測試覆蓋率要求

從 `project.yaml` 讀取 `team.test_coverage` 設定：

```yaml
team:
  test_coverage: 80  # E2E 測試覆蓋率目標
```

### 測試報告格式

```markdown
## E2E 測試報告

### 執行結果
| 測試 | 狀態 | 時間 |
|------|------|------|
| 登入流程 | ✅ | 2.3s |
| 結帳流程 | ✅ | 4.1s |
| 搜尋功能 | ⚠️ | 1.8s |

### 覆蓋率
- 頁面覆蓋: 85%
- 使用者流程: 90%
- 錯誤處理: 75%

### 截圖
- [登入頁面](screenshots/login.png)
- [儀表板](screenshots/dashboard.png)
```

---

## 常見問題處理

### 處理動態載入

```typescript
// 等待 loading 指示器消失
await page.waitForSelector('.loading', { state: 'hidden' });

// 或等待資料出現
await page.waitForFunction(() => {
  return document.querySelectorAll('.data-item').length > 0;
});
```

### 處理 iframe

```typescript
const frame = page.frameLocator('#my-iframe');
await frame.locator('button').click();
```

### 處理多視窗

```typescript
const [newPage] = await Promise.all([
  context.waitForEvent('page'),
  page.click('a[target="_blank"]')
]);
await newPage.waitForLoadState();
```

---

## 相關檔案

- TDD 協調器：`.claude/agents/workers/tdd-orchestrator.md`
- 測試審查：`.claude/agents/reviewers/test.md`
- 前端規範：`.claude/agents/experts/frontend.md`

---

**類型**: E2E 測試 Skill
**來源**: [anthropics/skills](https://github.com/anthropics/skills) - webapp-testing
