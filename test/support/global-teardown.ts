import { deleteTestData } from './db';
import { deleteEmailsTo } from './mailpit';

export default async function globalTeardown() {
  await deleteEmailsTo();
  const removed = await deleteTestData();
  console.log(`[e2e] Đã xoá ${removed} tài khoản test`);
}
