// Error de negocio con un mensaje apto para mostrar al usuario. withAuth y
// withAuthParams lo convierten en una respuesta con ese mensaje (400 por
// defecto), así las rutas no necesitan try/catch para cada regla.
export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}
