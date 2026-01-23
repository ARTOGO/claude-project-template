# Rust Pro Expert

> Rust 系統程式設計專家。專精記憶體安全、所有權模式、並發程式設計、效能最佳化。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) - rust-pro 並根據專案需求擴展

---

## 適用時機

當 `project.yaml` 的 `tech_stack.backend.language` 為 `rust` 時，由 `backend.md` 引用。

---

## 核心能力

### 所有權系統

- Ownership、Borrowing、Lifetimes
- Move semantics
- Copy vs Clone traits
- Interior mutability（RefCell、Cell）

### 並發程式設計

- `std::thread` 與 thread pools
- `async`/`await` 非同步程式設計
- Tokio / async-std runtime
- `Arc`、`Mutex`、`RwLock`
- Channel-based 通訊（mpsc、crossbeam）

### 錯誤處理

- `Result<T, E>` 與 `Option<T>`
- `?` 運算子與錯誤傳播
- 自訂錯誤類型（thiserror、anyhow）
- Panic vs recoverable errors

### 效能最佳化

- Zero-cost abstractions
- 編譯期優化
- SIMD 與 vectorization
- Memory layout 優化
- Profiling（perf、flamegraph）

---

## Web 框架

### Actix-web

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct User {
    id: u64,
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct CreateUserRequest {
    name: String,
    email: String,
}

async fn create_user(
    body: web::Json<CreateUserRequest>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let user = User {
        id: 1, // 實際應從 DB 取得
        name: body.name.clone(),
        email: body.email.clone(),
    };
    
    HttpResponse::Created().json(user)
}

async fn get_user(path: web::Path<u64>) -> impl Responder {
    let user_id = path.into_inner();
    // 查詢資料庫...
    HttpResponse::Ok().json(User {
        id: user_id,
        name: "John".to_string(),
        email: "john@example.com".to_string(),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/users", web::post().to(create_user))
            .route("/users/{id}", web::get().to(get_user))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Axum

```rust
use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
}

#[derive(Serialize, Deserialize)]
struct User {
    id: u64,
    name: String,
}

#[derive(Deserialize)]
struct CreateUser {
    name: String,
}

async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateUser>,
) -> Json<User> {
    let user = User {
        id: 1,
        name: payload.name,
    };
    Json(user)
}

async fn get_user(Path(user_id): Path<u64>) -> Json<User> {
    Json(User {
        id: user_id,
        name: "John".to_string(),
    })
}

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState {
        pool: create_pool().await,
    });

    let app = Router::new()
        .route("/users", post(create_user))
        .route("/users/:id", get(get_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

---

## ORM / 資料庫存取

### SQLx（編譯期驗證）

```rust
use sqlx::{PgPool, FromRow};

#[derive(FromRow)]
struct User {
    id: i64,
    name: String,
    email: String,
}

async fn get_user_by_id(pool: &PgPool, id: i64) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as!(
        User,
        r#"SELECT id, name, email FROM users WHERE id = $1"#,
        id
    )
    .fetch_optional(pool)
    .await
}

async fn create_user(pool: &PgPool, name: &str, email: &str) -> Result<User, sqlx::Error> {
    sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (name, email)
        VALUES ($1, $2)
        RETURNING id, name, email
        "#,
        name,
        email
    )
    .fetch_one(pool)
    .await
}
```

### Diesel

```rust
use diesel::prelude::*;

#[derive(Queryable, Selectable)]
#[diesel(table_name = users)]
struct User {
    id: i32,
    name: String,
    email: String,
}

#[derive(Insertable)]
#[diesel(table_name = users)]
struct NewUser<'a> {
    name: &'a str,
    email: &'a str,
}

fn create_user(conn: &mut PgConnection, name: &str, email: &str) -> QueryResult<User> {
    let new_user = NewUser { name, email };
    
    diesel::insert_into(users::table)
        .values(&new_user)
        .returning(User::as_returning())
        .get_result(conn)
}
```

### SeaORM

```rust
use sea_orm::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub email: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

async fn create_user(db: &DatabaseConnection, name: String, email: String) -> Result<Model, DbErr> {
    let user = ActiveModel {
        name: Set(name),
        email: Set(email),
        ..Default::default()
    };
    
    user.insert(db).await
}
```

---

## 錯誤處理模式

### 自訂錯誤類型（thiserror）

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("User not found: {0}")]
    UserNotFound(i64),
    
    #[error("Database error")]
    Database(#[from] sqlx::Error),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Unauthorized")]
    Unauthorized,
}

impl actix_web::ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::UserNotFound(_) => HttpResponse::NotFound().json(json!({
                "error": self.to_string()
            })),
            AppError::Validation(_) => HttpResponse::BadRequest().json(json!({
                "error": self.to_string()
            })),
            AppError::Unauthorized => HttpResponse::Unauthorized().finish(),
            AppError::Database(_) => HttpResponse::InternalServerError().json(json!({
                "error": "Internal server error"
            })),
        }
    }
}
```

### 使用 anyhow（應用層）

```rust
use anyhow::{Context, Result};

async fn process_order(order_id: i64) -> Result<()> {
    let order = fetch_order(order_id)
        .await
        .context("Failed to fetch order")?;
    
    validate_order(&order)
        .context("Order validation failed")?;
    
    process_payment(&order)
        .await
        .context("Payment processing failed")?;
    
    Ok(())
}
```

---

## 並發模式

### Tokio 非同步

```rust
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};

async fn producer(tx: mpsc::Sender<i32>) {
    for i in 0..10 {
        tx.send(i).await.unwrap();
        sleep(Duration::from_millis(100)).await;
    }
}

async fn consumer(mut rx: mpsc::Receiver<i32>) {
    while let Some(value) = rx.recv().await {
        println!("Received: {}", value);
    }
}

#[tokio::main]
async fn main() {
    let (tx, rx) = mpsc::channel(32);
    
    tokio::spawn(producer(tx));
    consumer(rx).await;
}
```

### 並行處理

```rust
use futures::future::join_all;

async fn fetch_all_users(ids: Vec<i64>) -> Vec<User> {
    let futures: Vec<_> = ids
        .into_iter()
        .map(|id| fetch_user(id))
        .collect();
    
    join_all(futures)
        .await
        .into_iter()
        .filter_map(|r| r.ok())
        .collect()
}
```

---

## 測試模式

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_create_user() {
        let pool = setup_test_db().await;
        
        let user = create_user(&pool, "John", "john@example.com")
            .await
            .expect("Failed to create user");
        
        assert_eq!(user.name, "John");
        assert_eq!(user.email, "john@example.com");
    }

    #[test]
    async fn test_get_nonexistent_user() {
        let pool = setup_test_db().await;
        
        let result = get_user_by_id(&pool, 99999).await;
        
        assert!(result.unwrap().is_none());
    }
}

