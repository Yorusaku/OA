import type { PoolClient, QueryResultRow } from 'pg'
import { Pool } from 'pg'
import type { RuntimeState } from './domain'
import { createInitialState } from './state'
import { deepClone } from './utils'

export interface RuntimeStore {
  storage: 'postgres' | 'inmemory'
  init(): Promise<void>
  readState(): Promise<RuntimeState>
  runInTransaction<T>(handler: (draft: RuntimeState) => Promise<T> | T): Promise<T>
  query?<TRow extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: TRow[], rowCount: number }>
  close(): Promise<void>
}

class InMemoryStore implements RuntimeStore {
  storage: 'inmemory' = 'inmemory'
  private state: RuntimeState = createInitialState()
  private queue: Promise<unknown> = Promise.resolve()

  async init(): Promise<void> {}

  async readState(): Promise<RuntimeState> {
    return deepClone(this.state)
  }

  async runInTransaction<T>(handler: (draft: RuntimeState) => Promise<T> | T): Promise<T> {
    const task = async () => {
      const draft = deepClone(this.state)
      const result = await handler(draft)
      this.state = draft
      return result
    }
    const next = this.queue.then(task, task)
    this.queue = next.then(() => undefined, () => undefined)
    return next as Promise<T>
  }

  async query<TRow extends QueryResultRow = Record<string, unknown>>(): Promise<{ rows: TRow[], rowCount: number }> {
    throw new Error('inmemory-store-query-not-supported')
  }

  async close(): Promise<void> {}
}

class PostgresStore implements RuntimeStore {
  storage: 'postgres' = 'postgres'
  private readonly pool: Pool
  private readonly stateKey = 'oa-bff-state'

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString })
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS runtime_state (
        state_key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_bases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        chunk_size INTEGER NOT NULL DEFAULT 500,
        chunk_overlap INTEGER NOT NULL DEFAULT 50,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        content TEXT NOT NULL,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'processing',
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_knowledge_documents_kb
          FOREIGN KEY (kb_id)
          REFERENCES knowledge_bases(id)
          ON DELETE CASCADE
      );
    `)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_chat_sessions (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '新对话',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_chat_sessions_kb
          FOREIGN KEY (kb_id)
          REFERENCES knowledge_bases(id)
          ON DELETE CASCADE
      );
    `)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        sources JSONB,
        usage JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_chat_messages_session
          FOREIGN KEY (session_id)
          REFERENCES knowledge_chat_sessions(id)
          ON DELETE CASCADE
      );
    `)

    const existing = await this.pool.query<{ state_key: string }>(
      'SELECT state_key FROM runtime_state WHERE state_key = $1',
      [this.stateKey],
    )
    if (existing.rowCount === 0) {
      await this.pool.query(
        'INSERT INTO runtime_state(state_key, value) VALUES ($1, $2::jsonb)',
        [this.stateKey, JSON.stringify(createInitialState())],
      )
    }
  }

  private async getOrCreateStateForUpdate(client: PoolClient): Promise<RuntimeState> {
    const result = await client.query<{ value: RuntimeState }>(
      'SELECT value FROM runtime_state WHERE state_key = $1 FOR UPDATE',
      [this.stateKey],
    )

    if (result.rowCount === 0) {
      const initialState = createInitialState()
      await client.query(
        'INSERT INTO runtime_state(state_key, value) VALUES ($1, $2::jsonb)',
        [this.stateKey, JSON.stringify(initialState)],
      )
      return initialState
    }

    return deepClone(result.rows[0].value)
  }

  async readState(): Promise<RuntimeState> {
    const result = await this.pool.query<{ value: RuntimeState }>(
      'SELECT value FROM runtime_state WHERE state_key = $1',
      [this.stateKey],
    )
    if (result.rowCount === 0)
      return createInitialState()
    return deepClone(result.rows[0].value)
  }

  async runInTransaction<T>(handler: (draft: RuntimeState) => Promise<T> | T): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const draft = await this.getOrCreateStateForUpdate(client)
      const result = await handler(draft)
      await client.query(
        'UPDATE runtime_state SET value = $2::jsonb, updated_at = NOW() WHERE state_key = $1',
        [this.stateKey, JSON.stringify(draft)],
      )
      await client.query('COMMIT')
      return result
    }
    catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    finally {
      client.release()
    }
  }

  async query<TRow extends QueryResultRow = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<{ rows: TRow[], rowCount: number }> {
    const result = await this.pool.query<TRow>(sql, params)
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

export function createStore(options: {
  storage: 'postgres' | 'inmemory'
  connectionString: string
}): RuntimeStore {
  if (options.storage === 'inmemory')
    return new InMemoryStore()
  return new PostgresStore(options.connectionString)
}
