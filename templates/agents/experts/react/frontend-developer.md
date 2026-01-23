# Frontend Developer Expert

> React 19+ 和 Next.js 15+ 專業前端開發規範。涵蓋效能優化、無障礙設計、現代開發模式。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) 並根據專案需求調整

---

## 適用時機

當 `tech_stack.frontend.framework` 為 `react` 或 `next` 時，由 `frontend.md` 自動引用此 Expert。

---

## 核心能力

### React 精通

- React 19+ 進階 hooks：useActionState、useOptimistic
- Server Components
- Concurrent Rendering
- 效能分析技術

### Next.js 架構

- App Router + Server Components + Client Components
- RSC 模式
- Server Actions
- Core Web Vitals 優化

### 前端系統

- 組件驅動開發
- 設計系統
- Webpack 5 / Turbopack 建置優化
- Micro-frontends 架構

### 狀態與資料

- Zustand、React Query、SWR
- 客戶端與伺服器端狀態管理
- 即時功能

### 樣式

- Tailwind CSS
- CSS-in-JS 解決方案
- Container Queries 響應式設計
- 主題管理系統

### 效能

- Core Web Vitals 優化（LCP、FID、CLS）
- 程式碼分割
- 圖片優化
- 策略性快取

### 品質

- React Testing Library
- Jest / Vitest
- Playwright / Cypress
- axe-core 無障礙測試

### 無障礙

- WCAG 2.1/2.2 AA 標準
- ARIA 模式
- 語義化 HTML
- 包容性設計原則

---

## 專案結構

### Next.js App Router

```text
src/
├── app/                     # App Router
│   ├── layout.tsx          # 根 Layout
│   ├── page.tsx            # 首頁
│   ├── (auth)/             # 路由群組
│   │   ├── login/
│   │   └── register/
│   └── (dashboard)/
│       ├── layout.tsx
│       └── page.tsx
├── components/
│   ├── ui/                 # 基礎 UI 組件
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── Input/
│   └── features/           # 功能組件
│       └── UserProfile/
├── hooks/                  # Custom Hooks
│   ├── useAuth.ts
│   └── useAuth.test.ts
├── lib/                    # 工具函數
│   ├── api.ts
│   └── utils.ts
├── stores/                 # 狀態管理
│   └── user.store.ts
└── types/                  # TypeScript 類型
    └── index.ts
```

---

## 核心模式

### Server Components

```tsx
// app/users/page.tsx - Server Component
import { getUsers } from '@/lib/api';
import { UserList } from '@/components/features/UserList';

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <main>
      <h1>Users</h1>
      <UserList users={users} />
    </main>
  );
}
```

### Client Components

```tsx
// components/features/UserList/UserList.tsx
'use client';

import { useState } from 'react';
import { User } from '@/types';

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  const [filter, setFilter] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search users..."
        aria-label="Search users"
      />
      <ul role="list" aria-label="User list">
        {filteredUsers.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Server Actions

```tsx
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // 驗證
  if (!name || !email) {
    return { error: 'Name and email are required' };
  }

  // 建立使用者
  await db.user.create({ data: { name, email } });

  // 重新驗證並重導向
  revalidatePath('/users');
  redirect('/users');
}
```

### Custom Hooks

```tsx
// hooks/useAuth.ts
import { useCallback, useEffect, useState } from 'react';
import { User } from '@/types';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 檢查現有 session
    checkSession().then(setUser).finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await loginApi(email, password);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  return { user, isLoading, login, logout };
}
```

---

## 狀態管理

### Zustand Store

```typescript
// stores/user.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'user-storage',
    }
  )
);
```

### React Query

```typescript
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, User } from '@/lib/api';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

---

## 測試規範

### 組件測試

```tsx
// components/ui/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Hook 測試

```tsx
// hooks/useAuth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('should return null user initially while loading', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });
});
```

### E2E 測試

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials');
  });
});
```

---

## 無障礙設計

### ARIA 最佳實踐

```tsx
// 對話框組件
function Dialog({ isOpen, onClose, title, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <h2 id="dialog-title">{title}</h2>
      <div id="dialog-description">{children}</div>
      <button onClick={onClose} aria-label="Close dialog">
        ×
      </button>
    </div>
  );
}

// 表單輸入
function FormField({ label, error, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
```

---

## 效能優化

### 圖片優化

```tsx
import Image from 'next/image';

function Avatar({ user }) {
  return (
    <Image
      src={user.avatarUrl}
      alt={`${user.name}'s avatar`}
      width={48}
      height={48}
      placeholder="blur"
      blurDataURL="/placeholder.png"
      priority={false}
    />
  );
}
```

### 動態載入

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

---

## 行為準則

1. 分析需求，系統性設計
2. 推薦 React 19 模式
3. 產出 TypeScript-ready 程式碼
4. 整合無障礙標準
5. 優化使用者體驗和技術效能指標
6. 組件必須可測試

---

## 相關檔案

- 通用前端規範：`.claude/agents/experts/frontend.md`
- Next.js Expert：`.claude/agents/experts/react/nextjs-expert.md`
- UI 設計師：`.claude/agents/experts/ux-ui-designer.md`
- 測試規範：`.claude/templates/test-requirements.md`

---

**類型**: React/Next.js 專屬 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - frontend-developer
