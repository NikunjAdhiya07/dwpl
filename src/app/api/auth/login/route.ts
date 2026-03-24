import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, password } = body;

    // Hardcoded SUPER_ADMIN fallback
    if (name === 'admin' && password === 'admin123') {
      const cookieStore = await cookies();
      cookieStore.set('dwpl_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
      cookieStore.set('dwpl_role', 'SUPER_ADMIN', {
        httpOnly: false, // Available to client-side code
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.set('dwpl_name', 'Admin', {
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.set('dwpl_sections', 'ALL', {
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return NextResponse.json({ success: true, role: 'SUPER_ADMIN' });
    }

    await connectDB();
    const user = await User.findOne({ name, password });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('dwpl_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    cookieStore.set('dwpl_role', user.role, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set('dwpl_name', user.name, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    
    const sections = user.role === 'SUPER_ADMIN' ? 'ALL' : (user.allowedSections?.join(',') || '');
    cookieStore.set('dwpl_sections', sections, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true, role: user.role, name: user.name, sections });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
