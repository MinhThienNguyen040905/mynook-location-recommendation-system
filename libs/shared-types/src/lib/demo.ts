// Public fixture identifiers, never credentials. Provision with seed-demo.cjs.
export const DEMO_ACCOUNTS = {
  customer: { id: 'f448b46a-9eb5-4bec-9955-9fdfee188062', email: 'customer.demo@mynook.invalid' },
  owner: { id: '77699f4e-734e-4644-8465-52ec68311742', email: 'owner.demo@mynook.invalid' },
} as const;
export const DEMO_VENUE_ID = '8bff2191-abba-4987-b4d6-614a4c2725ca';
export const DEMO_REVIEW_ID = '2a13838c-7f25-4deb-a2e7-3b0377bb0eed';
export type DemoRole = keyof typeof DEMO_ACCOUNTS;
export function isDemoAccount(id: string): boolean {
  return Object.values(DEMO_ACCOUNTS).some(account => account.id === id);
}
