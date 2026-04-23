import { redirect } from 'next/navigation';

/** /dashboard/profile đã được gộp vào /dashboard */
export default function OwnerProfileRedirect() {
  redirect('/dashboard');
}
