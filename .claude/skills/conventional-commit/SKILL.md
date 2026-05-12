# Gestión de Commits Atómicos y Changelog (Bajo Demanda)

**Propósito:** Estandarizar los commits, garantizando que sean **atómicos** (un propósito = un commit) y mantener un registro estructurado en `CHANGELOG.md` siguiendo "Keep a Changelog". SOLO ejecutar bajo demanda.

## Instrucciones de comportamiento para Claude:

1. **Disparador Estricto:** NO generes commits automáticamente. Espera a que el usuario escriba explícitamente "Haz el commit" (o similar).
2. **Análisis de Contextos Lógicos:**
   - Revisa exhaustivamente el `git diff`.
   - Separa los cambios por su naturaleza y propósito.
   - **REGLA DE ORO:** Un commit = un propósito. NUNCA agrupes cambios de distinta naturaleza.
3. **Flujo de Ejecución Iterativo:**
   Por cada contexto lógico, ejecuta este ciclo de forma secuencial:
   
   - **A. Redacción del Mensaje:**
     Genera el mensaje siguiendo `<type>[optional scope]: <description>`.
     Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore` y **`ia`** (exclusivo para configuraciones, prompts o skills de Inteligencia Artificial).

   - **B. Actualización del Changelog (Keep a Changelog):**
     - Ubica la sección `## [Unreleased]`.
     - Clasifica el cambio usando subtítulos estándar. Si el subtítulo no existe bajo `[Unreleased]`, créalo:
       - `### Added` (para nuevas características, archivos nuevos, dependencias o nuevos skills `ia`).
       - `### Changed` (para modificaciones, refactors, `chore` o actualizaciones de `docs`).
       - `### Fixed` (para correcciones y `fix`).
       - `### Removed` (para eliminaciones).
     - Añade el registro debajo del subtítulo correspondiente con este formato exacto: `- **<type>**(<scope>): <description>`.

   - **C. Preparación Selectiva (Staging):**
     Ejecuta `git add` ÚNICAMENTE para los archivos asociados a este contexto específico y el `CHANGELOG.md`. NO uses `git add .` globalmente.

   - **D. Ejecución del Commit:**
     Ejecuta `git commit -m "<mensaje>"` en la terminal.

4. **Continuación:** Repite el ciclo del paso 3 hasta que el árbol de trabajo (working tree) esté limpio.
5. **Resumen:** Entrégale al usuario un reporte final con los commits atómicos creados y confirma que el Changelog ha sido categorizado correctamente.