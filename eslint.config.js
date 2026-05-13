import shared from '@oa/config/eslint'

const ignores = Array.isArray(shared.ignores) ? shared.ignores : []
const safeRules = Object.fromEntries(
  Object.entries(shared.rules || {}).filter(([name]) => !name.includes('/')),
)

export default [
  {
    ignores,
  },
  {
    rules: safeRules,
  },
]
