# Guía de Instalación — Stress App (Next.js + PostgreSQL + Jupyter)

## 1. Descripción del proyecto

Esta aplicación es una herramienta de **pruebas de estrés** construida en Next.js, que permite generar carga de CPU, memoria y base de datos, además de visualizar métricas en tiempo real. El stack completo se levanta con Docker Compose e incluye 4 servicios:

| Servicio | Imagen / Build | Función |
|---|---|---|
| `app` | Build local (Dockerfile) | Aplicación web Next.js (puerto 3000) |
| `stress-db` | `postgres:16` | Base de datos PostgreSQL |
| `stress-pgadmin` | `dpage/pgadmin4:8.5` | Administrador visual de la BD |
| `jupyter_lab` | `jupyter/scipy-notebook` | Notebook para análisis de datos |

## 2. Requisitos previos

- **Docker** y **Docker Compose** instalados (Docker Desktop en Windows/Mac, o `docker` + plugin `compose` en Linux).
- Puertos libres en tu máquina: `3000`, `5433`, `5050` y `8888`.
- Al menos ~2 GB de espacio libre en disco para las imágenes.

Verifica que Docker funciona correctamente:

```bash
docker --version
docker compose version
```

## 3. Descomprimir el proyecto

Descomprime el `.zip` y entra a la carpeta del proyecto:

```bash
unzip Docker-PaginaWeb-SystemStress-main.zip
cd Docker-PaginaWeb-SystemStress-main
```

> **Nota:** dentro del zip vas a notar algunos archivos sueltos y vacíos como `=`, `ERROR`, `[internal]`, `reading`, `transferring`, `Next.js` y `M%C3%A9tricas`. Son residuos de un log de consola (probablemente de un `docker build`) que se guardó por error como archivos individuales. **No son parte del proyecto** y los puedes borrar sin problema:
>
> ```bash
> rm -f "=" "ERROR" "[internal]" "reading" "transferring" "Next.js" "M#U00e9tricas"
> ```
> (Ojo: no borres `next.config.js`, ese sí es un archivo de configuración real del proyecto, distinto al archivo suelto llamado `Next.js`.)

## 4. Levantar los contenedores

Desde la raíz del proyecto (donde está `docker-compose.yml`), construye y levanta todo el stack:

```bash
docker compose up -d --build
```

Esto va a:
1. Construir la imagen de la app Next.js (instala dependencias, genera el cliente de Prisma y compila).
2. Descargar las imágenes de Postgres, pgAdmin y Jupyter.
3. Levantar los 4 contenedores conectados en la misma red (`stress-net`).

La app espera a que la base de datos esté "healthy" antes de arrancar, así que la primera vez puede tardar uno o dos minutos.

Verifica que todo esté corriendo:

```bash
docker compose ps
```

Deberías ver `stress-app`, `stress-db`, `stress-pgadmin` y `stress-ai-lab` en estado `Up` (o `healthy`).

## 5. Inicializar el esquema de la base de datos

El `docker-compose.yml` configura la base de datos y aplica algunos ajustes en `scripts/init-db.sql` (extensiones y parámetros de Postgres), pero **las tablas de la aplicación (definidas en Prisma) no se crean automáticamente**. Hay que sincronizarlas manualmente la primera vez:

```bash
docker compose exec app npx prisma db push
```

Esto crea en la base de datos `stress_db` las tablas definidas en `prisma/schema.prisma` (`StressLog`, `HeavyRecord`, `ConnectionTest`, `StressData`).

> Si en el futuro modificas el esquema (`schema.prisma`), repite este comando para aplicar los cambios.

## 6. Acceso a los servicios

| Servicio | URL | Credenciales |
|---|---|---|
| **Aplicación web** | http://localhost:3000 | — |
| **pgAdmin** (UI de la BD) | http://localhost:5050 | Usuario: `admin@admin.com` / Contraseña: `admin` |
| **Jupyter Notebook** | http://localhost:8888 | Token: `stresslab` |
| **PostgreSQL** (conexión directa) | `localhost:5433` | Usuario: `postgres` / Contraseña: `postgres` / BD: `stress_db` |

### Conectar pgAdmin a la base de datos
Al entrar a pgAdmin, registra un nuevo servidor con:
- **Host:** `stress-db` (nombre del contenedor, no `localhost`, ya que pgAdmin está dentro de la misma red Docker)
- **Puerto:** `5432`
- **Usuario:** `postgres`
- **Contraseña:** `postgres`

### Notebook de Jupyter
Los notebooks que crees dentro de Jupyter se guardan en la carpeta `./notebooks` del proyecto (se monta como volumen), así que persisten aunque reinicies el contenedor. Si la carpeta `notebooks/` no existe todavía en tu proyecto, Docker la crea automáticamente al levantar el servicio.

Para conectarte a la base de datos desde una celda del notebook (usando, por ejemplo, `psycopg2` o `sqlalchemy`), usa estos datos de conexión:
```
host: stress-db
port: 5432
user: postgres
password: postgres
database: stress_db
```

## 7. Comandos útiles

```bash
# Ver logs en vivo de un servicio
docker compose logs -f app

# Detener todo sin borrar datos
docker compose stop

# Reiniciar
docker compose start

# Apagar y eliminar contenedores (los datos de la BD persisten en el volumen)
docker compose down

# Apagar y borrar TODO incluyendo los datos de la base de datos
docker compose down -v

# Reconstruir la imagen de la app tras cambios en el código
docker compose up -d --build app
```

## 8. Solución de problemas comunes

- **El puerto ya está en uso:** si tienes otro Postgres corriendo en `5432`/`5433` o algo en `3000`, `5050` u `8888`, cambia el mapeo de puertos en `docker-compose.yml` (por ejemplo `"3001:3000"`) y vuelve a levantar.
- **La app no se conecta a la BD:** revisa que `stress-db` esté en estado `healthy` (`docker compose ps`) antes de que arranque `app`. Si falla, revisa logs con `docker compose logs stress-db`.
- **Las páginas cargan pero no hay datos / error 500 en las rutas API:** lo más probable es que falte el paso 5 (`prisma db push`), o sea ejecutarlo de nuevo.
- **`npm run db:seed` no funciona:** el script apunta a `scripts/seed.ts`, archivo que no viene incluido en este proyecto. Puedes ignorarlo o crear tu propio script de semillas si lo necesitas.

## 9. Estructura relevante del proyecto

```
.
├── docker-compose.yml      # Orquesta los 4 servicios
├── Dockerfile               # Build multi-etapa de la app Next.js
├── prisma/schema.prisma     # Modelo de datos
├── scripts/init-db.sql      # Extensiones y tuning de Postgres
├── src/app/                 # Código de la app (páginas + rutas API)
│   └── api/
│       ├── metrics/         # Endpoints de métricas (sistema / BD)
│       └── stress/          # Endpoints para generar estrés (cpu/memoria/db/combinado)
└── notebooks/                # (se crea al levantar Jupyter) tus notebooks de análisis
```

---

Con estos pasos deberías tener el entorno completo funcionando: la app web en el puerto 3000, la base de datos PostgreSQL, pgAdmin para inspeccionarla visualmente, y Jupyter para hacer análisis de las métricas generadas.
