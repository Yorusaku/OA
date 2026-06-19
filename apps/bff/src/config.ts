export interface BffConfig {
  host: string
  port: number
  storage: 'postgres' | 'inmemory'
  postgres: {
    connectionString: string
  }
  knowledge: {
    qdrantUrl: string
    qdrantCollectionName: string
    embeddingDimensions: number
  }
  idempotencyTtlHours: number
  enableRuleTraceDebug: boolean
}

function buildPostgresConnectionString() {
  if (process.env.DATABASE_URL)
    return process.env.DATABASE_URL

  const host = process.env.PG_HOST ?? '127.0.0.1'
  const port = process.env.PG_PORT ?? '5434'
  const user = process.env.PG_USER ?? 'postgres'
  const password = process.env.PG_PASSWORD ?? 'postgres'
  const database = process.env.PG_DATABASE ?? 'panorama_oa'
  return `postgresql://${user}:${password}@${host}:${port}/${database}`
}

export function loadBffConfig(): BffConfig {
  const storage = (process.env.BFF_STORAGE ?? 'postgres').toLowerCase() === 'inmemory'
    ? 'inmemory'
    : 'postgres'

  return {
    host: process.env.BFF_HOST ?? '0.0.0.0',
    port: Number(process.env.BFF_PORT ?? '8088'),
    storage,
    postgres: {
      connectionString: buildPostgresConnectionString(),
    },
    knowledge: {
      qdrantUrl: process.env.QDRANT_URL ?? 'http://127.0.0.1:6333',
      qdrantCollectionName: process.env.QDRANT_COLLECTION_NAME ?? 'oa_knowledge_chunks',
      embeddingDimensions: Number(process.env.ARK_EMBEDDING_DIMENSIONS ?? '1024'),
    },
    idempotencyTtlHours: Number(process.env.BFF_IDEMPOTENCY_TTL_HOURS ?? '24'),
    enableRuleTraceDebug: (process.env.BFF_ENABLE_RULE_TRACE_DEBUG ?? 'false').toLowerCase() === 'true',
  }
}
