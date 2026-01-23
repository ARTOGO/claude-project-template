# Vue Developer Expert

> Vue.js 專家。專精 Vue 3 Composition API、Pinia 狀態管理、Vue Router、Nuxt.js。

**來源**: 整合自 [wshobson/agents](https://github.com/wshobson/agents) 並根據專案需求調整

---

## 適用時機

當 `project.yaml` 的 `tech_stack.frontend.framework` 為 `vue` 或 `nuxt` 時，由 `frontend.md` 引用。

---

## 核心能力

### Vue 3 Composition API

- `<script setup>` 語法
- Composables 設計模式
- `ref`、`reactive`、`computed`
- `watch`、`watchEffect`
- Lifecycle hooks
- Template refs

### 狀態管理 (Pinia)

- Store 定義與組織
- Actions 與 Getters
- 插件系統
- 持久化策略

### Vue Router

- 路由配置
- Navigation Guards
- 動態路由
- 路由 Meta

### Nuxt.js（如適用）

- 檔案系統路由
- 資料獲取（useFetch、useAsyncData）
- Server Routes
- 中間件

---

## 元件結構

### 標準 Vue 元件

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { IUser } from '@/types'

// Props
interface Props {
  user: IUser
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: false
})

// Emits
const emit = defineEmits<{
  (e: 'update', user: IUser): void
  (e: 'delete', id: string): void
}>()

// State
const isEditing = ref(false)
const editedName = ref(props.user.name)

// Computed
const displayName = computed(() => {
  return isEditing.value ? editedName.value : props.user.name
})

// Methods
function startEdit() {
  isEditing.value = true
  editedName.value = props.user.name
}

function saveEdit() {
  emit('update', { ...props.user, name: editedName.value })
  isEditing.value = false
}

// Lifecycle
onMounted(() => {
  console.log('Component mounted')
})
</script>

<template>
  <div class="user-card">
    <div v-if="!isEditing">
      <h3>{{ displayName }}</h3>
      <button v-if="editable" @click="startEdit">
        Edit
      </button>
    </div>
    <div v-else>
      <input v-model="editedName" />
      <button @click="saveEdit">Save</button>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}
</style>
```

### Composable 設計模式

```typescript
// composables/useUser.ts
import { ref, computed } from 'vue'
import type { IUser } from '@/types'
import { userApi } from '@/api/user'

export function useUser(userId: string) {
  const user = ref<IUser | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const fullName = computed(() => {
    if (!user.value) return ''
    return `${user.value.firstName} ${user.value.lastName}`
  })

  async function fetchUser() {
    loading.value = true
    error.value = null
    
    try {
      user.value = await userApi.getById(userId)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  async function updateUser(data: Partial<IUser>) {
    if (!user.value) return
    
    loading.value = true
    try {
      user.value = await userApi.update(userId, data)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    fullName,
    fetchUser,
    updateUser
  }
}
```

---

## Pinia 狀態管理

### Store 定義

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import type { IUser } from '@/types'
import { userApi } from '@/api/user'

interface UserState {
  currentUser: IUser | null
  users: IUser[]
  loading: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    currentUser: null,
    users: [],
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.currentUser,
    
    getUserById: (state) => {
      return (id: string) => state.users.find(u => u.id === id)
    },
    
    activeUsers: (state) => {
      return state.users.filter(u => u.isActive)
    }
  },

  actions: {
    async fetchCurrentUser() {
      this.loading = true
      try {
        this.currentUser = await userApi.getCurrentUser()
      } finally {
        this.loading = false
      }
    },

    async fetchUsers() {
      this.loading = true
      try {
        this.users = await userApi.list()
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.currentUser = null
    }
  }
})
```

### Setup Store（Composition API 風格）

```typescript
// stores/counter.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0)

  // Getters
  const doubleCount = computed(() => count.value * 2)

  // Actions
  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  return { count, doubleCount, increment, decrement }
})
```

---

## Vue Router 配置

### 路由定義

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/Home.vue')
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/pages/Users.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users/:id',
    name: 'user-detail',
    component: () => import('@/pages/UserDetail.vue'),
    props: true
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
```

---

## 測試模式

### 元件測試

```typescript
// UserCard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UserCard from './UserCard.vue'

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com'
  }

  it('renders user name', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    })
    
    expect(wrapper.text()).toContain('John Doe')
  })

  it('shows edit button when editable', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser, editable: true }
    })
    
    expect(wrapper.find('button').text()).toBe('Edit')
  })

  it('emits update event when saved', async () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser, editable: true }
    })
    
    await wrapper.find('button').trigger('click') // Start edit
    await wrapper.find('input').setValue('Jane Doe')
    await wrapper.findAll('button')[0].trigger('click') // Save
    
    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0]).toEqual([
      { ...mockUser, name: 'Jane Doe' }
    ])
  })
})
```

### Composable 測試

```typescript
// useUser.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUser } from './useUser'
import { userApi } from '@/api/user'

vi.mock('@/api/user')

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches user data', async () => {
    const mockUser = { id: '1', name: 'John' }
    vi.mocked(userApi.getById).mockResolvedValue(mockUser)

    const { user, loading, fetchUser } = useUser('1')
    
    expect(loading.value).toBe(false)
    await fetchUser()
    
    expect(user.value).toEqual(mockUser)
    expect(loading.value).toBe(false)
  })

  it('handles fetch error', async () => {
    const mockError = new Error('Not found')
    vi.mocked(userApi.getById).mockRejectedValue(mockError)

    const { error, fetchUser } = useUser('1')
    await fetchUser()
    
    expect(error.value).toEqual(mockError)
  })
})
```

### Pinia Store 測試

```typescript
// stores/user.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './user'

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no current user', () => {
    const store = useUserStore()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('sets current user after fetch', async () => {
    const store = useUserStore()
    await store.fetchCurrentUser()
    
    expect(store.currentUser).not.toBeNull()
    expect(store.isAuthenticated).toBe(true)
  })

  it('clears user on logout', async () => {
    const store = useUserStore()
    await store.fetchCurrentUser()
    store.logout()
    
    expect(store.currentUser).toBeNull()
  })
})
```

---

## 最佳實踐

### 1. Props 驗證

```typescript
// 使用 TypeScript 介面定義 Props
interface Props {
  user: IUser
  mode?: 'view' | 'edit'
  maxItems?: number
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'view',
  maxItems: 10
})
```

### 2. Provide/Inject 類型安全

```typescript
// keys.ts
import type { InjectionKey, Ref } from 'vue'
import type { IUser } from '@/types'

export const userKey: InjectionKey<Ref<IUser | null>> = Symbol('user')

// Parent.vue
import { provide, ref } from 'vue'
import { userKey } from '@/keys'

const user = ref<IUser | null>(null)
provide(userKey, user)

// Child.vue
import { inject } from 'vue'
import { userKey } from '@/keys'

const user = inject(userKey)
```

### 3. 表單處理

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength } from '@vuelidate/validators'

const form = reactive({
  email: '',
  password: ''
})

const rules = {
  email: { required, email },
  password: { required, minLength: minLength(8) }
}

const v$ = useVuelidate(rules, form)

async function submitForm() {
  const isValid = await v$.value.$validate()
  if (!isValid) return
  
  // Submit form
}
</script>
```

---

## 相關檔案

- 通用前端規範：`.claude/agents/experts/frontend.md`
- TypeScript 專家：`.claude/agents/experts/node/typescript-pro.md`
- E2E 測試：`.claude/skills/webapp-testing/SKILL.md`

---

**類型**: Vue 框架 Expert
**來源**: [wshobson/agents](https://github.com/wshobson/agents) - vue-developer
