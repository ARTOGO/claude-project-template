# Python Pro Expert

> Python 3.12+ 專業開發規範。涵蓋現代 Python 特性、非同步程式設計、效能優化、生產環境最佳實踐。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) 並根據專案需求調整

---

## 適用時機

當 `tech_stack.backend.language` 為 `python` 時，由 `backend.md` 自動引用此 Expert。

---

## 核心能力

### 現代 Python 特性

- Python 3.12+ 語法和新特性
- async/await 非同步程式設計模式
- Type Hints 類型提示
- Structural Pattern Matching（match/case）
- 進階 OOP：描述器、元類
- Context Managers 和 Generators
- Decorators 和 Functools

### 開發工具

- **uv**：現代套件管理（比 pip 快）
- **ruff**：程式碼品質（取代 flake8、isort、black）
- **pyright**：類型檢查
- **pyproject.toml**：統一專案配置

### 效能優化

- cProfile 和 py-spy 效能分析
- 非同步操作優化
- Multiprocessing 和 Concurrent.futures
- 記憶體優化技術
- Cython 和 Numba 加速

---

## 架構模式

### Clean Architecture in Python

```text
src/
├── domain/              # 領域層
│   ├── entities/
│   │   └── user.py
│   └── exceptions.py
├── application/         # 應用層
│   ├── services/
│   │   └── user_service.py
│   └── interfaces/
│       └── user_repository.py
├── infrastructure/      # 基礎設施層
│   ├── database/
│   │   └── user_repo.py
│   └── external/
└── presentation/        # 介面層
    └── api/
        └── routes/
            └── user_routes.py
```

### Repository 介面

```python
# application/interfaces/user_repository.py
from abc import ABC, abstractmethod
from typing import Optional
from domain.entities.user import User

class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def create(self, user: User) -> User:
        pass

    @abstractmethod
    async def update(self, user: User) -> User:
        pass
```

---

## Web 框架

### 框架選擇（依 `tech_stack.backend.framework`）

| 框架 | 適用場景 | 特點 |
|------|---------|------|
| **FastAPI** | 現代 API | 自動 OpenAPI、高效能、類型安全 |
| **Django** | 全功能 Web | ORM、Admin、完整生態系 |
| **Flask** | 微框架 | 彈性、輕量 |

### FastAPI 範例

```python
# presentation/api/routes/user_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from application.services.user_service import UserService
from presentation.api.schemas.user import UserResponse, UserCreate

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    service: UserService = Depends(get_user_service)
) -> UserResponse:
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse.model_validate(user)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_user_service)
) -> UserResponse:
    user = await service.create(user_data.model_dump())
    return UserResponse.model_validate(user)
```

### Pydantic V2 Schema

```python
# presentation/api/schemas/user.py
from pydantic import BaseModel, EmailStr, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str

    model_config = ConfigDict(from_attributes=True)
```

---

## 資料庫與 ORM

### ORM 選擇（依 `tech_stack.backend.orm`）

| ORM | 適用場景 | 特點 |
|-----|---------|------|
| **SQLAlchemy 2.0** | 通用 | 強大、支援 async |
| **Django ORM** | Django 專案 | 整合度高 |
| **Tortoise ORM** | 純 async | 簡潔、Django-like |

### SQLAlchemy 2.0 Async 範例

```python
# infrastructure/database/user_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from application.interfaces.user_repository import UserRepository
from domain.entities.user import User
from infrastructure.database.models import UserModel

class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return User.from_orm(model) if model else None

    async def create(self, user: User) -> User:
        model = UserModel(**user.model_dump())
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return User.from_orm(model)
```

---

## 測試規範

### 測試命名規範

```python
# test_<module>_<scenario>
def test_user_service_create_success():
    pass

def test_user_service_create_duplicate_email():
    pass

def test_user_service_create_invalid_input():
    pass
```

### pytest 測試範例

```python
# tests/test_user_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from application.services.user_service import UserService
from domain.entities.user import User

@pytest.fixture
def mock_repository():
    return AsyncMock()

@pytest.fixture
def user_service(mock_repository):
    return UserService(repository=mock_repository)

@pytest.mark.asyncio
async def test_get_user_success(user_service, mock_repository):
    # Arrange
    expected_user = User(id="123", email="test@example.com", name="Test")
    mock_repository.get_by_id.return_value = expected_user

    # Act
    result = await user_service.get_by_id("123")

    # Assert
    assert result == expected_user
    mock_repository.get_by_id.assert_called_once_with("123")

@pytest.mark.asyncio
async def test_get_user_not_found(user_service, mock_repository):
    # Arrange
    mock_repository.get_by_id.return_value = None

    # Act
    result = await user_service.get_by_id("nonexistent")

    # Assert
    assert result is None
```

### 覆蓋率檢查

```bash
# 執行測試並產生覆蓋率報告
pytest --cov=src --cov-report=term-missing

# HTML 報告
pytest --cov=src --cov-report=html
```

---

## DevOps 與部署

### Docker 多階段建置

```dockerfile
# Build stage
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Runtime stage
FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY src ./src
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 健康檢查端點

```python
# presentation/api/routes/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from infrastructure.database.session import get_session

router = APIRouter(tags=["health"])

@router.get("/health/live")
async def liveness():
    return {"status": "ok"}

@router.get("/health/ready")
async def readiness(session: AsyncSession = Depends(get_session)):
    try:
        await session.execute("SELECT 1")
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}, 503
```

---

## 程式碼風格

### Ruff 設定

```toml
# pyproject.toml
[tool.ruff]
target-version = "py312"
line-length = 88

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # pyflakes
    "I",      # isort
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "UP",     # pyupgrade
]
ignore = ["E501"]  # line too long (handled by formatter)

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### 執行 Lint

```bash
# 檢查
ruff check .

# 自動修復
ruff check --fix .

# 格式化
ruff format .
```

---

## 行為準則

1. 所有函數和方法都要有 Type Hints
2. 測試覆蓋率 > 90%
3. 遵循 PEP 8 規範
4. 安全優先（避免 SQL injection、XSS 等）
5. 完整的文檔（docstrings）
6. 使用 async/await 處理 I/O 操作
7. 明確的錯誤處理和日誌記錄
8. 依賴注入提高可測試性

---

## 相關檔案

- 通用後端規範：`.claude/agents/experts/backend.md`
- FastAPI Expert：`.claude/agents/experts/python/fastapi-pro.md`
- 測試規範：`.claude/templates/test-requirements.md`
- TDD 流程：`.claude/commands/tdd.md`

---

**類型**: Python 專屬 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - python-pro
