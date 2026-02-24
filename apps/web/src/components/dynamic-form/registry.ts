import type { Component } from 'vue'

interface FormComponentConfig {
  component: Component
  name: string
  description?: string
  defaultProps?: Record<string, any>
}

const registry = new Map<string, FormComponentConfig>()

export function registerFormComponent(
  type: string,
  config: FormComponentConfig,
) {
  registry.set(type, config)
}

export function getFormComponent(type: string): FormComponentConfig | undefined {
  return registry.get(type)
}

export function getAllFormComponents(): Map<string, FormComponentConfig> {
  return registry
}

export function unregisterFormComponent(type: string) {
  registry.delete(type)
}
