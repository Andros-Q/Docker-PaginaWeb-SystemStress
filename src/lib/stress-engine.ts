import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StressResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

export interface StressStatus {
  cpu: boolean;
  memory: boolean;
  db: boolean;
  active: boolean;
}

let activeIntervals: NodeJS.Timeout[] = [];
let isCpuStressing = false;
let isMemoryStressing = false;
let isDbStressing = false;
let memoryBuffers: Buffer[] = [];

export function getStressStatus(): StressStatus {
  return {
    cpu: isCpuStressing,
    memory: isMemoryStressing,
    db: isDbStressing,
    active: isCpuStressing || isMemoryStressing || isDbStressing
  };
}

export function stopAllStress(): void {
  activeIntervals.forEach(clearInterval);
  activeIntervals = [];
  isCpuStressing = false;
  isMemoryStressing = false;
  isDbStressing = false;
  memoryBuffers = []; // Liberamos memoria de inmediato
}

// 3.1 Algoritmo de Stress de CPU
export async function stressCPU(intensity: number, durationMs: number): Promise<StressResult> {
  if (isCpuStressing) return { success: false, message: 'Estrés de CPU ya en ejecución', timestamp: new Date() };
  isCpuStressing = true;
  const startTime = Date.now();
  
  const intervalId = setInterval(() => {
    if (Date.now() - startTime > durationMs) {
      clearInterval(intervalId);
      isCpuStressing = false;
      return;
    }
    // Bloqueo intencional del hilo mediante cálculos matemáticos complejos infinitos por ráfagas
    const targetTime = Date.now() + (intensity * 12);
    while (Date.now() < targetTime) {
      Math.sqrt(Math.random() * Math.random());
    }
  }, 100 - intensity);

  activeIntervals.push(intervalId);
  return { success: true, message: 'Estrés de CPU inicializado', timestamp: new Date() };
}

// 3.2 Algoritmo de Stress de Memoria
export async function stressMemory(mbToAllocate: number, durationMs: number): Promise<StressResult> {
  if (isMemoryStressing) return { success: false, message: 'Estrés de RAM ya en ejecución', timestamp: new Date() };
  isMemoryStressing = true;
  const startTime = Date.now();

  try {
    const bytesToAllocate = mbToAllocate * 1024 * 1024;
    const buffer = Buffer.alloc(bytesToAllocate, 'S');
    memoryBuffers.push(buffer);

    const intervalId = setInterval(() => {
      if (Date.now() - startTime > durationMs) {
        clearInterval(intervalId);
        isMemoryStressing = false;
        memoryBuffers = [];
        return;
      }
      // Escritura cíclica para obligar al kernel a mantener las páginas en RAM física
      for (let i = 0; i < buffer.length; i += 8192) {
        buffer[i] = Math.floor(Math.random() * 255);
      }
    }, 100);

    activeIntervals.push(intervalId);
    return { success: true, message: `Asignados ${mbToAllocate}MB en RAM de forma activa`, timestamp: new Date() };
  } catch (err: any) {
    isMemoryStressing = false;
    return { success: false, message: err.message, timestamp: new Date() };
  }
}

// 3.3 Algoritmo de Stress de Base de Datos
export async function stressDatabase(concurrentConnections: number, durationMs: number): Promise<StressResult> {
  if (isDbStressing) return { success: false, message: 'Estrés de base de datos ya en ejecución', timestamp: new Date() };
  isDbStressing = true;
  const startTime = Date.now();

  const intervalId = setInterval(async () => {
    if (Date.now() - startTime > durationMs) {
      clearInterval(intervalId);
      isDbStressing = false;
      return;
    }
    // Ejecución masiva de Cross Joins pesados concurrentes para colapsar la cola de conexiones
    for (let i = 0; i < concurrentConnections; i++) {
      prisma.$queryRaw`
        SELECT h1.id FROM "HeavyRecord" h1 
        CROSS JOIN "HeavyRecord" h2 
        LIMIT 5
      `.catch(() => {});
    }
  }, 150);

  activeIntervals.push(intervalId);
  return { success: true, message: `Enviando queries concurrentes a PostgreSQL`, timestamp: new Date() };
}

// 3.4 Algoritmo de Stress Combinado
export async function stressCombined(config: { cpu: { intensity: number; duration: number }; memory: { megabytes: number; duration: number }; db: { connections: number; duration: number } }): Promise<void> {
  await stressCPU(config.cpu.intensity, config.cpu.duration * 1000);
  await stressMemory(config.memory.megabytes, config.memory.duration * 1000);
  await stressDatabase(config.db.connections, config.db.duration * 1000);
}
