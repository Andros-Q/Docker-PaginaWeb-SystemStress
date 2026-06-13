-- Extensiones útiles para monitoreo y generación de datos
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- La tabla se creará vía Prisma, pero pre-configuramos permisos y extensiones
-- Configuración forzada para permitir saturación visible
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
