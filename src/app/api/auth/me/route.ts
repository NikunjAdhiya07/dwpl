import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userCanEditInvoicedChallans } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('dwpl_auth');
    const roleCookie = cookieStore.get('dwpl_role');

    if (!authCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const role = roleCookie?.value;
    const nameCookie = cookieStore.get('dwpl_name');
    const name = nameCookie?.value || (role === 'SUPER_ADMIN' ? 'Admin' : 'User');
    const canEditInvoicedChallans = await userCanEditInvoicedChallans();

    return NextResponse.json({
      success: true,
      data: { name, role, canEditInvoicedChallans },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
