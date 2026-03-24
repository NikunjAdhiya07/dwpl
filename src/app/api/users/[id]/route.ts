import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('dwpl_role')?.value;
    
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const resolvedParams = await params;
    await connectDB();
    
    await User.findByIdAndDelete(resolvedParams.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('dwpl_role')?.value;
    
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const resolvedParams = await params;
    await connectDB();
    
    const user = await User.findById(resolvedParams.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    if (body.allowedSections !== undefined) {
      user.allowedSections = body.allowedSections;
    }
    if (body.name) user.name = body.name;
    if (body.role) user.role = body.role;
    if (body.password) {
      user.password = body.password; // Note: plaintext as current setup lacks hashing in route
    }
    
    await user.save();
    
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
