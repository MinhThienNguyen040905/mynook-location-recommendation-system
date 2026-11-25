/** Đọc trạng thái hàng đợi qua RabbitMQ Management API (Docker: :15672, guest/guest). */
const MGMT_URL = process.env['E2E_RMQ_MGMT_URL'] ?? 'http://localhost:15672';
const AUTH = 'Basic ' + Buffer.from(process.env['E2E_RMQ_MGMT_AUTH'] ?? 'guest:guest').toString('base64');

export interface QueueState {
  messages: number;
  unacked: number;
  /** Số lần message bị giao lại (cộng dồn) — tăng nghĩa là có nack + requeue */
  redeliver: number;
}

export async function queueState(queue: string): Promise<QueueState> {
  const res = await fetch(`${MGMT_URL}/api/queues/%2F/${encodeURIComponent(queue)}`, {
    headers: { Authorization: AUTH },
  });
  if (!res.ok) throw new Error(`RabbitMQ management API ${res.status} cho queue ${queue}`);
  const q = (await res.json()) as {
    messages?: number;
    messages_unacknowledged?: number;
    message_stats?: { redeliver?: number };
  };
  return {
    messages: q.messages ?? 0,
    unacked: q.messages_unacknowledged ?? 0,
    redeliver: q.message_stats?.redeliver ?? 0,
  };
}
