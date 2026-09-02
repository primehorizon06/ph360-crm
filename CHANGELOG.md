# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

## [Unreleased]

### Added

- **feat**(errors): añade error boundary `error.tsx` en segmento `(dashboard)` para fallos de server components con botón de reintento
- **perf**(suspense): añade `loading.tsx` al segmento `(dashboard)` para UI de carga automática en navegación
- **perf**(suspense): crea `LeadDetailClient` y `CustomerDetailClient` como componentes cliente separados, envueltos en `<Suspense>` desde server wrappers en `page.tsx`
- **perf**(suspense): extrae `SearchParamsWatcher` en login y lo envuelve en `<Suspense>` para cumplir con el patrón requerido por Next.js 15+
- **ia**(skills): añade skill `conventional-commit` para gestión de commits atómicos y changelog
- **feat**(leads): calcula y muestra la edad junto a la fecha de nacimiento en el formulario de lead; exige confirmar carta de emancipación cuando la edad está entre 18 y 20 años, en creación y edición
- **feat**(leads): añade campo "Edad" calculado en la pestaña Datos Personales del detalle de lead
- **feat**(products): reorganiza el formulario de asociar producto y el plan de pagos a 2 columnas; el botón "Asociar producto" pasa a ser `children` de `PaymentPlanPicker` junto a la lista de cuotas
- **feat**(storage): migra adjuntos de notas y avatares de disco local a Supabase Storage, con bucket privado para adjuntos (servidos solo vía `/api/attachments/[id]` con validación de permisos) y bucket público para avatares; cae a disco local si no hay credenciales configuradas (Docker local)
- **feat**(companies): permite al ADMIN subir un logo por franquicia (`Company.logo`), reutilizando el mismo bucket público de avatares; nuevo endpoint `POST /api/companies/[id]/logo`, visible en el modal de editar franquicia y en el listado

### Changed

- **refactor**(leads): reemplaza `watch()` por `useWatch({ control, name })` en `LeadModal` y `LeadEditModal` para evitar que React Compiler omita la memoización del componente
- **refactor**(attachments): `AttachmentPreview` elimina el lightbox modal y abre imágenes y PDFs en una pestaña nueva del navegador (`target="_blank"`)
- **fix**(products): reordena los campos del formulario de cuenta bancaria a Banco, Titular, No. de ruta, No. de cuenta y Tipo de cuenta
- **refactor**(products): migra la carga de productos en `ProductsTab` de `useEffect` + `fetch` a SWR y reemplaza `watch()` por `useWatch()`, eliminando los warnings de dependencia faltante y de React Compiler
- **feat**(notes): permite fijar una sola nota por lead de forma persistente, con nuevo endpoint `PATCH /api/notes/[id]` y campo `pinned` en el modelo `Note`
- **style**(ui): agranda tipografía y espaciado del modal `ConfirmProductModal`
- **fix**(layout): `Sidebar` resalta el ítem activo también en subrutas (`/leads/9`, no solo `/leads`) y aclara el color de los ítems inactivos a `text-white/90`
- **style**(ui): reemplaza `text-white/40` por el token semántico `text-on-surface-variant` en toda la app para mejorar el contraste de etiquetas y textos secundarios
- **style**(products): agranda la letra y aclara el color de la información de método de pago y del plan de pagos ya asociado en la tarjeta de producto
- **style**(ui): reemplaza `text-white/50` (y variantes cercanas) por `text-white/90` en el resto de la app para mejorar el contraste

### Fixed

