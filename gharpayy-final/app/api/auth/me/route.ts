import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return ok(user);
}
