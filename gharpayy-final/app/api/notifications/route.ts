import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/response";

// GET /api/notifications — get current user's notifications
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "unread";

    const query: Record<string, unknown> = { userId: user.userId };
    if (status !== "all") query.status = status;

    const notifications = await Notification.find(query)
      .populate("leadId", "leadName phone")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: user.userId,
      status: "unread",
    });

    return ok({ notifications, unreadCount });
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await Notification.updateMany(
      { userId: user.userId, status: "unread" },
      { status: "read" }
    );

    return ok({ message: "All notifications marked as read" });
  } catch (err) {
    return serverError(err);
  }
}
