# TypeScript Pro Expert

> TypeScript 進階開發規範。涵蓋進階類型系統、企業級模式、Node.js 後端開發。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) 並根據專案需求調整

---

## 適用時機

當 `tech_stack.backend.language` 為 `node` 且使用 TypeScript 時，由 `backend.md` 自動引用此 Expert。

---

## 核心能力

### 進階類型系統

- 泛型（Generics）與約束
- 條件類型（Conditional Types）
- 映射類型（Mapped Types）
- 模板字面量類型（Template Literal Types）
- 型別推斷優化
- 裝飾器（Decorators）
- 模組組織

### 開發方法論

- 善用嚴格類型檢查
- 使用泛型實現最大安全性
- 當實作透明時優先使用類型推斷
- 設計穩健的介面
- 實作類型化的錯誤處理

---

## 架構模式

### Clean Architecture in Node.js

```text
src/
├── domain/              # 領域層
│   ├── entities/
│   │   └── user.entity.ts
│   └── errors/
│       └── domain.error.ts
├── application/         # 應用層
│   ├── services/
│   │   └── user.service.ts
│   └── interfaces/
│       └── user.repository.ts
├── infrastructure/      # 基礎設施層
│   ├── database/
│   │   └── prisma/
│   │       └── user.repository.ts
│   └── http/
│       └── controllers/
│           └── user.controller.ts
└── main.ts
```

### 實體定義

```typescript
// domain/entities/user.entity.ts
export interface User {
  readonly id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
```

### Repository 介面

```typescript
// application/interfaces/user.repository.ts
import { User, CreateUserInput, UpdateUserInput } from '@/domain/entities/user.entity';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}
```

---

## Web 框架

### 框架選擇（依 `tech_stack.backend.framework`）

| 框架 | 適用場景 | 特點 |
|------|---------|------|
| **NestJS** | 企業級 | 模組化、DI、完整生態 |
| **Express** | 通用 | 簡單、彈性、大量中介軟體 |
| **Fastify** | 高效能 | 快速、Schema 驗證 |
| **Hono** | 邊緣運算 | 輕量、跨平台 |

### NestJS Controller 範例

```typescript
// infrastructure/http/controllers/user.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from '@/application/services/user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.userService.delete(id);
  }
}
```

### Express Controller 範例

```typescript
// infrastructure/http/controllers/user.controller.ts
import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '@/application/services/user.service';

export function createUserController(userService: UserService): Router {
  const router = Router();

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.create(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
```

---

## ORM 與資料庫

### ORM 選擇（依 `tech_stack.backend.orm`）

| ORM | 適用場景 | 特點 |
|-----|---------|------|
| **Prisma** | 現代專案 | 類型安全、Schema-first |
| **TypeORM** | 傳統 OOP | Decorator-based |
| **Drizzle** | 效能優先 | SQL-like、輕量 |

### Prisma Repository 實作

```typescript
// infrastructure/database/prisma/user.repository.ts
import { PrismaClient } from '@prisma/client';
import { UserRepository } from '@/application/interfaces/user.repository';
import { User, CreateUserInput, UpdateUserInput } from '@/domain/entities/user.entity';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
```

---

## 進階類型技巧

### 自訂工具類型

```typescript
// types/utils.ts

// 將所有屬性設為可選的深層版本
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 選擇非 null 的屬性
type NonNullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

// API 回應包裝
type ApiResponse<T> = {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
};

// 從函數取得回傳類型（包含 Promise unwrap）
type Awaited<T> = T extends Promise<infer U> ? U : T;
type ServiceReturn<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
```

### 類型守衛

```typescript
// types/guards.ts
import { User } from '@/domain/entities/user.entity';

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    typeof (obj as User).id === 'string' &&
    typeof (obj as User).email === 'string'
  );
}

export function assertUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error('Invalid user object');
  }
}
```

---

## 測試規範

### 測試命名規範

```typescript
// describe + it
describe('UserService', () => {
  describe('create', () => {
    it('should create user successfully', async () => {});
    it('should throw error for duplicate email', async () => {});
  });

  describe('findById', () => {
    it('should return user when found', async () => {});
    it('should return null when not found', async () => {});
  });
});
```

### Jest/Vitest 測試範例

```typescript
// tests/user.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '@/application/services/user.service';
import { UserRepository } from '@/application/interfaces/user.repository';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    userService = new UserService(mockRepository);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const expectedUser = { id: '1', email: 'test@example.com', name: 'Test' };
      mockRepository.findById.mockResolvedValue(expectedUser);

      const result = await userService.findById('1');

      expect(result).toEqual(expectedUser);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should return null when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await userService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

### 覆蓋率檢查

```bash
# Vitest
pnpm test:coverage

# Jest
pnpm jest --coverage
```

---

## TSConfig 設定

### 嚴格模式建議設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 行為準則

1. 強類型程式碼，包含完整介面
2. 泛型函數包含適當約束
3. 自訂工具類型提高可重用性
4. Jest/Vitest 測試包含正確的類型斷言
5. 優化 TSConfig 設定
6. 為外部函式庫建立類型宣告檔
7. TSDoc 註釋提供完整文檔

---

## 相關檔案

- 通用後端規範：`.claude/agents/experts/backend.md`
- 前端開發：`.claude/agents/experts/react/frontend-developer.md`
- 測試規範：`.claude/templates/test-requirements.md`

---

**類型**: TypeScript 專屬 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - typescript-pro
