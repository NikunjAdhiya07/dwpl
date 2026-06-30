import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

const HARDCODED_ADMIN_NAME = 'Admin';

export async function userCanEditInvoicedChallans(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('dwpl_auth');
  if (!authCookie) return false;

  const name = cookieStore.get('dwpl_name')?.value;
  if (!name) return false;

  if (name === HARDCODED_ADMIN_NAME) return true;

  await connectDB();
  const user = await User.findOne({ name }).select('canEditInvoicedChallans isActive');
  return user?.isActive === true && user?.canEditInvoicedChallans === true;
}
