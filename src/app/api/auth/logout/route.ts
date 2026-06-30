import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('dwpl_auth');
  cookieStore.delete('dwpl_role');
  cookieStore.delete('dwpl_name');
  cookieStore.delete('dwpl_sections');
  cookieStore.delete('dwpl_can_edit_invoiced_challans');
  return NextResponse.json({ success: true });
}
