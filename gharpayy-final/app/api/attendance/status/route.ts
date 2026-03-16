import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { ok, unauthorized, serverError } from "@/lib/response";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await connectDB();

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const attendance = await Attendance.findOne({ employeeId: user.userId, date: today })
      .populate("employeeId", "employeeName role zoneId");

    return ok({
      date: today,
      attendance: attendance || null,
      isCheckedIn: attendance?.currentStatus === "checked_in",
      isOnBreak:   attendance?.currentStatus === "on_break",
      isCheckedOut:attendance?.currentStatus === "checked_out",
    });
  } catch (err) { return serverError(err); }
}
