'use client';

import { useState, useEffect } from 'react';

// Interfaces de tipado estricto para las respuestas de la API
interface SystemMetrics {
  cpu: { usage: number; cores: number[]; loadAvg: number[] };
  memory: { total: number; used: number; free: number; percentage: number };
  disk: { read: number; write: number; usage: number };
  network: { rx: number; tx: number };
  processes: { total: number; running: number; sleeping: number };
  uptime: number;
}

interface DbMetrics {
  connections: { active: number; idle: number; total: number; maxConnections: number };
  queries: { qps: number; slowQueries: number; avgDuration: number };
  bufferHitRate: number;
}

export default function Dashboard() {
  // Estados para las métricas del sistema y la base de datos
  const [system, setSystem] = useState<SystemMetrics | null>(null);
  const [db, setDb] = useState<DbMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados para los formularios de control de estrés (CPU y Consultas)
  const [cpuIntensity, setCpuIntensity] = useState<number>(70);
  const [cpuDuration, setCpuDuration] = useState<number>(30);
  const [dbConnections, setDbConnections] = useState<number>(25);
  const [dbDuration, setDbDuration] = useState<number>(30);

  // 🟢 NUEVOS ESTADOS COMPATIBLES PARA INSERCIÓN EN LOTES (REMPLAZAN ENFOQUE DE RAM)
  const [totalRecords, setTotalRecords] = useState<number>(20000);
  const [batchSize, setBatchSize] = useState<number>(1000);

  // Estado global de ejecución de ataques
  const [isStressing, setIsStressing] = useState<boolean>(false);
  const [stressMessage, setStressMessage] = useState<string>('');

  // Efecto de consulta periódica (Polling) cada 2 segundos
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [sysRes, dbRes] = await Promise.all([
          fetch('/api/metrics/system'),
          fetch('/api/metrics/db')
        ]);

        if (!sysRes.ok || !dbRes.ok) throw new Error('Error al consultar los endpoints de monitoreo.');

        const sysData = await sysRes.json();
        const dbData = await dbRes.json();

        setSystem(sysData);
        setDb(dbData);
        setError(null);
      } catch (err) {
        // Controlamos que la UI no se rompa si se pierde un frame de datos bajo stress masivo.
      }
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Función genérica para disparar ataques de estrés (POST)
  const triggerStress = async (endpoint: string, payload: object) => {
    setIsStressing(true);
    setStressMessage('Inyectando carga de trabajo al contenedor...');
    try {
      const res = await fetch(`/api/stress/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setStressMessage(data.message || 'Ataque iniciado con éxito.');
    } catch (err) {
      setStressMessage('Error al comunicar con el despachador de estrés.');
    }
  };

  // 🚨 BOTÓN DE PÁNICO INTEGRAL VINCULADO CORRECTAMENTE
  const stopAllStress = async () => {
    setStressMessage('Enviando señal de detención inmediata a todos los contenedores...');
    try {
      // 1. Detiene hilos de CPU y contenedores base
      const resGeneral = await fetch('/api/stress/stop', { method: 'POST' });
      const dataGeneral = await resGeneral.json();

      // 2. Rompe los bucles asíncronos activos dentro de PostgreSQL
      await fetch('/api/stress/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      setStressMessage(`${dataGeneral.message} + Procesos asíncronos de DB abortados.`);
      setIsStressing(false);
    } catch (err) {
      setStressMessage('Error crítico al detener los bucles de estrés.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-mono selection:bg-red-500 selection:text-white">
      {/* Encabezado Principal */}
      <header className="border-b border-slate-800 pb-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-red-500 tracking-wider">
            SYSTEM STRESS MONITOR v1.0
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Entorno de pruebas académicas en contenedores Docker sobre WSL2
          </p>
        </div>

        {/* Botón de Emergencia Global */}
        <button
          onClick={stopAllStress}
          className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded border border-red-400 shadow-lg shadow-red-900/40 transition-all uppercase animate-pulse"
        >
          🚨 DETENER TODO STRESS
        </button>
      </header>

      {stressMessage && (
        <div className="mb-6 p-3 bg-slate-900 border-l-4 border-amber-500 text-amber-400 text-xs rounded">
          <span className="font-bold">LOG_SISTEMA_ACTUAL:</span> {stressMessage}
        </div>
      )}

      {/* RECUADROS DE MÉTRICAS EN TIEMPO REAL */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

        {/* TARJETA 1: MÉTRICAS DE CPU */}
        <div className="bg-slate-900 p-5 rounded border border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">🖥️ Carga Total CPU</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-white">{system?.cpu.usage ?? 0}%</span>
            <span className="text-xs text-slate-500">en uso activo</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full transition-all duration-1000 ${
                (system?.cpu.usage ?? 0) > 75 ? 'bg-red-500' : (system?.cpu.usage ?? 0) > 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${system?.cpu.usage ?? 0}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Núcleos detectados: <span className="text-slate-200">{system?.cpu.cores.length ?? 0} Cores</span></p>
            <p>Load Average: <span className="text-slate-200">{system?.cpu.loadAvg.map(l => l.toFixed(2)).join(' | ') ?? '0.00'}</span></p>
          </div>
        </div>

        {/* TARJETA 2: MÉTRICAS DE RAM */}
        <div className="bg-slate-900 p-5 rounded border border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">💾 Consumo de Memoria RAM</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-white">{system?.memory.percentage ?? 0}%</span>
            <span className="text-xs text-slate-500">
              {system ? Math.round(system.memory.used / 1024 / 1024 / 1024) : 0} GB de {system ? Math.round(system.memory.total / 1024 / 1024 / 1024) : 0} GB
            </span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full transition-all duration-1000 ${
                (system?.memory.percentage ?? 0) > 80 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${system?.memory.percentage ?? 0}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 flex justify-between">
            <span>Libre: {system ? (system.memory.free / 1024 / 1024 / 1024).toFixed(2) : 0} GB</span>
            <span>Uptime: {system ? `${Math.floor(system.uptime / 60)} min` : '--'}</span>
          </div>
        </div>

        {/* TARJETA 3: MÉTRICAS DE POSTGRESQL */}
        <div className="bg-slate-900 p-5 rounded border border-slate-800 md:col-span-2 lg:col-span-1">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">🗄️ Servidor PostgreSQL (stress-db)</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-indigo-400">{db?.connections.active ?? 0}</span>
            <span className="text-xs text-slate-500">Conexiones activas simultáneas</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-indigo-500 transition-all duration-1000"
              style={{ width: `${((db?.connections.total ?? 0) / (db?.connections.maxConnections || 200)) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Pool Total abierto: <span className="text-slate-200">{db?.connections.total ?? 0} / {db?.connections.maxConnections ?? 200}</span></p>
            <p>Buffer Hit Rate: <span className="text-emerald-400 font-bold">{db?.bufferHitRate ?? 100}% (Caché óptimo)</span></p>
          </div>
        </div>
      </section>

      {/* MANDOS DE OPERACIÓN / INYECCIÓN DE STRESS */}
      <h2 className="text-lg font-black text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
        🛠️ Panel de Inyección de Carga Maliciosa (Simulada)
      </h2>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* CONTROL DE CPU */}
        <div className="bg-slate-900 p-5 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-red-400 uppercase mb-3">🔥 Inundación de Peticiones HTTP Concurrentes</h3>
            <p className="text-xs text-slate-400 mb-4">Ejecuta bucles matemáticos infinitos bloqueando los subprocesos de Node.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Intensidad Máxima ({cpuIntensity}%):</label>
                <input
                  type="range" min="10" max="95" value={cpuIntensity}
                  onChange={(e) => setCpuIntensity(Number(e.target.value))}
                  className="w-full accent-red-500 bg-slate-800 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duración (segundos):</label>
                <input
                  type="number" value={cpuDuration}
                  onChange={(e) => setCpuDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 p-2 text-sm text-white rounded font-mono"
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => triggerStress('cpu', { intensity: cpuIntensity, duration: cpuDuration })}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold text-xs uppercase border border-red-900 rounded tracking-wider transition-colors"
          >
            Lanzar Stress CPU 🚀
          </button>
        </div>

        {/* 💿 NUEVA TARJETA CENTRAL: INUNDACIÓN DE INSERCIONES (CUMPLE RÚBRICA DE DISCO I/O) */}
        <div className="bg-slate-900 p-5 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-amber-400 uppercase mb-3">💿 Inundación de Inserciones (I/O Disco)</h3>
            <p className="text-xs text-slate-400 mb-4">Estresa el almacenamiento escribiendo bloques masivos en lotes modificables al WAL de Postgres.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Registros Totales:</label>
                <input
                  type="number" value={totalRecords}
                  onChange={(e) => setTotalRecords(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 p-2 text-sm text-white rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tamaño del Lote (Batch Size):</label>
                <input
                  type="number" value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 p-2 text-sm text-white rounded font-mono"
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => triggerStress('db', { action: 'insert', totalRecords, batchSize })}
            className="w-full py-2 bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 font-bold text-xs uppercase border border-amber-900 rounded tracking-wider transition-colors"
          >
            Saturar Escritura (I/O) 🚀
          </button>
        </div>

        {/* CONTROL DE CONSULTAS BASE DE DATOS */}
        <div className="bg-slate-900 p-5 rounded border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-indigo-400 uppercase mb-3">💥 Inundación Queries (CPU DB)</h3>
            <p className="text-xs text-slate-400 mb-4">Satura el procesador del contenedor relacional ejecutando funciones criptográficas y ordenamientos.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Iteraciones del Ciclo:</label>
                <input
                  type="number" min="5" max="100" value={dbConnections}
                  onChange={(e) => setDbConnections(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 p-2 text-sm text-white rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duración Máxima (seg):</label>
                <input
                  type="number" value={dbDuration}
                  onChange={(e) => setDbDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 p-2 text-sm text-white rounded font-mono"
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => triggerStress('db', { action: 'query', iterations: dbConnections })}
            className="w-full py-2 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-400 font-bold text-xs uppercase border border-indigo-900 rounded tracking-wider transition-colors"
          >
            Colapsar CPU Postgres 🚀
          </button>
        </div>

      </section>

      {/* BOTÓN ATAQUE MÁXIMO COMBINADO */}
      <footer className="w-full p-4 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border border-red-900/50 rounded flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h3 className="text-sm font-black text-red-500 uppercase">⚡ ATAQUE COMBINADO INTEGRAL (STRESS TOTAL)</h3>
          <p className="text-xs text-slate-400 mt-1">Dispara simultáneamente los 3 vectores de colapso de hardware y persistencia.</p>
        </div>
        <button
          onClick={() => {
            triggerStress('cpu', { intensity: 85, duration: 25 });
            triggerStress('db', { action: 'insert', totalRecords: 15000, batchSize: 500 });
            triggerStress('db', { action: 'query', iterations: 20 });
          }}
          className="w-full md:w-auto px-8 py-3 bg-red-950 text-red-200 border border-red-500 font-bold text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all uppercase rounded"
        >
          💥 PROPAGAR STRESS GLOBAL
        </button>
      </footer>
    </main>
  );
}
