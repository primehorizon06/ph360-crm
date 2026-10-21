# Integración con SOAR

Cómo funciona la integración de cobros ACH con SOAR, lo que se comprobó contra la API y lo que falta. Los datos de la cuenta (números de comercio y DBA, tickets, contactos) no se guardan aquí: están en el documento privado del equipo.

## Ambientes

| | Producción | Sandbox |
|---|---|---|
| Dashboard | https://soarpaydashboard.com | https://sandbox.soarpaydashboard.com |
| URL de la API (`SOAR_API_URL`) | `https://soarpaydashboard.com/api` | `https://sandbox.soarpaydashboard.com/api` |

Cada ambiente tiene su propio token. Se crea en Developers → Tokens sin elegir Merchant ni DBA (queda "Global") y con estos permisos: ACH Payments Read, ACH Payments Write, Chargebacks Read, ACH/Bank Rejects Read y Payouts Read. El token nunca se versiona: en local va en `.env.soar` (lo lee `docker-compose.yml`) y en Render en sus variables de entorno.

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `SOAR_API_URL` | URL de la API del ambiente |
| `SOAR_API_TOKEN` | Token Global del ambiente |
| `SOAR_ACH_DBA_ID` | DBA de ACH del ambiente |
| `SOAR_ACH_SEC_CODE` | Código SEC de los débitos: `TEL` (por defecto), `PPD`, `CCD` o `WEB`. En producción tiene que ser `TEL`; en el sandbox se usa el que tenga habilitado el DBA |

Sin `SOAR_API_TOKEN`, en desarrollo se usa un cliente simulado y en producción los cobros quedan deshabilitados. Los productos aprobados mientras SOAR no estaba configurado no muestran aviso ni botón de reintentar: hay que sincronizarlos con `POST /api/leads/{leadId}/products/{productId}/soar-sync`.

## Reglas de ACH (según SOAR)

- Hora de corte para ACH del mismo día: **12:00 PM EST**. Hora límite de los lotes al ODFI: 21:00 EST.
- Los fondos de ACH quedan retenidos **3 días** antes de liberarse.
- Un token Global cubre todos los DBAs de la cuenta.

## API: lo que dice la documentación y lo que se comprobó

Fuente: developers.soarpaydashboard.com (secciones Dashboard, Webhooks y Payment Gateway). La URL base del sandbox y las rutas `/api/ach/...` están en la sección Dashboard; la introducción usa `https://example.soarpaydashboard.com/<path>` como ejemplo genérico.

- Autenticación: `Authorization: Bearer <token>`.
- Errores: JSON con `name`, `message`, `code` y `status`. Una respuesta HTML no viene de la API (ver "Cloudflare").
- Cliente ACH: `POST /api/ach/customer`. Obligatorios (confirmados con errores de validación de SOAR): `firstName`, `lastName`, `address1`, `city`, `state` (código de dos letras: PR, NY…), `zipCode`, `dba.id` y la primera cuenta en campos planos (`accountName`, `accountType`, `routingNumber`, `accountNumber`). Opcionales: `phone`, `email`, `address2`, `identifier` (el CRM manda el id del lead). Responde con `accounts[]`. El CRM valida apellido, dirección, ciudad, estado y código postal antes de llamar a SOAR.
- Cuenta adicional: `POST /api/ach/customer/{id}/account` con `name`, `type`, `routingNumber`, `accountNumber`.
- Débito: `POST /api/ach` con `transactionType: "Debit"`, `SECCode`, `amount`, `memo`, `transactionDate`, `dba.id`, `customer.id`, `account.id`.
  - `SECCode` es obligatorio aunque los ejemplos de la documentación no lo incluyen. Si el DBA no tiene ese código, SOAR responde "This merchant is not authorized for this type of transaction and SEC Code".
  - `transactionDate` va como `YYYY-MM-DD HH:MM:SS` en UTC, aunque la tabla diga `Date`: con solo la fecha SOAR responde "The format of transactionDate is invalid". El CRM manda las 12:00:00 UTC para que el día sea el mismo en hora del Este. El dashboard de SOAR muestra las horas en hora del Pacífico (12:00 UTC aparece como 5:00 AM).
  - SOAR acepta un número de ruta inválido al crear el cliente, pero lo rechaza al crear el débito ("The ABA/Routing number is not valid"). Para pruebas sirven rutas reales, como `011000015` o `021000021`, con una cuenta ficticia.
- Consulta: `GET /api/ach/{id}`. El estado viene en `transactionStatus`, el retorno en `return.code` / `return.date` y la verificación de la cuenta bancaria en `verification.status`.
- Estados: Pending y Submitted son equivalentes; Held (retenido por SOAR); Transmitted (ya no se puede anular); Settled; Returned (final); Voided.
  - Además existe **ERROR**, que la documentación no menciona: SOAR lo pone por su cuenta y el campo `error` puede venir vacío. En el sandbox apareció minuto y medio después de crear un débito con una cuenta ficticia, con `verification.status` en `Pending`. El CRM lo trata como fallido y manda la cuota a Caída.
  - La API devuelve `transactionStatus` en **mayúsculas** (`"ERROR"`), aunque la documentación los escriba con mayúscula inicial. El CRM compara los estados sin distinguir mayúsculas.
