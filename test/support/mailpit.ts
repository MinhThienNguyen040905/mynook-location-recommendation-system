/**
 * Đọc email từ Mailpit (hộp thư giả, docker `mynook-mailpit`) — spec 001 LOG-004.
 * auth-service trong bộ E2E gửi mọi email vào đây thay vì gửi thật.
 */
const MAILPIT_URL = process.env['E2E_MAILPIT_URL'] ?? 'http://localhost:8026';

export interface MailMessage {
  ID: string;
  Subject: string;
  Text: string;
  HTML: string;
}

export async function mailpitAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${MAILPIT_URL}/api/v1/info`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Chờ email mới nhất gửi tới `to` (có tiêu đề chứa `subjectContains`), trả về nội dung đầy đủ. */
export async function waitForEmail(to: string, subjectContains: string, timeoutMs = 15_000): Promise<MailMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    if (res.ok) {
      const list = (await res.json()) as { messages?: { ID: string; Subject: string }[] };
      const hit = list.messages?.find((m) => m.Subject.includes(subjectContains));
      if (hit) {
        const full = await fetch(`${MAILPIT_URL}/api/v1/message/${hit.ID}`);
        return (await full.json()) as MailMessage;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Không nhận được email "${subjectContains}" gửi tới ${to} trong ${timeoutMs} ms`);
}

/** Xoá email đã gửi tới các địa chỉ test (giữ hộp thư gọn). */
export async function deleteEmailsTo(pattern = 'e2e+'): Promise<void> {
  try {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${pattern}`)}&limit=500`);
    if (!res.ok) return;
    const list = (await res.json()) as { messages?: { ID: string }[] };
    const ids = (list.messages ?? []).map((m) => m.ID);
    if (ids.length) {
      await fetch(`${MAILPIT_URL}/api/v1/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IDs: ids }),
      });
    }
  } catch {
    /* Mailpit tắt thì bỏ qua */
  }
}
