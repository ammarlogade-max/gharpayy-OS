import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getCurrentUser, isAdmin, isSuperAdmin } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

// GET /api/users/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    const { id } = await params;
    const user = await User.findById(id).populate("zoneId", "zoneName");
    if (!user) return notFound("User");
    return ok(user);
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();
    const { id } = await params;
    const body = await req.json();

    // If password is being updated, hash it
    if (body.password) {
      body.passwordHash = body.password;
      delete body.password;
    }

    const user = await User.findById(id);
    if (!user) return notFound("User");

    Object.assign(user, body);
    if (body.passwordHash) user.passwordHash = body.passwordHash; // triggers pre-save hash
    await user.save();

    return ok(user);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/users/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (!isSuperAdmin(currentUser.role)) return forbidden();
    const { id } = await params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return notFound("User");
    return ok({ message: "User deleted" });
  } catch (err) {
    return serverError(err);
  }
}
