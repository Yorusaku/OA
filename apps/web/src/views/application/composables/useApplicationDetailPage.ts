import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ApplicationCategory, ApplicationStatus } from '@/types/application'
import {
  useApplicationDetail,
  useApplicationStats,
  useApplicationVersions,
  usePublishApplication,
  useToggleApplicationStatus,
  useRollbackVersion,
} from '@/composables/useApplication'
import { useCreateTemplate } from '@/composables/useTemplate'

type VersionChangeType = 'major' | 'minor' | 'patch'

export function useApplicationDetailPage() {
  const route = useRoute()
  const router = useRouter()
  const appId = computed(() => route.params.id as string)

  const { data: app, isLoading } = useApplicationDetail(appId)
  const { data: stats } = useApplicationStats(appId)
  const { data: versions } = useApplicationVersions(appId)
  const { mutateAsync: publishApp } = usePublishApplication()
  const { mutateAsync: toggleStatus } = useToggleApplicationStatus()
  const { mutateAsync: rollback } = useRollbackVersion()
  const { mutateAsync: createTemplate, isPending: isCreatingTemplate } = useCreateTemplate()

  const activeTab = ref('overview')
  const showShareDialog = ref(false)
  const shareForm = reactive({
    name: '',
    description: '',
    icon: '📋',
    category: 'approval' as ApplicationCategory,
    tags: [] as string[],
    features: [] as string[],
  })
  const tagInput = ref('')
  const featureInput = ref('')

  function handleEdit() {
    router.push(`/application/edit/${appId.value}`)
  }

  async function handlePublish() {
    try {
      await ElMessageBox.confirm(
        '确定要发布此应用吗？发布后用户即可使用。',
        '发布确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info',
        },
      )

      await publishApp(appId.value)
      ElMessage.success('发布成功')
    }
    catch (error) {
      if (error !== 'cancel')
        ElMessage.error('发布失败')
    }
  }

  async function handleDisable() {
    try {
      await ElMessageBox.confirm(
        '确定要停用此应用吗？停用后用户将无法使用。',
        '停用确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )

      await toggleStatus({ id: appId.value, status: 'disabled' })
      ElMessage.success('已停用')
    }
    catch (error) {
      if (error !== 'cancel')
        ElMessage.error('操作失败')
    }
  }

  async function handleEnable() {
    try {
      await toggleStatus({ id: appId.value, status: 'published' })
      ElMessage.success('已启用')
    }
    catch {
      ElMessage.error('操作失败')
    }
  }

  async function handleRollback(versionId: string, versionName: string) {
    try {
      await ElMessageBox.confirm(
        `确定要回滚到版本 ${versionName} 吗？`,
        '回滚确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )

      await rollback({ applicationId: appId.value, versionId })
      ElMessage.success('回滚成功')
    }
    catch (error) {
      if (error !== 'cancel')
        ElMessage.error('回滚失败')
    }
  }

  function formatStatus(status: ApplicationStatus): string {
    const map: Record<ApplicationStatus, string> = {
      draft: '草稿',
      published: '已发布',
      disabled: '已停用',
      archived: '已归档',
    }
    return map[status] || status
  }

  function getStatusType(status: ApplicationStatus): 'info' | 'success' | 'warning' | 'danger' {
    const map: Record<ApplicationStatus, 'info' | 'success' | 'warning' | 'danger'> = {
      draft: 'info',
      published: 'success',
      disabled: 'warning',
      archived: 'danger',
    }
    return map[status] || 'info'
  }

  function formatCategory(category: ApplicationCategory): string {
    const map: Record<ApplicationCategory, string> = {
      approval: '审批类',
      hr: '人事类',
      finance: '财务类',
      admin: '行政类',
      project: '项目类',
      other: '其他',
    }
    return map[category] || category
  }

  function formatChangeType(type: VersionChangeType): string {
    const map: Record<VersionChangeType, string> = {
      major: '重大更新',
      minor: '功能更新',
      patch: '修复更新',
    }
    return map[type] || type
  }

  function handleShare() {
    if (!app.value)
      return

    shareForm.name = `${app.value.name}模板`
    shareForm.description = app.value.description || ''
    shareForm.icon = app.value.icon || '📋'
    shareForm.category = app.value.category
    shareForm.tags = [...(app.value.tags || [])]
    shareForm.features = []
    showShareDialog.value = true
  }

  function handleAddTag() {
    const tag = tagInput.value.trim()
    if (tag && !shareForm.tags.includes(tag)) {
      shareForm.tags.push(tag)
      tagInput.value = ''
    }
  }

  function handleRemoveTag(tag: string) {
    shareForm.tags = shareForm.tags.filter(t => t !== tag)
  }

  function handleAddFeature() {
    const feature = featureInput.value.trim()
    if (feature && !shareForm.features.includes(feature)) {
      shareForm.features.push(feature)
      featureInput.value = ''
    }
  }

  function handleRemoveFeature(feature: string) {
    shareForm.features = shareForm.features.filter(f => f !== feature)
  }

  async function handleSubmitShare() {
    if (!shareForm.name.trim()) {
      ElMessage.warning('请输入模板名称')
      return
    }

    try {
      await createTemplate({
        name: shareForm.name,
        description: shareForm.description,
        icon: shareForm.icon,
        category: shareForm.category,
        tags: shareForm.tags,
        features: shareForm.features,
        sourceApplicationId: appId.value,
      })

      ElMessage.success('分享成功！模板已创建')
      showShareDialog.value = false
      router.push('/template/my')
    }
    catch {
      ElMessage.error('分享失败，请稍后重试')
    }
  }

  return {
    app,
    isLoading,
    stats,
    versions,
    activeTab,
    showShareDialog,
    shareForm,
    tagInput,
    featureInput,
    isCreatingTemplate,
    handleEdit,
    handlePublish,
    handleDisable,
    handleEnable,
    handleRollback,
    formatStatus,
    getStatusType,
    formatCategory,
    formatChangeType,
    handleShare,
    handleAddTag,
    handleRemoveTag,
    handleAddFeature,
    handleRemoveFeature,
    handleSubmitShare,
  }
}
