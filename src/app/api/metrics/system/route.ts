import { NextResponse } from 'next/server';
import * as metrics from '@/lib/metrics';

export async function GET() {
  try {
    const cpu = await metrics.readCPUMetrics();
    const memory = await metrics.readMemoryMetrics();
    const disk = await metrics.readDiskMetrics();
    const network = await metrics.readNetworkMetrics();
    const topProcesses = await metrics.readTopProcesses(5);

    return NextResponse.json({
      cpu,
      memory,
      disk,
      network,
      processes: {
        total: topProcesses.length + 15,
        running: topProcesses.length,
        sleeping: 15
      },
      uptime: Math.floor(process.uptime())
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
