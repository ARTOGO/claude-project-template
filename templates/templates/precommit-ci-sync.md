# Precommit 與 CI/CD 同步規範

> 確保本地 Precommit 檢查與 CI 檢查完全一致的配置模板

---

## 核心原則

**Precommit 通過 = CI 必須通過**

這是確保程式碼品質的關鍵：開發者在本地 commit 時執行的檢查，必須與 CI 伺服器上的檢查完全相同。

## 檢查項目同步矩陣

| 檢查項目 | Precommit | CI | 必須同步 | 說明 |
|---------|-----------|-----|---------|------|
| Lint | ✅ | ✅ | **是** | 程式碼風格必須一致 |
| 測試 | ✅ | ✅ | **是** | 測試必須通過 |
| Type Check | ✅ | ✅ | **是** | 型別檢查必須通過 |
| 覆蓋率 | ⚠️ 可選 | ✅ | - | CI 強制檢查覆蓋率 |
| Build | ❌ | ✅ | - | 僅 CI 執行 Build |
| Security Scan | ❌ | ✅ | - | 僅 CI 執行安全掃描 |

---

## Precommit 配置模板

### 基本結構

```yaml
# .pre-commit-config.yaml
default_stages: [commit]
fail_fast: true

repos:
  # 通用檢查
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
        args: ['--maxkb=1000']

  # 後端檢查（依語言選擇）
  - repo: local
    hooks:
      - id: backend-lint
        name: Backend Lint
        entry: # 見下方語言特定配置
        language: system
        files: ^{paths.backend}/
        pass_filenames: false

      - id: backend-test
        name: Backend Test
        entry: # 見下方語言特定配置
        language: system
        files: ^{paths.backend}/
        pass_filenames: false

  # 前端檢查
  - repo: local
    hooks:
      - id: frontend-lint
        name: Frontend Lint
        entry: # 見下方套件管理器特定配置
        language: system
        files: ^{paths.frontend}/
        pass_filenames: false

      - id: frontend-typecheck
        name: Frontend Type Check
        entry: # 見下方套件管理器特定配置
        language: system
        files: ^{paths.frontend}/
        pass_filenames: false

      - id: frontend-test
        name: Frontend Test
        entry: # 見下方套件管理器特定配置
        language: system
        files: ^{paths.frontend}/
        pass_filenames: false
```

---

## 語言特定配置

### Go

**Precommit Hook**:
```yaml
- id: backend-lint
  name: Backend Lint (Go)
  entry: bash -c 'cd {paths.backend} && golangci-lint run'
  language: system
  files: ^{paths.backend}/.*\.go$
  pass_filenames: false

- id: backend-test
  name: Backend Test (Go)
  entry: bash -c 'cd {paths.backend} && go test -v -race ./...'
  language: system
  files: ^{paths.backend}/.*\.go$
  pass_filenames: false
```

**CI Workflow（必須同步）**:
```yaml
# .github/workflows/backend-ci.yml
backend-lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with:
        go-version: '1.22'
    - name: Lint
      run: |
        curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin
        golangci-lint run
      working-directory: {paths.backend}

backend-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with:
        go-version: '1.22'
    - name: Test
      run: go test -v -race -coverprofile=coverage.out ./...
      working-directory: {paths.backend}
    - name: Check Coverage
      run: |
        COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
        if (( $(echo "$COVERAGE < {team.test_coverage}" | bc -l) )); then
          echo "Coverage $COVERAGE% is below {team.test_coverage}%"
          exit 1
        fi
      working-directory: {paths.backend}
```

### Python

**Precommit Hook**:
```yaml
- id: backend-lint
  name: Backend Lint (Python)
  entry: bash -c 'cd {paths.backend} && ruff check .'
  language: system
  files: ^{paths.backend}/.*\.py$
  pass_filenames: false

- id: backend-test
  name: Backend Test (Python)
  entry: bash -c 'cd {paths.backend} && pytest'
  language: system
  files: ^{paths.backend}/.*\.py$
  pass_filenames: false
```

**CI Workflow（必須同步）**:
```yaml
# .github/workflows/backend-ci.yml
backend-lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: '3.12'
    - name: Install dependencies
      run: pip install ruff pytest pytest-cov
      working-directory: {paths.backend}
    - name: Lint
      run: ruff check .
      working-directory: {paths.backend}

backend-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: '3.12'
    - name: Install dependencies
      run: pip install -r requirements.txt pytest pytest-cov
      working-directory: {paths.backend}
    - name: Test with coverage
      run: pytest --cov --cov-fail-under={team.test_coverage}
      working-directory: {paths.backend}
```

### Node.js (Backend)

**Precommit Hook**:
```yaml
- id: backend-lint
  name: Backend Lint (Node)
  entry: bash -c 'cd {paths.backend} && {pm} run lint'
  language: system
  files: ^{paths.backend}/
  pass_filenames: false

- id: backend-test
  name: Backend Test (Node)
  entry: bash -c 'cd {paths.backend} && {pm} test'
  language: system
  files: ^{paths.backend}/
  pass_filenames: false
```

