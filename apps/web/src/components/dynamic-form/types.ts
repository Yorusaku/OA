import type { FormFieldSchema } from '@/types/form-schema'

/**
 * 字段渲染上下文
 */
export interface FieldRenderContext {
  field: FormFieldSchema
  fieldValue: any
  handleChange: ((value: any) => void) | undefined
  handleBlur: ((e: Event) => void) | undefined
  disabled: boolean
  fieldReadonly: boolean
  commonProps: Record<string, any>
}

/**
 * 字段渲染函数类型
 */
export type FieldRenderer = (ctx: FieldRenderContext) => any

/**
 * 异步渲染器加载器（用于按需加载）
 */
export type AsyncRendererLoader = () => Promise<FieldRenderer>

/**
 * 渲染器映射表（支持同步和异步）
 */
export interface RendererMap {
  [key: string]: FieldRenderer | AsyncRendererLoader
}
