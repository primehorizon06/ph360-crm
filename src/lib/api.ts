import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const unauthorized = () =>
  NextResponse.json({ error: "No autorizado" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Sin permisos" }, { status: 403 });

export const badRequest = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 });

export const notFound = (msg = "No encontrado") =>
  NextResponse.json({ error: msg }, { status: 404 });

export const conflict = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 409 });

export const serverError = (msg = "Error interno del servidor") =>
  NextResponse.json({ error: msg }, { status: 500 });

export async function getAuthSession() {
  return getServerSession(authOptions);
}