---

## 前端配置（依套件管理器）

### pnpm

**Precommit Hook**:
```yaml
- id: frontend-lint
  name: Frontend Lint
  entry: bash -c 'cd {paths.frontend} && pnpm lint'
  language: system
  files: ^{paths.frontend}/
  pass_filenames: false

- id: frontend-typecheck
  name: Frontend Type Check
  entry: bash -c 'cd {paths.frontend} && pnpm typecheck'
  language: system
  files: ^{paths.frontend}/
  pass_filenames: false

- id: frontend-test
  name: Frontend Test
  entry: bash -c 'cd {paths.frontend} && pnpm test'
  language: system
  files: ^{paths.frontend}/
  pass_filenames: false
```

**CI Workflow（必須同步）**:
```yaml
# .github/workflows/frontend-ci.yml
frontend-ci:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
      with:
        version: 9
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
        cache-dependency-path: '{paths.frontend}/pnpm-lock.yaml'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      working-directory: {paths.frontend}

    - name: Lint
      run: pnpm lint
      working-directory: {paths.frontend}

    - name: Type Check
      run: pnpm typecheck
      working-directory: {paths.frontend}

    - name: Test
      run: pnpm test:coverage
      working-directory: {paths.frontend}

    - name: Check Coverage
      run: |
        COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
        if (( $(echo "$COVERAGE < {team.test_coverage}" | bc -l) )); then
          echo "Coverage $COVERAGE% is below {team.test_coverage}%"
          exit 1
        fi
      working-directory: {paths.frontend}

    - name: Build
      run: pnpm build
      working-directory: {paths.frontend}
```

### npm

將上方 `pnpm` 替換為 `npm run`，並調整 CI 中的 cache 設定。

### yarn

將上方 `pnpm` 替換為 `yarn`，並調整 CI 中的 cache 設定。

---

## 同步驗證腳本

建立驗證腳本確保 precommit 和 CI 設定同步：

```bash
#!/bin/bash
# scripts/verify-ci-sync.sh

echo "🔍 Verifying Precommit and CI sync..."

# 讀取 precommit 配置
PRECOMMIT_LINT=$(grep -A2 "id: backend-lint" .pre-commit-config.yaml | grep "entry:" | sed 's/.*entry: //')
PRECOMMIT_TEST=$(grep -A2 "id: backend-test" .pre-commit-config.yaml | grep "entry:" | sed 's/.*entry: //')

# 讀取 CI 配置
CI_LINT=$(grep -A5 "name: Lint" .github/workflows/backend-ci.yml | grep "run:" | head -1 | sed 's/.*run: //')
CI_TEST=$(grep -A5 "name: Test" .github/workflows/backend-ci.yml | grep "run:" | head -1 | sed 's/.*run: //')

echo "Precommit Lint: $PRECOMMIT_LINT"
echo "CI Lint: $CI_LINT"

echo "Precommit Test: $PRECOMMIT_TEST"
echo "CI Test: $CI_TEST"

# 基本驗證（可擴展）
if [[ "$PRECOMMIT_LINT" != *"lint"* ]] || [[ "$CI_LINT" != *"lint"* ]]; then
  echo "❌ Lint commands may not be in sync"
  exit 1
fi

echo "✅ Basic sync verification passed"
```

---

## 常見問題排除

### Q: Precommit 通過但 CI 失敗

**可能原因**：
1. **Node/Go 版本不一致** - 確保本地和 CI 使用相同版本
2. **依賴版本不一致** - 使用 lockfile 確保版本一致
3. **環境變數差異** - CI 可能缺少本地存在的環境變數

**解決方案**：
```yaml
# CI 中明確指定版本
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'  # 使用 .nvmrc 指定版本

- uses: actions/setup-go@v5
  with:
    go-version-file: 'go.mod'  # 使用 go.mod 指定版本
```

### Q: Precommit 執行太慢

**解決方案**：
1. 使用 `files:` 過濾只檢查相關檔案
2. 使用 `pass_filenames: false` 避免每個檔案單獨執行
3. 考慮使用 lint-staged 只檢查 staged 檔案

```yaml
# 使用 lint-staged
- repo: local
  hooks:
    - id: lint-staged
      name: Lint Staged
      entry: npx lint-staged
      language: system
      pass_filenames: false
```

### Q: 如何跳過 precommit（緊急情況）

```bash
# 不建議，但緊急時可用
git commit --no-verify -m "emergency fix"
```

**注意**：CI 仍會執行檢查，所以這只是暫時跳過本地檢查。

---

## 相關檔案

- 專案配置：`.claude/project.yaml`
- CI/CD Expert：`.claude/agents/experts/cicd.md`
- 測試規範：`.claude/templates/test-requirements.md`

---

**類型**: 通用 Precommit/CI 同步配置模板
**依賴**: `project.yaml` 技術棧設定
