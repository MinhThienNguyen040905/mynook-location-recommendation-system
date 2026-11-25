import { Client } from 'pg';
import './env';

/**
 * Truy cập DB trực tiếp — CHỈ dùng trong test để tạo trạng thái không có API công khai
 * (khoá tài khoản) và dọn dữ liệu test. Ngoại lệ constitution II.2, xem specs/001-auth-account/plan.md §2.
 *
 * An toàn: mọi thao tác ghi đều bị giới hạn ở email dạng `e2e+...@mynook.test`.
 */
export const TEST_EMAIL_PATTERN = 'e2e+%@mynook.test';
const TEST_EMAIL_REGEX = /^e2e\+[^@]+@mynook\.test$/;

function assertTestEmail(email: string): void {
  if (!TEST_EMAIL_REGEX.test(email)) {
    throw new Error(`Từ chối ghi DB cho email không phải email test: ${email}`);
  }
}

export async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const url = process.env['E2E_DATABASE_URL'] || process.env['DATABASE_URL'];
  if (!url) throw new Error('Thiếu DATABASE_URL trong .env');
  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase.com') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function setAccountActive(email: string, active: boolean): Promise<void> {
  assertTestEmail(email);
  await withClient(async (c) => {
    const res = await c.query(
      'UPDATE auth_schema.accounts SET is_active = $1 WHERE email = $2',
      [active, email],
    );
    if (res.rowCount !== 1) throw new Error(`Không tìm thấy tài khoản test ${email}`);
  });
}

export async function getAccount(email: string) {
  assertTestEmail(email);
  return withClient(async (c) => {
    const { rows } = await c.query(
      'SELECT id, email, full_name, phone_number, type, is_active FROM auth_schema.accounts WHERE email = $1',
      [email],
    );
    return rows[0] ?? null;
  });
}

/** Xoá toàn bộ dữ liệu do test tạo ra. Trả về số tài khoản đã xoá. */
export async function deleteTestData(): Promise<number> {
  return withClient(async (c) => {
    await c.query('BEGIN');
    try {
      await c.query(
        `DELETE FROM interaction_schema.notifications
          WHERE account_id IN (SELECT id FROM auth_schema.accounts WHERE email LIKE $1)`,
        [TEST_EMAIL_PATTERN],
      );
      await c.query('DELETE FROM auth_schema.registration_otps WHERE email LIKE $1', [TEST_EMAIL_PATTERN]);
      const res = await c.query('DELETE FROM auth_schema.accounts WHERE email LIKE $1', [TEST_EMAIL_PATTERN]);
      await c.query('COMMIT');
      return res.rowCount ?? 0;
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    }
  });
}
