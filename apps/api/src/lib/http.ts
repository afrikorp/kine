export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function badRequest(message: string): never {
  throw new HttpError(400, message);
}

export function notFound(message: string): never {
  throw new HttpError(404, message);
}

export function conflict(message: string): never {
  throw new HttpError(409, message);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    badRequest(`${field} est requis`);
  }
  return value as string;
}

export function optionalString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function requireInt(value: unknown, field: string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n)) {
    badRequest(`${field} doit être un entier`);
  }
  return n as number;
}

export function requireNumber(value: unknown, field: string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    badRequest(`${field} doit être un nombre`);
  }
  return n as number;
}

export function requireIsoDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    badRequest(`${field} doit être une date ISO "AAAA-MM-JJ"`);
  }
  return value as string;
}

export function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    badRequest(`${field} doit être l'une des valeurs : ${allowed.join(", ")}`);
  }
  return value as T;
}

export function requireOneOf<T extends number>(value: unknown, field: string, allowed: readonly T[]): T {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !allowed.includes(n as T)) {
    badRequest(`${field} doit être l'une des valeurs : ${allowed.join(", ")}`);
  }
  return n as T;
}
