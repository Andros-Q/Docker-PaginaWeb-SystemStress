import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Variable global para poder cancelar la operación en bucle con el botón de parada de emergencia
let isRunning = false;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, totalRecords = 5000, batchSize = 500, iterations = 20 } = body;

    if (action === 'stop') {
      isRunning = false;
      return NextResponse.json({ message: 'Proceso de base de datos detenido' });
    }

    isRunning = true;

    // --- ENFOQUE 1: INYECCIÓN MASIVA DE SELECTS (QUERY FLOOD -> CPU POSTGRES) ---
    if (action === 'query') {
      // Ejecuta de forma asíncrona un bombardeo de consultas complejas para no bloquear el hilo principal de Next.js
      (async () => {
        for (let i = 0; i < iterations && isRunning; i++) {
          // Usamos generate_series y funciones matemáticas pesadas directas en el motor de Postgres
          // para simular agregaciones analíticas pesadas y saturar la CPU de postgres
          await prisma.$queryRaw`
            SELECT 
              s.id, 
              md5(random()::text) as hash,
              sha256(random()::text::bytea) as sha,
              sqrt(s.id)::numeric as raiz
            FROM generate_series(1, 80000) as s(id)
            ORDER BY hash DESC 
            LIMIT 5000;
          `;
        }
        isRunning = false;
      })();

      return NextResponse.json({ message: 'Query Flood iniciado con éxito (Saturando CPU de Postgres)' });
    }

    // --- ENFOQUE 2: INSERCIÓN EN LOTES (INSERT FLOOD -> I/O DISCO & WAL) ---
    if (action === 'insert') {
      // Ejecución controlada en bloques usando createMany para forzar la escritura masiva al WAL de Postgres
      (async () => {
        let recordsCreated = 0;

        while (recordsCreated < totalRecords && isRunning) {
          // Determinar cuántos elementos insertar en el lote actual
          const currentBatchSize = Math.min(batchSize, totalRecords - recordsCreated);
          
          // Construir el lote de datos simulados pesados
          const batchData = Array.from({ length: currentBatchSize }).map(() => ({
            data: "REGISTRO_DE_ESTRES_DE_SISTEMAS_OPERATIVOS_" + Math.random().toString(36).substring(2, 15),
            number: Math.floor(Math.random() * 100000)
          }));

          // Inserción en bloque masiva
          await prisma.stressData.createMany({
            data: batchData,
          });

          recordsCreated += currentBatchSize;
          
          // Pequeño descanso de milisegundos para permitir alternancia de hilos
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        isRunning = false;
      })();

      return NextResponse.json({ 
        message: `Insert Flood iniciado en lotes de ${batchSize} hasta completar ${totalRecords} registros (Saturando I/O Disco)` 
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
