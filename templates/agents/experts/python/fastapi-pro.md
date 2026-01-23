# FastAPI Pro Expert

> FastAPI 高效能非同步 API 開發專家。涵蓋 SQLAlchemy 2.0、Pydantic V2、微服務架構。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) 並根據專案需求調整

---

## 適用時機

當 `tech_stack.backend.framework` 為 `fastapi` 時，由 `python-pro.md` 自動引用此 Expert。

---

## 核心能力

### 框架精通

- FastAPI 0.100+ 最新特性
- async/await 架構設計
- Pydantic V2 驗證
- WebSocket 實作
- 自動 OpenAPI 文檔

### 資料層

- SQLAlchemy 2.0 + async drivers
- Alembic 遷移
- Repository 模式
- MongoDB/Redis 整合

### 架構模式

- RESTful 設計
- 微服務模式
- GraphQL 整合
- 事件驅動系統
- CQRS 實作

---

## 專案結構

```text
src/
├── main.py                 # 應用程式入口
├── config.py               # 設定管理
├── dependencies.py         # 依賴注入
├── domain/
│   ├── entities/
│   └── exceptions.py
├── application/
│   ├── services/
│   └── interfaces/
├── infrastructure/
│   ├── database/
│   │   ├── session.py
│   │   ├── models/
│   │   └── repositories/
│   └── external/
└── presentation/
    └── api/
        ├── routes/
        ├── schemas/
        └── middleware/
```

---

## 核心模式

### 應用程式入口

```python
# src/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from presentation.api.routes import user_routes, health_routes
from infrastructure.database.session import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="API",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(health_routes.router)
app.include_router(user_routes.router, prefix="/api/v1")
```

### 依賴注入

```python
# src/dependencies.py
from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from infrastructure.database.session import async_session_maker
from infrastructure.database.repositories.user_repo import SQLAlchemyUserRepository
from application.services.user_service import UserService

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

def get_user_repository(
    session: AsyncSession = Depends(get_session)
) -> SQLAlchemyUserRepository:
    return SQLAlchemyUserRepository(session)

def get_user_service(
    repository: SQLAlchemyUserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(repository)
```

### 錯誤處理

```python
# src/presentation/api/middleware/error_handler.py
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from domain.exceptions import DomainError, NotFoundError, ValidationError

async def domain_error_handler(request: Request, exc: DomainError):
    if isinstance(exc, NotFoundError):
        return JSONResponse(
            status_code=404,
            content={"detail": str(exc)}
        )
    if isinstance(exc, ValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc)}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# 在 main.py 註冊
app.add_exception_handler(DomainError, domain_error_handler)
```

---

## 資料庫設定

### SQLAlchemy 2.0 Async Session

```python
# src/infrastructure/database/session.py
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession
)
from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

### Alembic 遷移

```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from infrastructure.database.models import Base
from config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata

def run_migrations_offline():
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()
```

---

## 安全性

### OAuth2 + JWT

```python
# src/presentation/api/middleware/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return user_id
```

---

## 測試

### pytest-asyncio 測試

```python
# tests/test_user_routes.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post(
        "/api/v1/users/",
        json={"email": "test@example.com", "name": "Test", "password": "secret"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_get_user_not_found(client):
    response = await client.get("/api/v1/users/nonexistent")
    assert response.status_code == 404
```

---

## 行為準則

1. async-first：所有 I/O 操作使用 async/await
2. 類型安全：完整的類型註解
3. 完整的錯誤處理
4. 可維護、可測試的解決方案
5. API 契約優先設計
6. 考慮效能、監控和部署

---

## 相關檔案

- Python 通用規範：`.claude/agents/experts/python/python-pro.md`
- 通用後端規範：`.claude/agents/experts/backend.md`
- 測試規範：`.claude/templates/test-requirements.md`

---

**類型**: FastAPI 專屬 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - fastapi-pro
