import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('dwpl_auth');
  cookieStore.delete('dwpl_role');
  return NextResponse.json({ success: true });
}
