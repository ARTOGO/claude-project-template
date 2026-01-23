# Java Pro Expert

> Java 後端開發專家。專精現代 Java、Stream API、並發程式設計、JVM 最佳化、Spring Boot。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) - java-pro 並根據專案需求擴展

---

## 適用時機

當 `project.yaml` 的 `tech_stack.backend.language` 為 `java` 時，由 `backend.md` 引用。

---

## 核心能力

### 現代 Java（17+）

- Records
- Sealed classes
- Pattern matching（instanceof、switch）
- Text blocks
- Virtual threads（Java 21+）

### Stream API

- 函數式資料處理
- Collectors
- Parallel streams
- Optional 處理

### 並發程式設計

- `CompletableFuture`
- `ExecutorService`
- `ForkJoinPool`
- Virtual threads（Project Loom）
- Structured concurrency

### JVM 最佳化

- GC 調校（G1、ZGC、Shenandoah）
- JIT 編譯
- Memory profiling
- 效能監控（JFR、async-profiler）

---

## Spring Boot

### REST Controller

```java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    @GetMapping
    public ResponseEntity<List<UserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var users = userService.findAll(PageRequest.of(page, size));
        return ResponseEntity.ok(users.map(UserResponse::from).getContent());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return userService.findById(id)
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        var user = userService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/users/" + user.getId()))
                .body(UserResponse.from(user));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request)
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

### DTO（使用 Record）

```java
public record CreateUserRequest(
        @NotBlank String name,
        @Email @NotBlank String email,
        @Size(min = 8) String password
) {}

public record UpdateUserRequest(
        @NotBlank String name,
        @Email String email
) {}

public record UserResponse(
        Long id,
        String name,
        String email,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCreatedAt()
        );
    }
}
```

### Service Layer

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    public Page<User> findAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }
    
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
    
    @Transactional
    public User create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }
        
        var user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .build();
        
        return userRepository.save(user);
    }
    
    @Transactional
    public Optional<User> update(Long id, UpdateUserRequest request) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setName(request.name());
                    if (request.email() != null) {
                        user.setEmail(request.email());
                    }
                    return userRepository.save(user);
                });
    }
    
    @Transactional
    public void delete(Long id) {
        userRepository.deleteById(id);
    }
}
```

### JPA Entity

```java
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

### Repository

```java
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.createdAt >= :since")
    List<User> findUsersCreatedSince(@Param("since") LocalDateTime since);
    
    @Query(value = "SELECT * FROM users WHERE name ILIKE %:name%", nativeQuery = true)
    List<User> searchByName(@Param("name") String name);
}
```

---

## 例外處理

### 自訂例外

```java
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long id) {
        super("User not found: " + id);
    }
}

public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String email) {
        super("Email already exists: " + email);
    }
}
```

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }
    
    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("DUPLICATE", ex.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .toList();
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("VALIDATION_ERROR", String.join(", ", errors)));
    }
}

public record ErrorResponse(String code, String message) {}
```

---

## 並發與非同步

### CompletableFuture

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final UserService userService;
    private final ProductService productService;
    private final PaymentService paymentService;
    
    public CompletableFuture<Order> processOrder(OrderRequest request) {
        var userFuture = CompletableFuture.supplyAsync(() -> 
                userService.findById(request.userId()).orElseThrow());
        
        var productFuture = CompletableFuture.supplyAsync(() -> 
                productService.findById(request.productId()).orElseThrow());
        
        return userFuture.thenCombine(productFuture, (user, product) -> {
            var order = Order.create(user, product, request.quantity());
            return paymentService.process(order);
        }).thenCompose(Function.identity());
    }
}
```

### Virtual Threads（Java 21+）

```java
@Configuration
public class ExecutorConfig {
    
    @Bean
    public ExecutorService virtualThreadExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}

@Service
@RequiredArgsConstructor
public class BatchService {
    
    private final ExecutorService virtualThreadExecutor;
    
    public List<Result> processBatch(List<Task> tasks) {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            var futures = tasks.stream()
                    .map(task -> scope.fork(() -> process(task)))
                    .toList();
            
            scope.join();
            scope.throwIfFailed();
            
            return futures.stream()
                    .map(StructuredTaskScope.Subtask::get)
                    .toList();
        }
    }
}
```

---

## Stream API 進階使用

```java
public class StreamExamples {
    
    // 分組與統計
    public Map<String, Long> countByCategory(List<Product> products) {
        return products.stream()
                .collect(Collectors.groupingBy(
                        Product::getCategory,
                        Collectors.counting()
                ));
    }
    
    // 扁平化處理
    public List<String> getAllTags(List<Article> articles) {
        return articles.stream()
                .flatMap(article -> article.getTags().stream())
                .distinct()
                .sorted()
                .toList();
    }
    
    // 複雜轉換
    public Map<String, List<UserSummary>> groupUsersByDepartment(List<User> users) {
        return users.stream()
                .filter(User::isActive)
                .collect(Collectors.groupingBy(
                        User::getDepartment,
                        Collectors.mapping(
                                user -> new UserSummary(user.getId(), user.getName()),
                                Collectors.toList()
                        )
                ));
    }
    
    // Parallel stream
    public long calculateTotal(List<Order> orders) {
        return orders.parallelStream()
                .mapToLong(Order::getAmount)
                .sum();
    }
}
```

---

## 測試

### Unit Test

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    void shouldCreateUser() {
        // Given
        var request = new CreateUserRequest("John", "john@example.com", "password");
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            var user = inv.getArgument(0, User.class);
            user.setId(1L);
            return user;
        });
        
        // When
        var result = userService.create(request);
        
        // Then
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("John");
        assertThat(result.getEmail()).isEqualTo("john@example.com");
        verify(userRepository).save(any(User.class));
    }
    
    @Test
    void shouldThrowWhenEmailExists() {
        // Given
        var request = new CreateUserRequest("John", "existing@example.com", "password");
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);
        
        // When/Then
        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(DuplicateEmailException.class);
    }
}
```

### Integration Test

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void shouldCreateUser() throws Exception {
        var request = new CreateUserRequest("John", "john@example.com", "password123");
        
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("John"))
                .andExpect(jsonPath("$.email").value("john@example.com"));
        
        assertThat(userRepository.findByEmail("john@example.com")).isPresent();
    }
}
```

---

## 專案結構

```text
src/
├── main/
│   ├── java/
│   │   └── com/example/app/
│   │       ├── Application.java
│   │       ├── config/
│   │       │   ├── SecurityConfig.java
│   │       │   └── WebConfig.java
│   │       ├── domain/
│   │       │   ├── user/
│   │       │   │   ├── User.java
│   │       │   │   ├── UserRepository.java
│   │       │   │   ├── UserService.java
│   │       │   │   └── UserController.java
│   │       │   └── order/
│   │       │       └── ...
│   │       ├── dto/
│   │       │   └── ...
│   │       └── exception/
│   │           ├── GlobalExceptionHandler.java
│   │           └── ...
│   └── resources/
│       ├── application.yml
│       └── db/migration/
└── test/
    └── java/
        └── com/example/app/
            └── ...
```

---

## 相關檔案

- 通用後端規範：`.claude/agents/experts/backend.md`
- 資料庫專家：`.claude/agents/experts/database.md`
- TDD 協調器：`.claude/agents/workers/tdd-orchestrator.md`

---

**類型**: Java 語言 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - java-pro
