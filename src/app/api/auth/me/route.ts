import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('dwpl_auth');
    const roleCookie = cookieStore.get('dwpl_role');

    if (!authCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Hardcoded admin
    const role = roleCookie?.value;
    if (role === 'SUPER_ADMIN') {
      // Check if there's a name cookie stashed during login
      const nameCookie = cookieStore.get('dwpl_name');
      return NextResponse.json({ success: true, data: { name: nameCookie?.value || 'Admin', role: 'SUPER_ADMIN' } });
    }

    await connectDB();
    // We store name in cookie on login; if not present, fall back to 'Unknown'
    const nameCookie = cookieStore.get('dwpl_name');
    if (nameCookie?.value) {
      return NextResponse.json({ success: true, data: { name: nameCookie.value, role } });
    }

    return NextResponse.json({ success: true, data: { name: 'User', role } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