// Property-based testing with proptest
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_parse_email(email in "[a-z]+@[a-z]+\\.[a-z]+") {
        let result = parse_email(&email);
        prop_assert!(result.is_ok());
    }
}
```

---

## 專案結構

```text
src/
├── main.rs
├── lib.rs
├── config.rs
├── error.rs
├── domain/
│   ├── mod.rs
│   ├── user.rs
│   └── order.rs
├── repository/
│   ├── mod.rs
│   ├── user_repository.rs
│   └── order_repository.rs
├── service/
│   ├── mod.rs
│   ├── user_service.rs
│   └── order_service.rs
├── handler/
│   ├── mod.rs
│   ├── user_handler.rs
│   └── order_handler.rs
└── middleware/
    ├── mod.rs
    └── auth.rs
```

---

## Cargo.toml 範例

```toml
[package]
name = "my-api"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework
axum = "0.7"
tokio = { version = "1", features = ["full"] }

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Error handling
thiserror = "1"
anyhow = "1"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Configuration
config = "0.14"

[dev-dependencies]
tokio-test = "0.4"
proptest = "1"
```

---

## 最佳實踐

### 1. 優先使用借用而非所有權轉移

```rust
// ✅ 好：借用
fn process(data: &str) -> String {
    data.to_uppercase()
}

// ❌ 避免：不必要的所有權轉移
fn process(data: String) -> String {
    data.to_uppercase()
}
```

### 2. 使用 `?` 進行錯誤傳播

```rust
// ✅ 好
fn read_config() -> Result<Config, Error> {
    let content = fs::read_to_string("config.toml")?;
    let config: Config = toml::from_str(&content)?;
    Ok(config)
}
```

### 3. 使用 `clippy` 靜態分析

```bash
cargo clippy -- -D warnings
```

### 4. 使用 `rustfmt` 格式化

```bash
cargo fmt
```

---

## 相關檔案

- 通用後端規範：`.claude/agents/experts/backend.md`
- 資料庫專家：`.claude/agents/experts/database.md`
- TDD 協調器：`.claude/agents/workers/tdd-orchestrator.md`

---

**類型**: Rust 語言 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - rust-pro
