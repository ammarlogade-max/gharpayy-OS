import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { ok, error, unauthorized, serverError } from "@/lib/response";

const BREAK_LIMITS: Record<string, number> = { short: 10, lunch: 45, personal: 15 };

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await connectDB();

    const { action, breakType } = await req.json();
    if (!["start","end"].includes(action)) return error('action must be "start" or "end"');

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const attendance = await Attendance.findOne({ employeeId: user.userId, date: today });

    if (!attendance || attendance.sessions.length === 0) return error("Not checked in today.");
    if (attendance.currentStatus === "checked_out") return error("Already checked out.");

    const now = new Date();

    if (action === "start") {
      if (attendance.currentStatus === "on_break") return error("Already on a break.");

      // Check break limits
      const bt = breakType || "short";
      const completedBreaks = attendance.breaks.filter(
        (b) => b.breakType === bt && b.breakEnd !== null
      );
      const usedToday = completedBreaks.reduce((s, b) => s + b.durationMinutes, 0);
      const limit = BREAK_LIMITS[bt] || 10;
      const isOncePerDay = bt === "lunch";

      // Lunch: one completed lunch break per day regardless of duration
      if (isOncePerDay && completedBreaks.length >= 1) {
        return error(`lunch break already taken today.`);
      }

      // Other types: enforce total minutes cap
      if (!isOncePerDay && usedToday >= limit) {
        return error(`${bt} break limit (${limit}min) already used today.`);
      }

      attendance.breaks.push({ breakType: bt, breakStart: now, breakEnd: null, durationMinutes: 0 });
      attendance.currentStatus = "on_break";
      await attendance.save();
      return ok({ message: "Break started", breakType: bt, limitMinutes: limit, usedMinutes: usedToday, attendance });
    }

    // end break
    if (attendance.currentStatus !== "on_break") return error("Not currently on a break.");
    const openBreak = attendance.breaks.find((b) => b.breakEnd === null);
    if (!openBreak) return error("No open break found.");

    const duration = Math.round((now.getTime() - openBreak.breakStart.getTime()) / 60000);
    openBreak.breakEnd = now;
    openBreak.durationMinutes = duration;
    attendance.totalBreakMinutes = attendance.breaks.reduce((s, b) => s + b.durationMinutes, 0);
    attendance.currentStatus = "checked_in";
    await attendance.save();

    return ok({ message: "Break ended", durationMinutes: duration, totalBreakMinutes: attendance.totalBreakMinutes, attendance });
  } catch (err) { return serverError(err); }
}
