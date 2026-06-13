import { NextResponse } from 'next/server';
import { stopAllStress } from '@/lib/stress-engine';

export async function POST() {
  try {
    stopAllStress();
    return NextResponse.json({ success: true, message: 'Todos los procesos de stress detenidos con éxito' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