- **fix**(leads): corrige error de build en producción (`'.partial() cannot be used on object schemas containing refinements'`) separando `leadObjectSchema` (base) de `leadSchema` (con `superRefine` de carta de emancipación); `PATCH /api/leads/[id]` ahora usa el schema base para `.partial()`
- **fix**(ui): corrige colores del calendario inline (`react-datepicker`): "hoy" ahora es solo borde blanco sin relleno, las cuotas seleccionadas se ven en cyan y se neutraliza el resaltado de teclado; corrige recorte del calendario en meses de 6 filas y elimina clases Tailwind arbitrarias que nunca compilaban por conflicto de escapado con el `__` de las clases BEM de la librería
- **fix**(leads): `leadSchema` rechaza fechas de nacimiento con edad menor a 18 años ("El lead debe ser mayor de edad"), tanto en el formulario como en `POST /api/leads`; antes solo se validaba el rango 18-20 y permitía crear leads de 0 años
- **fix**(leads): valida `canAccessLead` antes de exponer el detalle de un lead, sus notas y sus adjuntos, y antes de crear notas o subir adjuntos (corrige IDOR: cualquier usuario autenticado podía leer datos de leads ajenos, incluido el SSN desencriptado, solo conociendo el ID)
- **fix**(avatar): `Avatar` usa `<img>` en vez de `next/image`, que rechazaba las URLs de Supabase Storage porque `SUPABASE_URL` no estaba disponible durante el build de Docker en Render (los placeholders de env solo cubrían `DATABASE_URL`, `NEXTAUTH_SECRET` y `ENCRYPTION_KEY`); se agrega `SUPABASE_URL` como variable de build en el `Dockerfile` para que la Content-Security-Policy también quede bien armada
- **fix**(build): agrega placeholder de `SUPABASE_SERVICE_ROLE_KEY` en el `Dockerfile`; faltaba junto al de `SUPABASE_URL` y rompía el build (`env.ts` exige que ambas estén configuradas juntas)
- **fix**(auth): el login usa `window.location.href` en vez de `router.push` tras un inicio de sesión exitoso, para que el navegador detecte una navegación real y pueda ofrecer guardar la contraseña
- **fix**(auth): `authorize()` nunca incluía `avatar` en el objeto de usuario devuelto a NextAuth, así que el avatar jamás llegaba al JWT/sesión sin importar cuántas veces se reingresara

### Changed

- **style**(leads): mueve la edad calculada junto al título "Fecha de nacimiento" en lugar de al lado del input, en los formularios de crear y editar lead

### Added

- **refactor**(api): extrae lógica de transición de estado de aprobación a `approvalService` (`applyApprovalDecision`, `notifyCoachOfResubmit`)

### Changed

- **refactor**(permissions): añade role guards puros en `lib/permissions` (`canViewProductChecklist`, `canSuspendLead`, `canResubmitProduct`, `canViewLeadRecord`) y migra componentes; corrige bug en `CustomerDetailClient` donde COACH y ADMIN no veían el `ProductChecklist`; simplifica `usePermissions` delegando `canViewLead` a función pura
- **refactor**(ux): reemplaza `confirm()` nativo por `confirmToast` con estilo del proyecto en eliminaciones de usuarios, franquicias, equipos y metas

- **feat**(ux): añade `toast.success` en todos los casos de acción exitosa: modales de crear/editar, DELETEs de usuarios/franquicias/equipos/metas, subida de adjuntos, asociación y reenvío de productos, y aprobación/rechazo en checklist
- **refactor**(forms): migra `RejectModal` y `GoalFormModal` a react-hook-form + zod con errores inline por campo; reemplaza `installmentError` state en `ProductsTab` por `setError("root")` de RHF
- **refactor**(modals): reemplaza estado `serverError` e inline banners por `toast.error` en todos los modales; las validaciones de campo mantienen su error inline
- **refactor**(errors): `fetcher` propaga el mensaje de error del servidor; `SWRConfig` en `providers.tsx` muestra `toast.error` global en fallos de SWR
- **refactor**(dashboard): elimina `prevRevenueWhere` duplicado en `getDashboardData` y reutiliza `revenueWhere` para el período anterior y el histórico de SUPERVISOR/ADMIN
- **ia**(skills): añade regla de manejo de errores (#6) al skill `conventional-commit`
- **perf**(components): implementa code-splitting con `dynamic()` en `AdminDashboard`, `FranchiseDashboard`, `UserModal`, `GoalTree`, `GoalFormModal`, `CompanyModal`, `TeamModal`, `LeadEditModal`, `NoteModal` y `ReminderModal`
- **refactor**(modales): migra fetching de datos a SWR en `UserModal`, `LeadEditModal` y `ReminderModal`
- **style**(ui): renombra etiqueta "Estado" a "Status" en modales y vistas de lista
- **ia**(docs): añade `CLAUDE.md` con arquitectura del proyecto y permite rastrear `.claude/` en git
