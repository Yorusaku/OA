import antfu from '@antfu/eslint-config'
import config from '@oa/config/eslint'

export default antfu({
  ...config,
  vue: true,
  typescript: true,
})
