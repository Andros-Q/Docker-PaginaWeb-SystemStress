import { NextResponse } from 'next/server';
import { stressCPU } from '@/lib/stress-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intensity, duration } = body; // duration en segundos
    const result = await stressCPU(intensity || 50, (duration || 30) * 1000);
    return NextResponse.json({ jobId: 'cpu-job', status: result.success ? 'started' : 'failed', message: result.message });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
