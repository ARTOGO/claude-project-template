# .NET/C# Pro Expert

> C# 後端開發專家。專精現代 C#、ASP.NET Core、Entity Framework、.NET 最佳實踐。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) - csharp-pro 並根據專案需求擴展

---

## 適用時機

當 `project.yaml` 的 `tech_stack.backend.language` 為 `csharp` 或 `dotnet` 時，由 `backend.md` 引用。

---

## 核心能力

### 現代 C#（12+）

- Records 與 record structs
- Primary constructors
- Collection expressions
- Pattern matching（switch expressions、list patterns）
- Required properties
- File-scoped namespaces

### ASP.NET Core

- Minimal APIs
- Controller-based APIs
- Middleware pipeline
- Dependency injection
- Configuration system

### Entity Framework Core

- Code-first migrations
- LINQ queries
- Change tracking
- 效能最佳化

### 非同步程式設計

- `async`/`await` patterns
- `Task` 與 `ValueTask`
- `IAsyncEnumerable`
- Cancellation tokens

---

## ASP.NET Core Minimal API

```csharp
var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Endpoints
var users = app.MapGroup("/api/v1/users");

users.MapGet("/", async (IUserService service, int page = 1, int size = 20) =>
    await service.GetAllAsync(page, size));

users.MapGet("/{id:long}", async (long id, IUserService service) =>
    await service.GetByIdAsync(id) is User user
        ? Results.Ok(user.ToResponse())
        : Results.NotFound());

users.MapPost("/", async (CreateUserRequest request, IUserService service) =>
{
    var user = await service.CreateAsync(request);
    return Results.Created($"/api/v1/users/{user.Id}", user.ToResponse());
});

users.MapPut("/{id:long}", async (long id, UpdateUserRequest request, IUserService service) =>
    await service.UpdateAsync(id, request) is User user
        ? Results.Ok(user.ToResponse())
        : Results.NotFound());

users.MapDelete("/{id:long}", async (long id, IUserService service) =>
{
    await service.DeleteAsync(id);
    return Results.NoContent();
});

app.Run();
```

---

## Controller-based API

```csharp
[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserResponse>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        CancellationToken ct = default)
    {
        var users = await _userService.GetAllAsync(page, size, ct);
        return Ok(users);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<UserResponse>> GetUser(long id, CancellationToken ct)
    {
        var user = await _userService.GetByIdAsync(id, ct);
        return user is null ? NotFound() : Ok(user.ToResponse());
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> CreateUser(
        [FromBody] CreateUserRequest request,
        CancellationToken ct)
    {
        var user = await _userService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user.ToResponse());
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<UserResponse>> UpdateUser(
        long id,
        [FromBody] UpdateUserRequest request,
        CancellationToken ct)
    {
        var user = await _userService.UpdateAsync(id, request, ct);
        return user is null ? NotFound() : Ok(user.ToResponse());
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteUser(long id, CancellationToken ct)
    {
        await _userService.DeleteAsync(id, ct);
        return NoContent();
    }
}
```

---

## DTOs（使用 Records）

```csharp
// Request DTOs
public record CreateUserRequest(
    [Required] string Name,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password
);

public record UpdateUserRequest(
    [Required] string Name,
    [EmailAddress] string? Email
);

// Response DTOs
public record UserResponse(
    long Id,
    string Name,
    string Email,
    DateTime CreatedAt
)
{
    public static UserResponse From(User user) => new(
        user.Id,
        user.Name,
        user.Email,
        user.CreatedAt
    );
}

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
```

---

## Entity Framework Core

### Entity

```csharp
public class User
{
    public long Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    
    public UserResponse ToResponse() => UserResponse.From(this);
}
```

### DbContext

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    
    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
        
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Orders)
                  .HasForeignKey(e => e.UserId);
        });
    }
    
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<User>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
```

### Repository Pattern

```csharp
public interface IUserRepository
{
    Task<User?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<PagedResult<User>> GetAllAsync(int page, int size, CancellationToken ct = default);
    Task<User> AddAsync(User user, CancellationToken ct = default);
    Task UpdateAsync(User user, CancellationToken ct = default);
    Task DeleteAsync(long id, CancellationToken ct = default);
    Task<bool> ExistsAsync(string email, CancellationToken ct = default);
}

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;
    
    public UserRepository(AppDbContext context)
    {
        _context = context;
    }
    
    public async Task<User?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        return await _context.Users.FindAsync(new object[] { id }, ct);
    }
    
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email, ct);
    }
    
    public async Task<PagedResult<User>> GetAllAsync(int page, int size, CancellationToken ct = default)
    {
        var totalCount = await _context.Users.CountAsync(ct);
        var items = await _context.Users
            .OrderBy(u => u.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);
        
        return new PagedResult<User>(items, totalCount, page, size);
    }
    
    public async Task<User> AddAsync(User user, CancellationToken ct = default)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);
        return user;
    }
    
    public async Task UpdateAsync(User user, CancellationToken ct = default)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync(ct);
    }
    
    public async Task DeleteAsync(long id, CancellationToken ct = default)
    {
        await _context.Users.Where(u => u.Id == id).ExecuteDeleteAsync(ct);
    }
    
    public async Task<bool> ExistsAsync(string email, CancellationToken ct = default)
    {
        return await _context.Users.AnyAsync(u => u.Email == email, ct);
    }
}
```

---

## Service Layer

```csharp
public interface IUserService
{
    Task<User?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<PagedResult<UserResponse>> GetAllAsync(int page, int size, CancellationToken ct = default);
    Task<User> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<User?> UpdateAsync(long id, UpdateUserRequest request, CancellationToken ct = default);
    Task DeleteAsync(long id, CancellationToken ct = default);
}

