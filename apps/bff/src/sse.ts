import type { ServerResponse } from 'node:http'
import type { SseApprovalEvent, SseTopic } from '@oa/contracts'
import { uid } from './utils'

interface Client {
  id: string
  response: ServerResponse
}

export class RealtimeHub {
  private readonly clients = new Map<string, Client>()

  subscribe(response: ServerResponse): () => void {
    const id = uid('sse-client')
    this.clients.set(id, { id, response })
    return () => {
      this.clients.delete(id)
    }
  }

  publish(topic: SseTopic, payload: unknown): SseApprovalEvent<unknown> {
    const event: SseApprovalEvent<unknown> = {
      eventId: uid('evt'),
      topic,
      timestamp: new Date().toISOString(),
      payload,
    }

    const serialized = `id: ${event.eventId}\nevent: ${event.topic}\ndata: ${JSON.stringify(event)}\n\n`

    for (const [, client] of this.clients) {
      try {
        client.response.write(serialized)
      }
      catch {
        this.clients.delete(client.id)
      }
    }

    return event
  }

  heartbeat(): void {
    for (const [, client] of this.clients) {
      try {
        client.response.write(`: heartbeat ${Date.now()}\n\n`)
      }
      catch {
        this.clients.delete(client.id)
      }
    }
  }
}
