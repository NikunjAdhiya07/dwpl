import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('dwpl_role')?.value;
    
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('dwpl_role')?.value;
    
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    await connectDB();
    
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    const user = new User(body);
    await user.save();
    
    const userObject: any = user.toObject();
    delete userObject.password; // Don't send back password
    
    return NextResponse.json({ success: true, data: userObject });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