public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly IPasswordHasher<User> _passwordHasher;
    
    public UserService(IUserRepository repository, IPasswordHasher<User> passwordHasher)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
    }
    
    public async Task<User?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        return await _repository.GetByIdAsync(id, ct);
    }
    
    public async Task<PagedResult<UserResponse>> GetAllAsync(int page, int size, CancellationToken ct = default)
    {
        var result = await _repository.GetAllAsync(page, size, ct);
        return new PagedResult<UserResponse>(
            result.Items.Select(u => u.ToResponse()).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize
        );
    }
    
    public async Task<User> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        if (await _repository.ExistsAsync(request.Email, ct))
        {
            throw new DuplicateEmailException(request.Email);
        }
        
        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(null!, request.Password),
            CreatedAt = DateTime.UtcNow
        };
        
        return await _repository.AddAsync(user, ct);
    }
    
    public async Task<User?> UpdateAsync(long id, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await _repository.GetByIdAsync(id, ct);
        if (user is null) return null;
        
        user.Name = request.Name;
        if (request.Email is not null)
        {
            user.Email = request.Email;
        }
        
        await _repository.UpdateAsync(user, ct);
        return user;
    }
    
    public async Task DeleteAsync(long id, CancellationToken ct = default)
    {
        await _repository.DeleteAsync(id, ct);
    }
}
```

---

## 例外處理

```csharp
public class DuplicateEmailException : Exception
{
    public DuplicateEmailException(string email) 
        : base($"Email already exists: {email}") { }
}

public class NotFoundException : Exception
{
    public NotFoundException(string entityName, object id)
        : base($"{entityName} not found: {id}") { }
}

// Global exception handler middleware
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    
    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }
    
    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, response) = exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, 
                new ErrorResponse("NOT_FOUND", exception.Message)),
            DuplicateEmailException => (StatusCodes.Status409Conflict, 
                new ErrorResponse("DUPLICATE", exception.Message)),
            ValidationException ve => (StatusCodes.Status400BadRequest, 
                new ErrorResponse("VALIDATION_ERROR", ve.Message)),
            _ => (StatusCodes.Status500InternalServerError, 
                new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
        };
        
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(response);
    }
}

public record ErrorResponse(string Code, string Message);
```

---

## 測試

### Unit Test

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _repositoryMock;
    private readonly Mock<IPasswordHasher<User>> _passwordHasherMock;
    private readonly UserService _service;
    
    public UserServiceTests()
    {
        _repositoryMock = new Mock<IUserRepository>();
        _passwordHasherMock = new Mock<IPasswordHasher<User>>();
        _service = new UserService(_repositoryMock.Object, _passwordHasherMock.Object);
    }
    
    [Fact]
    public async Task CreateAsync_ShouldCreateUser_WhenEmailNotExists()
    {
        // Arrange
        var request = new CreateUserRequest("John", "john@example.com", "password123");
        _repositoryMock.Setup(r => r.ExistsAsync(request.Email, default)).ReturnsAsync(false);
        _passwordHasherMock.Setup(p => p.HashPassword(It.IsAny<User>(), request.Password))
            .Returns("hashed");
        _repositoryMock.Setup(r => r.AddAsync(It.IsAny<User>(), default))
            .ReturnsAsync((User u, CancellationToken _) => { u.Id = 1; return u; });
        
        // Act
        var result = await _service.CreateAsync(request);
        
        // Assert
        Assert.Equal(1, result.Id);
        Assert.Equal("John", result.Name);
        Assert.Equal("john@example.com", result.Email);
        _repositoryMock.Verify(r => r.AddAsync(It.IsAny<User>(), default), Times.Once);
    }
    
    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenEmailExists()
    {
        // Arrange
        var request = new CreateUserRequest("John", "existing@example.com", "password123");
        _repositoryMock.Setup(r => r.ExistsAsync(request.Email, default)).ReturnsAsync(true);
        
        // Act & Assert
        await Assert.ThrowsAsync<DuplicateEmailException>(
            () => _service.CreateAsync(request));
    }
}
```

### Integration Test

```csharp
public class UsersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    
    public UsersControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }
    
    [Fact]
    public async Task CreateUser_ShouldReturn201()
    {
        // Arrange
        var request = new CreateUserRequest("John", "john@example.com", "password123");
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/users", request);
        
        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserResponse>();
        Assert.NotNull(user);
        Assert.Equal("John", user.Name);
    }
}
```

---

## 專案結構

```text
src/
├── MyApp.Api/
│   ├── Program.cs
│   ├── Controllers/
│   ├── Middleware/
│   └── appsettings.json
├── MyApp.Application/
│   ├── Services/
│   ├── DTOs/
│   └── Interfaces/
├── MyApp.Domain/
│   ├── Entities/
│   └── Exceptions/
└── MyApp.Infrastructure/
    ├── Data/
    │   ├── AppDbContext.cs
    │   └── Repositories/
    └── Migrations/
tests/
├── MyApp.UnitTests/
└── MyApp.IntegrationTests/
```

---

## 相關檔案

- 通用後端規範：`.claude/agents/experts/backend.md`
- 資料庫專家：`.claude/agents/experts/database.md`
- TDD 協調器：`.claude/agents/workers/tdd-orchestrator.md`

---

**類型**: C#/.NET 語言 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - csharp-pro
