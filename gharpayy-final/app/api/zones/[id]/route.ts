import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Zone } from "@/models/Zone";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

// GET /api/zones/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const zone = await Zone.findById(id);
    if (!zone) return notFound("Zone");
    return ok(zone);
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/zones/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isSuperAdmin(user.role)) return forbidden();
    const { id } = await params;
    const body = await req.json();
    const zone = await Zone.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!zone) return notFound("Zone");
    return ok(zone);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/zones/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isSuperAdmin(user.role)) return forbidden();
    const { id } = await params;
    const zone = await Zone.findByIdAndDelete(id);
    if (!zone) return notFound("Zone");
    return ok({ message: "Zone deleted" });
  } catch (err) {
    return serverError(err);
  }
}
