export interface UserInfo {
  id: string
  username: string
  name: string
  avatar?: string
  email?: string
  phone?: string
  deptId?: string
  deptName?: string
  roles?: string[]
}

export interface DeptInfo {
  id: string
  name: string
  parentId?: string
  children?: DeptInfo[]
  leaderId?: string
  leaderName?: string
}

export interface DictItem {
  value: string
  label: string
  disabled?: boolean
}

export interface DictData {
  [key: string]: DictItem[]
}
