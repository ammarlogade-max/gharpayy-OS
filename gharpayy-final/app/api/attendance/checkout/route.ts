import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { getDistanceMeters } from "@/lib/geo";
import { ok, error, unauthorized, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await connectDB();

    const { lat, lng, notes } = await req.json();
    if (lat === undefined || lng === undefined) return error("lat and lng are required");

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const attendance = await Attendance.findOne({ employeeId: user.userId, date: today });

    if (!attendance || attendance.sessions.length === 0) return error("No check-in found for today.");

    const sessions = attendance.sessions;
    const last = sessions[sessions.length - 1];
    if (last.checkOutTime !== null) return error("Already checked out. Check in again to start a new session.");

    const now = new Date();
    const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT || "12.9716");
    const OFFICE_LNG = parseFloat(process.env.OFFICE_LNG || "77.5946");
    const dist = Math.round(getDistanceMeters(lat, lng, OFFICE_LAT, OFFICE_LNG));
    const sessionMins = Math.round((now.getTime() - last.checkInTime.getTime()) / 60000);

    last.checkOutTime = now;
    last.checkOutLat = lat;
    last.checkOutLng = lng;
    last.workMinutes = sessionMins;

    const totalWorkMinutes = sessions.reduce((s, sess) => s + (sess.workMinutes || 0), 0);
    attendance.sessions = sessions;
    attendance.totalWorkMinutes = totalWorkMinutes;
    attendance.lastCheckOut = now;
    attendance.currentStatus = "checked_out";
    if (notes) attendance.notes = notes;
    await attendance.save();

    return ok({ attendance, sessionNumber: sessions.length, sessionMinutes: sessionMins, totalWorkMinutes, totalWorkHours: (totalWorkMinutes/60).toFixed(2), distanceMeters: dist });
  } catch (err) { return serverError(err); }
}
