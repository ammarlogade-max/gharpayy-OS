import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized — please login" },
    { status: 401 }
  );
}

export function forbidden() {
  return NextResponse.json(
    { success: false, error: "Forbidden — insufficient permissions" },
    { status: 403 }
  );
}

export function notFound(resource = "Resource") {
  return NextResponse.json(
    { success: false, error: `${resource} not found` },
    { status: 404 }
  );
}

export function serverError(err: unknown) {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
