import type { PoolClient } from 'pg'
import { Pool } from 'pg'
import type { RuntimeState } from './domain'
import { createInitialState } from './state'
import { deepClone } from './utils'

export interface RuntimeStore {
  init(): Promise<void>
  readState(): Promise<RuntimeState>
  runInTransaction<T>(handler: (draft: RuntimeState) => Promise<T> | T): Promise<T>
  close(): Promise<void>
}

class InMemoryStore implements RuntimeStore {
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

  async close(): Promise<void> {}
}

class PostgresStore implements RuntimeStore {
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
