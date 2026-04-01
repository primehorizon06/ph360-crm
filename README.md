# PH360 CRM - Enterprise Architect

Una aplicación CRM (Customer Relationship Management) construida con Next.js, Prisma, PostgreSQL y NextAuth para la gestión de leads, usuarios y equipos.

## 🚀 Tecnologías Utilizadas

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js con credenciales
- **Contenedorización**: Docker & Docker Compose
- **Estilos**: Tailwind CSS con Material Design 3

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalados:

- **Node.js** 18+ (recomendado: 20.x)
- **npm**, **yarn** o **pnpm**
- **Docker** y **Docker Compose** (para desarrollo con contenedores)
- **PostgreSQL** (opcional, si no usas Docker)

## 🛠️ Instalación

1. **Clona el repositorio:**
   ```bash
   git clone <repository-url>
   cd crm-app
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   # o
   yarn install
   # o
   pnpm install
   ```

3. **Configura las variables de entorno:**
   Crea un archivo `.env.local` en la raíz del proyecto:
   ```env
   # Base de datos
   DATABASE_URL="postgresql://username:password@localhost:5432/crm_db"
   DIRECT_URL="postgresql://username:password@localhost:5432/crm_db"

   # NextAuth
   NEXTAUTH_SECRET="tu-secreto-super-seguro-aqui"
   NEXTAUTH_URL="http://localhost:3000"

   # Opcional: Credenciales de base de datos para Docker
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=crm_db
   ```

## 🗄️ Configuración de la Base de Datos

### Opción 1: Usando Docker (Recomendado)

1. **Levanta PostgreSQL con Docker:**
   ```bash
   npm run docker:up
   ```

2. **Ejecuta las migraciones:**
   ```bash
   npm run docker:migrate
   ```

3. **Genera el cliente de Prisma:**
   ```bash
   npx prisma generate
   ```

4. **Opcional: Ejecuta el seeder para datos de prueba:**
   ```bash
   npm run docker:seed
   ```

### Opción 2: Base de Datos Local

1. **Instala y configura PostgreSQL** en tu sistema.

2. **Ejecuta las migraciones:**
   ```bash
   npx prisma migrate dev
   ```

3. **Genera el cliente de Prisma:**
   ```bash
   npx prisma generate
   ```

4. **Opcional: Ejecuta el seeder:**
   ```bash
   npx prisma db seed
   ```

## 🚀 Ejecutar el Proyecto

### Desarrollo Local

1. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Desarrollo con Docker

1. **Inicia todo el entorno:**
   ```bash
   npm run dev:docker
   ```

   Esto levantará:
   - PostgreSQL en el puerto 5432
   - La aplicación Next.js en el puerto 3000
   - Adminer (interfaz web para PostgreSQL) en el puerto 8080

2. **Accede a la aplicación:**
   - CRM: [http://localhost:3000](http://localhost:3000)
   - Adminer: [http://localhost:8080](http://localhost:8080)

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo local
npm run dev:docker       # Inicia entorno completo con Docker

# Docker
npm run docker:up        # Levanta servicios de Docker
npm run docker:down      # Detiene servicios de Docker
npm run docker:build     # Construye imágenes de Docker
npm run docker:logs      # Muestra logs de Docker
npm run docker:migrate   # Ejecuta migraciones de Prisma
npm run docker:studio    # Abre Prisma Studio
npm run docker:seed      # Ejecuta seeder de datos
npm run docker:shell     # Accede al shell del contenedor

# Producción
npm run build            # Construye la aplicación
npm run start            # Inicia servidor de producción
```

## 🔧 Desarrollo

### Prisma Studio

Para visualizar y editar la base de datos:
```bash
npx prisma studio
# o con Docker
npm run docker:studio
```

### Linting

```bash
npm run lint
```

### Estructura del Proyecto

```
crm-app/
├── prisma/
│   ├── schema.prisma     # Esquema de la base de datos
│   ├── seed.ts          # Datos de prueba
│   └── migrations/      # Migraciones de Prisma
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # API Routes
│   │   ├── auth/        # Páginas de autenticación
│   │   └── globals.css  # Estilos globales
│   ├── middleware.ts    # Middleware de Next.js
│   └── types/           # Tipos TypeScript
├── docker/              # Configuración de Docker
├── scripts/             # Scripts de automatización
└── docker-compose.yml   # Configuración de Docker Compose
```

## 🔐 Autenticación

La aplicación utiliza NextAuth.js con proveedor de credenciales. Los usuarios se autentican con nombre de usuario y contraseña.

### Roles de Usuario

- **ADMIN**: Acceso completo al sistema
- **SUPERVISOR**: Gestión de equipos y leads
- **COACH**: Supervisión de agentes
- **AGENT**: Acceso básico a leads asignados

## 🚢 Despliegue

### Producción con Docker

1. **Construye la imagen:**
   ```bash
   docker build -f Dockerfile -t crm-app .
   ```

2. **Ejecuta el contenedor:**
   ```bash
   docker run -p 3000:3000 --env-file .env.local crm-app
   ```

### Variables de Entorno para Producción

Asegúrate de configurar estas variables en producción:
- `NODE_ENV=production`
- `DATABASE_URL` apuntando a tu base de datos PostgreSQL
- `NEXTAUTH_SECRET` con un secreto seguro
- `NEXTAUTH_URL` con la URL de tu dominio

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico, contacta al equipo de desarrollo o abre un issue en el repositorio.
