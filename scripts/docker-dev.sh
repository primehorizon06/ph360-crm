#!/bin/bash

echo "🚀 Iniciando entorno de desarrollo con Docker..."

# Detener servicios existentes si los hay
docker-compose down

# Levantar solo postgres y adminer
docker-compose up -d postgres adminer

# Esperar a que postgres esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

# Ejecutar migraciones
echo "📦 Ejecutando migraciones de Prisma..."
docker-compose run --rm prisma-migrate npx prisma migrate dev

# Generar Prisma Client
echo "🔧 Generando Prisma Client..."
docker-compose run --rm nextjs-dev npx prisma generate

# Levantar Next.js en modo desarrollo con hot reload
echo "🔥 Levantando Next.js en modo desarrollo..."
docker-compose up nextjs-dev