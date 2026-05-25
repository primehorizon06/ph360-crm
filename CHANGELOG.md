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

### Changed

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
