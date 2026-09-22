import { buildApp } from './app.js'
import { loadBffConfig } from './config.js'
import { loadLocalEnv } from './env.js'
import { initializeKnowledgeInfrastructure } from './services/knowledge-service.js'

async function bootstrap() {
  loadLocalEnv()
  const config = loadBffConfig()
  try {
    await initializeKnowledgeInfrastructure(config)
  }
  catch (error) {
    console.warn('[knowledge] infrastructure init skipped:', error)
  }
  const app = await buildApp(config)
  await app.listen({
    host: config.host,
    port: config.port,
  })
  app.log.info(`OA BFF running at http://${config.host}:${config.port}`)
}

bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
