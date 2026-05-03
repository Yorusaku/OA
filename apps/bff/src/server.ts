import { buildApp } from './app'
import { loadBffConfig } from './config'

async function bootstrap() {
  const config = loadBffConfig()
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
