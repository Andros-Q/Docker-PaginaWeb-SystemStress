import { NextResponse } from 'next/server';
import { stressCombined } from '@/lib/stress-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await stressCombined({
      cpu: { intensity: body.cpu?.intensity || 80, duration: body.cpu?.duration || 30 },
      memory: { megabytes: body.memory?.megabytes || 512, duration: body.memory?.duration || 30 },
      db: { connections: body.db?.connections || 20, duration: body.db?.duration || 30 }
    });
    return NextResponse.json({ success: true, message: 'Estrés combinado inyectado globalmente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
