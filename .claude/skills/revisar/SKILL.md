---
name: revisar
description: Revisa código de PH360 CRM contra las reglas del proyecto (aislamiento entre franquicias, patrón de rutas API, SWR, React Hook Form + Zod, tokens de estilo) y buenas prácticas generales. Sin argumentos revisa los cambios sin commitear; con "todo" audita el proyecto completo; con una ruta revisa esa carpeta o archivo. Usar cuando el usuario pida revisar, auditar o validar código.
---

# Revisión de código — PH360 CRM

## Alcance según el argumento

| Invocación | Qué revisar |
|---|---|
| `/revisar` | `git diff HEAD` + archivos sin seguimiento (`git status --porcelain`). Si no hay cambios, dilo y termina. |
| `/revisar todo` | Todo `src/` más `prisma/schema.prisma`, `next.config.ts` y `src/proxy.ts`. |
| `/revisar <ruta>` | Solo esa carpeta o archivo. |

En modo diff, lee el archivo completo de cada cambio (no solo el hunk): muchos fallos de permisos se ven solo con el contexto del handler entero.

En modo `todo`, sigue este orden (de mayor a menor riesgo) y no pases al siguiente bloque sin terminar el anterior:
1. `src/app/api/**` y `src/lib/**` — seguridad y aislamiento de datos.
2. `src/proxy.ts`, `src/lib/auth.ts`, `next.config.ts`.
3. Componentes y páginas (`src/app/(dashboard)`, `src/components`, `src/hooks`).
4. Corre `./node_modules/.bin/tsc --noEmit -p .` y `./node_modules/.bin/eslint src` y suma sus errores.

Los comandos de Node deben correr dentro de WSL: `wsl.exe -d Ubuntu -- bash -ic "cd ~/projects/ph360-crm && <comando>"`.

## Lista de verificación

### 1. Aislamiento entre franquicias (CRÍTICO)

- [ ] Toda consulta de listas de `Lead` usa `buildScopeFilter()` de `src/lib/permissions.ts`.
- [ ] Toda ruta que recibe un `id` de lead, **o de algo que cuelga de un lead** (nota, adjunto, producto, recordatorio, plan de pago), carga el lead padre y llama a `canAccessLead()` antes de leer o escribir. Revisa especialmente las rutas que reciben `leadId` en el body o en query string, no solo en la URL.
- [ ] Todo `update`/`delete` por `id` de un recurso personal (notificación, recordatorio) filtra también por el dueño (`userId`/`assignedToId`) en el `where`, o verifica la propiedad antes.
- [ ] Los ids que llegan del cliente y apuntan a otros usuarios, equipos o franquicias (`assignedToId`, `teamId`, `userId`, `companyId`) se validan contra el alcance del usuario de la sesión. Un SUPERVISOR solo toca su `companyId`; un COACH solo su `teamId`.
- [ ] Los endpoints que devuelven usuarios, equipos o franquicias no exponen datos de otras franquicias a roles no ADMIN.
- [ ] Coherencia del alcance de COACH: `buildScopeFilter` usa `assignedTo.teamId`, mientras que `canAccessLead` y el dashboard usan `lead.teamId`. Si el cambio reasigna un lead, `teamId` del lead debe actualizarse junto con `assignedToId`.

### 2. Rutas API

- [ ] El handler está envuelto con `withAuth` o `withAuthParams` (excepción documentada: el stream SSE).
- [ ] Las respuestas de error usan `badRequest()`, `forbidden()`, `notFound()`, `conflict()`, no `NextResponse.json({ error }, { status })` a mano.
- [ ] El body se valida con Zod (`safeParse`) antes de usarse. No se desestructura `await req.json()` directo hacia Prisma.
- [ ] Parámetros de query que se convierten a enum de Prisma se validan (`valor in EnumPrisma`), no con `as`.
- [ ] Las comprobaciones de rol del backend coinciden con los helpers que usa la UI (`canResubmitProduct`, `canSuspendLead`, etc.). Si la UI muestra un botón a un rol, la API debe aceptar ese rol, y viceversa.
- [ ] Varias escrituras que deben ocurrir juntas van en `prisma.$transaction`.
- [ ] Las transiciones de estado verifican el estado actual (p. ej. no aprobar algo que ya no está `PENDING`).
- [ ] Las acciones sensibles registran `logAudit()`, y `metadata` nunca lleva SSN, números de cuenta ni de ruta en claro.
- [ ] Los campos sensibles (SSN, cuentas) se cifran con `src/lib/crypto.ts` antes de guardarse.

### 3. Autenticación y sesión

- [ ] Los mensajes de error del login no distinguen "usuario no existe" de "contraseña incorrecta".
- [ ] Nada nuevo depende de datos del JWT que puedan quedar viejos (rol, `active`) para decisiones críticas sin re-verificar en BD.
- [ ] Rutas nuevas de páginas restringidas por rol están cubiertas en `src/proxy.ts`.

### 4. Frontend

- [ ] La carga de datos usa SWR (`useSWR` + `fetcher`). `useEffect` + `fetch` para cargar datos es legado: márcalo.
- [ ] Toda mutación con `fetch` revisa `res.ok` y muestra el error del servidor (`toast.error(data.error)`). No se muestra éxito si alguna petición falló.
- [ ] Formularios con React Hook Form + `zodResolver`; componentes propios con `Controller`, no `register` + `setValue` manual.
- [ ] Colores con tokens semánticos de `globals.css` (`bg-surface`, `text-on-surface`, `text-error`...). Hex, `rgba()` en `style` o paletas crudas (`text-red-500`, `bg-white/10`) son incumplimiento.
- [ ] Sin `any`, sin `console.log`, sin imports sin uso, sin `eslint-disable` sin justificación.
- [ ] Imágenes con `next/image` salvo motivo claro.

### 5. General

- [ ] Sin código muerto (hooks o funciones que llaman endpoints que no existen, estados que nunca se leen).
- [ ] Variables de entorno nuevas declaradas en `src/env.ts`.
- [ ] Fechas de quincenas: cuidado con la zona horaria del servidor al construir rangos con `new Date(año, mes, día)`.
- [ ] Esta versión de Next.js tiene cambios incompatibles: ante dudas de API, consulta `node_modules/next/dist/docs/`.

## Cómo reportar

1. Verifica cada hallazgo leyendo el código real antes de reportarlo. Si depende de cómo lo llama el frontend, revisa también el llamador. Descarta lo que no puedas confirmar o márcalo como "a confirmar".
2. Agrupa por severidad:
   - **Crítico** — fuga de datos entre franquicias o usuarios, escalada de permisos, datos sensibles expuestos.
   - **Alto** — bug que rompe un flujo real o corrompe datos.
   - **Medio** — validación faltante, inconsistencias, escrituras no atómicas.
   - **Bajo** — convenciones, estilo, código muerto.
3. Cada hallazgo lleva: enlace `[archivo.ts:línea](ruta#Llínea)`, qué pasa, **un escenario concreto** (quién hace qué y qué obtiene) y la corrección sugerida en una línea.
4. Para incumplimientos repetidos en muchos archivos (p. ej. colores crudos), da el conteo y los archivos más afectados en vez de listar cada línea.
5. En modo `todo`, guarda el informe completo en `docs/auditorias/AAAA-MM-DD.md` y en el chat muestra solo el resumen y los críticos y altos.
6. **No corrijas nada** a menos que el usuario lo pida. Al final, ofrece corregir empezando por los críticos.
