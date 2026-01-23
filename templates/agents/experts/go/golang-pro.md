# Go Pro Expert

> Go 1.21+ 專業開發規範。涵蓋現代 Go 特性、並發模式、效能優化、生產環境最佳實踐。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) 並根據專案需求調整

---

## 適用時機

當 `tech_stack.backend.language` 為 `go` 時，由 `backend.md` 自動引用此 Expert。

---

## 核心能力

### 現代 Go 語言特性

- Go 1.21+ 特性：改進的類型推斷、編譯器優化
- 泛型（Type Parameters）：類型安全、可重用的程式碼
- Go Workspaces：多模組開發
- Context 套件：取消和超時處理
- Embed 指令：將檔案嵌入二進位檔
- 新的錯誤處理模式和錯誤包裝
- 進階反射和運行時優化
- 記憶體管理和垃圾回收器理解

### 並發與平行處理

- Goroutine 生命週期管理和最佳實踐
- Channel 模式：fan-in、fan-out、worker pools、pipeline
- Select 語句和非阻塞 channel 操作
- Context 取消和優雅關閉模式
- Sync 套件：mutexes、wait groups、condition variables
- 記憶體模型理解和 race condition 預防
- Lock-free 程式設計和原子操作
- 並發系統中的錯誤處理

### 效能與優化

- CPU 和記憶體分析：pprof、go tool trace
- 基準驅動優化和效能分析
- 記憶體洩漏檢測和預防
- 垃圾回收優化和調整
- CPU-bound vs I/O-bound 工作負載優化
- 快取策略和記憶體池
- 網路優化和連接池
- 資料庫效能優化

---

## 架構模式

### Clean Architecture in Go

```text
internal/
├── domain/           # 領域層（實體、值物件）
│   ├── user.go
│   └── errors.go
├── usecase/          # 應用層（業務邏輯）
│   └── user_service.go
├── repository/       # 資料存取介面
│   └── user_repository.go
├── handler/          # 介面層（HTTP、gRPC）
│   └── user_handler.go
└── infrastructure/   # 基礎設施（資料庫、外部服務）
    └── postgres/
        └── user_repo.go
```

### 介面設計原則

```go
// 小而專注的介面
type UserReader interface {
    GetByID(ctx context.Context, id string) (*User, error)
}

type UserWriter interface {
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
}

// 組合介面
type UserRepository interface {
    UserReader
    UserWriter
}
```

---

## Web 服務與 API

### 框架選擇（依 `tech_stack.backend.framework`）

| 框架 | 適用場景 | 特點 |
|------|---------|------|
| **Gin** | 通用 Web API | 高效能、中介軟體生態豐富 |
| **Echo** | RESTful API | 簡潔、支援 Swagger |
| **Fiber** | 高效能需求 | Express-like、最快 |
| **Chi** | 標準庫風格 | 輕量、可組合 |

### HTTP Handler 範例

```go
// handler/user_handler.go
type UserHandler struct {
    service usecase.UserService
}

func NewUserHandler(s usecase.UserService) *UserHandler {
    return &UserHandler{service: s}
}

func (h *UserHandler) GetUser(c *gin.Context) {
    ctx := c.Request.Context()
    id := c.Param("id")

    user, err := h.service.GetByID(ctx, id)
    if err != nil {
        if errors.Is(err, domain.ErrNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
        return
    }

    c.JSON(http.StatusOK, user)
}
```

---

## 資料庫與持久化

### ORM 選擇（依 `tech_stack.backend.orm`）

| ORM | 適用場景 | 特點 |
|-----|---------|------|
| **GORM** | 通用 | 功能完整、Auto Migration |
| **sqlx** | 效能優先 | 接近原生 SQL |
| **ent** | 型別安全 | 程式碼生成、Graph-based |

### Repository 模式

```go
// infrastructure/postgres/user_repo.go
type userRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) repository.UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
    var user domain.User
    if err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, domain.ErrNotFound
        }
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    return &user, nil
}
```

---

## 測試規範

### 測試命名規範

```go
// Test<Function>_<Scenario>
func TestUserService_Create_Success(t *testing.T) {}
func TestUserService_Create_DuplicateEmail(t *testing.T) {}
func TestUserService_Create_InvalidInput(t *testing.T) {}
```

### Table-Driven Tests

```go
func TestUserService_Validate(t *testing.T) {
    tests := []struct {
        name    string
        input   *domain.User
        wantErr bool
    }{
        {
            name:    "valid user",
            input:   &domain.User{Email: "test@example.com", Name: "Test"},
            wantErr: false,
        },
        {
            name:    "empty email",
            input:   &domain.User{Email: "", Name: "Test"},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateUser(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("validateUser() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### 覆蓋率檢查

```bash
# 執行測試並產生覆蓋率報告
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total

# HTML 報告
go tool cover -html=coverage.out -o coverage.html
```

---

## DevOps 與部署

### Docker 多階段建置

```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

### 健康檢查端點

```go
func (h *HealthHandler) Liveness(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *HealthHandler) Readiness(c *gin.Context) {
    // 檢查資料庫連線
    if err := h.db.Ping(); err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "ready"})
}
```

---

## 程式碼風格

### Linter 設定

使用 `golangci-lint` 進行程式碼檢查：

```yaml
# .golangci.yml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell

linters-settings:
  errcheck:
    check-blank: true
  govet:
    check-shadowing: true
```

### 執行 Lint

```bash
golangci-lint run ./...
```

---

## 行為準則

1. 遵循 Go 慣用語法和 Effective Go 原則
2. 強調簡潔和可讀性，而非技巧性
3. 使用介面進行抽象，組合優於繼承
4. 實作明確的錯誤處理，避免 panic/recover
5. 撰寫全面的測試，包括 table-driven tests
6. 優化可維護性和團隊協作
7. 充分利用 Go 標準庫
8. 以清晰簡潔的註釋文檔化程式碼
9. 專注於並發安全和 race condition 預防
10. 先測量效能再優化

---

## 相關檔案

- 通用後端規範：`.claude/agents/experts/backend.md`
- 測試規範：`.claude/templates/test-requirements.md`
- TDD 流程：`.claude/commands/tdd.md`

---

**類型**: Go 專屬 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - golang-pro
