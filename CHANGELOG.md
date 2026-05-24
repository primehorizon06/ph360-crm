# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

## [Unreleased]

### Added

- **perf**(suspense): añade `loading.tsx` al segmento `(dashboard)` para UI de carga automática en navegación
- **perf**(suspense): crea `LeadDetailClient` y `CustomerDetailClient` como componentes cliente separados, envueltos en `<Suspense>` desde server wrappers en `page.tsx`
- **perf**(suspense): extrae `SearchParamsWatcher` en login y lo envuelve en `<Suspense>` para cumplir con el patrón requerido por Next.js 15+
- **ia**(skills): añade skill `conventional-commit` para gestión de commits atómicos y changelog

### Changed

- **ia**(skills): añade regla de manejo de errores (#6) al skill `conventional-commit`
- **perf**(components): implementa code-splitting con `dynamic()` en `AdminDashboard`, `FranchiseDashboard`, `UserModal`, `GoalTree`, `GoalFormModal`, `CompanyModal`, `TeamModal`, `LeadEditModal`, `NoteModal` y `ReminderModal`
- **refactor**(modales): migra fetching de datos a SWR en `UserModal`, `LeadEditModal` y `ReminderModal`
- **style**(ui): renombra etiqueta "Estado" a "Status" en modales y vistas de lista
- **ia**(docs): añade `CLAUDE.md` con arquitectura del proyecto y permite rastrear `.claude/` en git
