import { deleteAiTestVenues } from './ai-db';
import { deleteTestData } from './db';

export default async function aiTeardown() {
  const venues = await deleteAiTestVenues();
  const accounts = await deleteTestData();
  console.log(`[ai] Đã xoá ${venues} quán test, ${accounts} tài khoản test`);
}
