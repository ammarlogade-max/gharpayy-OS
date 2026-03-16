import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Property } from "@/models/Property";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const property = await Property.findById(id).populate("zoneId", "zoneName");
    if (!property) return notFound("Property");
    return ok(property);
  } catch (err) { return serverError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    const { id } = await params;
    const body = await req.json();
    const property = await Property.findByIdAndUpdate(id, body, { new: true });
    if (!property) return notFound("Property");
    return ok(property);
  } catch (err) { return serverError(err); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    const { id } = await params;
    const property = await Property.findByIdAndDelete(id);
    if (!property) return notFound("Property");
    return ok({ message: "Property deleted" });
  } catch (err) { return serverError(err); }
}