- Anular: `POST /api/ach/{id}/void` solo para débitos ya enviados a procesar; antes de eso se elimina con `DELETE /api/ach/{id}`. Comprobado en el sandbox con un débito Pending: SOAR rechaza el `void`, el CRM hace `DELETE` y el débito desaparece de SOAR (`GET /api/ach/{id}` responde 404 "The requested ACH Record could not be found" y su `/log` queda vacío). En el CRM el intento queda `VOIDED` y la cuota vuelve a pendiente sin confirmar. La documentación también tiene `POST /api/ach/{id}/cancel`, que el CRM no usa.
- Webhooks: uno por DBA, registrado en Developers → Webhooks. Encabezado `Webhook-Signature` = SHA-512 de `<firma><id><module><action><date>`; cada URL tiene su propia firma.
  - ACH: `ach.create`, `ach.updateStatus`, `ach.createCustomer`, `ach.updateCustomer`, `ach.nocReceived`.
  - Contracargos: `chargeback.create`, `chargeback.update`.

## Ver la respuesta cruda de SOAR

`GET /api/soar?path=<ruta de la API>` devuelve `{ path, status, body }` con la respuesta de SOAR sin procesar, también cuando es un error. Ejemplos, con sesión de administrador abierta en el CRM desplegado:

- `/api/soar?path=/ach/<id del débito>`
- `/api/soar?path=/ach/<id del débito>/log`
- `/api/soar?path=/ach/customer/<id del cliente>`
- `/api/soar?path=/ach?per-page=5`

Solo para administradores y solo lectura (GET): no permite crear ni anular nada. Rechaza URLs completas, `..` y rutas vacías.

## Cloudflare

Delante de la API de SOAR hay un desafío anti-bot de Cloudflare (`403`, `cf-mitigated: challenge`, página "Just a moment... Enable JavaScript and cookies to continue"). Bloquea las peticiones desde redes locales (Node, curl y Postman, con o sin token), pero las del servidor en Render llegan a la API. Mientras siga, las pruebas contra SOAR se hacen desde Render. El CRM muestra al usuario "No se pudo conectar con el procesador de pagos" y deja el `cf-ray` en el log del servidor.

## Estado de las pruebas en el sandbox

| Paso | Resultado |
|---|---|
| Crear cliente y cuenta | OK |
| Crear débito con `TEL` | Rechazado: el DBA del sandbox no tiene TEL (pedido a SOAR) |
| Crear débito con `PPD` | OK, quedó Pending con fecha futura |
| Estado del débito con cuenta ficticia | Pasó solo a ERROR, sin motivo en `error` (preguntado a SOAR) |
| Consultar un débito | OK (también con `/api/soar`) |
| Anular un débito Pending | OK: SOAR lo elimina con `DELETE` |
| Anular un débito ya enviado (`void`) | Pendiente: requiere un débito en Submitted o Held |

## Preguntas pendientes para SOAR

1. Cómo simular en el sandbox cambios de estado ACH (liquidado, retornado R01/R02) y NOC.
2. Un DBA de tarjetas en el sandbox, o una forma de generar webhooks de contracargos de prueba.
3. Si un webhook recibe todos los grupos de eventos y si reintentan cuando el endpoint falla.
4. Si la fecha de la firma del webhook se usa tal como viene en el cuerpo, con un ejemplo.
5. Si la hora de corte de las 12:00 PM es fija en EST o sigue el horario de verano (EDT).
6. Por qué un débito pasa a ERROR sin motivo, y qué número de cuenta de prueba pasa la verificación en el sandbox.

## Siguientes pasos

1. Probar el `void` de un débito ya enviado (Submitted o Held) y un débito que llegue a Settled, con una cuenta de prueba que pase la verificación.
2. Endpoint de webhooks de SOAR con verificación de firma, desplegado en Render; luego registrar su URL en el sandbox.
3. Regla de la hora de corte en la pantalla de cobros.
4. Conciliación (débitos sin confirmar, retornos, depósitos) y módulo de disputas.
5. Pagos con tarjeta por Authorize.net.

## Checklist para salir a producción

- [ ] SOAR confirma que el DBA de ACH de producción tiene TEL habilitado.
- [ ] Débito, consulta y anulación probados de punta a punta en el sandbox (idealmente con TEL).
- [ ] Token de producción creado en el dashboard de producción (Developers → Tokens, Global, con los cinco permisos), guardado solo en las variables de Render.
- [ ] Variables de Render cambiadas a producción: `SOAR_API_URL`, `SOAR_API_TOKEN`, `SOAR_ACH_DBA_ID` (DBA de ACH de producción), y `SOAR_ACH_SEC_CODE` borrada o en `TEL`.
- [ ] Una petición de prueba desde Render a producción responde JSON (no el desafío de Cloudflare). Se puede comprobar con `/api/soar`.
- [ ] Webhooks registrados en el DBA de producción, con su propia firma.
- [ ] Los leads que se cobrarán tienen apellido, dirección, ciudad, estado (dos letras) y código postal.
- [ ] Regenerar el token del sandbox si se compartió durante las pruebas.
