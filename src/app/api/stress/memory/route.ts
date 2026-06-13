import { NextResponse } from 'next/server';
import { stressMemory } from '@/lib/stress-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { megabytes, duration } = body;
    const result = await stressMemory(megabytes || 256, (duration || 30) * 1000);
    return NextResponse.json({ jobId: 'memory-job', status: result.success ? 'started' : 'failed', message: result.message });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
