import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { getDistanceMeters, getDayStatus } from "@/lib/geo";
import { ok, error, unauthorized, serverError } from "@/lib/response";

const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT || "12.9716");
const OFFICE_LNG = parseFloat(process.env.OFFICE_LNG || "77.5946");
const GEO_FENCE_METERS = 100;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await connectDB();

    const { lat, lng } = await req.json();
    if (lat === undefined || lng === undefined) return error("lat and lng are required");

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const distanceMeters = getDistanceMeters(lat, lng, OFFICE_LAT, OFFICE_LNG);
    const isGeoValid = distanceMeters <= GEO_FENCE_METERS;
    const hardBlock = process.env.GEO_FENCE_HARD_BLOCK === "true";

    if (hardBlock && !isGeoValid)
      return error(`Check-in blocked: ${Math.round(distanceMeters)}m from office. Must be within ${GEO_FENCE_METERS}m.`, 403);

    const now = new Date();
    let attendance = await Attendance.findOne({ employeeId: user.userId, date: today });

    if (attendance) {
      const sessions = attendance.sessions;
      if (sessions.length > 0 && sessions[sessions.length - 1].checkOutTime === null)
        return error("Already checked in. Please check out before checking in again.");

      attendance.sessions.push({ checkInTime: now, checkOutTime: null, checkInLat: lat, checkInLng: lng, checkOutLat: null, checkOutLng: null, checkInDistanceMeters: Math.round(distanceMeters), isGeoValid, workMinutes: 0 });
      attendance.currentStatus = "checked_in";
      attendance.lastCheckOut = null;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employeeId: user.userId, date: today,
        sessions: [{ checkInTime: now, checkOutTime: null, checkInLat: lat, checkInLng: lng, checkOutLat: null, checkOutLng: null, checkInDistanceMeters: Math.round(distanceMeters), isGeoValid, workMinutes: 0 }],
        firstCheckIn: now, currentStatus: "checked_in", dayStatus: getDayStatus(now),
      });
    }

    return ok({ attendance, sessionNumber: attendance.sessions.length, distanceMeters: Math.round(distanceMeters), isGeoValid, warning: !isGeoValid ? `${Math.round(distanceMeters)}m from office (limit: ${GEO_FENCE_METERS}m)` : null });
  } catch (err) { return serverError(err); }
}
