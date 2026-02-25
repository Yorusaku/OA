# Stores API

使用 Pinia 进行状态管理。

## useUserStore

用户状态管理。

**位置:** `apps/web/src/stores/user.ts`

### State

```ts
interface UserState {
  token: string | null           // 认证令牌
  userInfo: UserInfo | null      // 用户信息
  permissions: string[]          // 权限列表
  menus: MenuItem[]              // 菜单列表
}
```

### Getters

| 名称 | 类型 | 说明 |
|------|------|------|
| `isLoggedIn` | `computed<boolean>` | 是否已登录 |

### Actions

| 名称 | 参数 | 说明 |
|------|------|------|
| `setToken` | `value: string \| null` | 设置令牌 |
| `setUser` | `info: UserInfo \| null` | 设置用户信息 |
| `setPermissions` | `codes: string[]` | 设置权限列表 |
| `setMenus` | `list: MenuItem[]` | 设置菜单列表 |
| `hasPermission` | `code: string` | 检查权限 |
| `logout` | - | 登出 |
| `clearUser` | - | 清除用户状态（401 时使用） |

### 使用示例

```ts
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 获取状态
console.log(userStore.isLoggedIn)
console.log(userStore.userInfo)

// 调用 action
userStore.setToken('token123')
userStore.logout()
```

---

## useAppStore

应用全局状态管理。

**位置:** `apps/web/src/stores/app.ts`

### State

```ts
interface AppState {
  sidebarCollapsed: boolean    // 侧边栏折叠状态
  theme: 'light' | 'dark'      // 主题
}
```

### Actions

| 名称 | 参数 | 说明 |
|------|------|------|
| `toggleSidebar` | - | 切换侧边栏折叠状态 |
| `setSidebarCollapsed` | `value: boolean` | 设置侧边栏状态 |
| `setTheme` | `theme: 'light' | 'dark'` | 设置主题 |

### 使用示例

```ts
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// 切换侧边栏
appStore.toggleSidebar()

// 设置主题
appStore.setTheme('dark')
```

---

## useNotificationStore

通知中心状态管理。

**位置:** `apps/web/src/stores/notification.ts`

### State

```ts
interface NotificationState {
  notifications: Notification[]  // 通知列表
  unreadCount: number            // 未读数量
}
```

### Actions

| 名称 | 参数 | 说明 |
|------|------|------|
| `addNotification` | `notification: Omit<...>` | 添加通知 |
| `markAsRead` | `id: string` | 标记为已读 |
| `markAllAsRead` | - | 全部标记已读 |
| `removeNotification` | `id: string` | 删除通知 |
| `clearAll` | - | 清空所有通知 |

### 使用示例

```ts
import { useNotificationStore } from '@/stores/notification'

const store = useNotificationStore()

// 添加通知
store.addNotification({
  title: '新消息',
  content: '您有一条新的审批',
  type: 'info'
})

// 标记已读
store.markAsRead('123')
```
