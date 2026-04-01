# # Etapa de dependencias
# FROM node:20-alpine AS deps
# RUN apk add --no-cache libc6-compat openssl
# WORKDIR /app

# # Copiar archivos de dependencias
# COPY package.json package-lock.json ./
# RUN npm ci

# # Etapa de construcción
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# # Generar cliente Prisma
# RUN npx prisma generate

# # Construir Next.js
# RUN npm run build

# # Etapa de producción
# FROM node:20-alpine AS runner
# WORKDIR /app

# # Configuración de producción
# ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1

# # Crear usuario no-root por seguridad
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# # Copiar archivos necesarios
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static

# # Copiar Prisma
# COPY --from=builder /app/prisma ./prisma
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# # Copiar package.json para scripts
# COPY --from=builder /app/package.json ./package.json

# # Dar permisos
# RUN chown -R nextjs:nodejs /app
# USER nextjs

# # Exponer puerto
# EXPOSE 3000

# ENV PORT=3000
# ENV HOSTNAME="0.0.0.0"

# # Comando para iniciar
# CMD ["node", "server.js"]

# Dockerfile
# Etapa base
FROM node:20-alpine AS base
WORKDIR /app

# Instalar OpenSSL y dependencias necesarias
RUN apk add --no-cache openssl

# Etapa de desarrollo
FROM base AS development
ENV NODE_ENV=development

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "dev"]

# Etapa de construcción para producción
FROM base AS production-builder
ENV NODE_ENV=production

# Copiar archivos de configuración primero
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./

# Copiar código fuente
COPY src ./src
COPY public ./public
COPY prisma ./prisma

# Instalar dependencias incluyendo devDependencies
RUN npm ci --include=dev

# Generar Prisma Client
RUN npx prisma generate

# Construir Next.js
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS runner
WORKDIR /app

# Configuración de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios
COPY --from=production-builder /app/public ./public
COPY --from=production-builder /app/.next/standalone ./
COPY --from=production-builder /app/.next/static ./.next/static

# Copiar Prisma
COPY --from=production-builder /app/prisma ./prisma
COPY --from=production-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=production-builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar package.json para scripts
COPY --from=production-builder /app/package.json ./package.json

# Dar permisos
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exponer puerto
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar
CMD ["node", "server.js"]