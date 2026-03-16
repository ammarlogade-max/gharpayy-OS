import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { ok, error, unauthorized, forbidden, serverError } from "@/lib/response";

function getWeekDates(weekParam: string): string[] {
  const [y, w] = weekParam.split("-").map(Number);
  const jan4 = new Date(y, 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (w - 1) * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return d.toLocaleDateString("en-CA");
  });
}

function buildHeatmap(records: {employeeId: unknown; date: string; dayStatus: string}[], dates: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map: Record<string, any> = {};
  for (const rec of records) {
    const empId = String((rec.employeeId as {_id?: unknown})?._id || rec.employeeId);
    const emp = rec.employeeId as {employeeName?: string; role?: string};
    if (!map[empId]) { map[empId] = { employeeId: empId, employeeName: emp?.employeeName || "Unknown", role: emp?.role || "", days: {} }; }
    for (const d of dates) { if (!map[empId].days[d]) map[empId].days[d] = "absent"; }
    map[empId].days[rec.date] = rec.dayStatus;
  }
  return Object.values(map);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const weekParam  = searchParams.get("week");
    const dateParam  = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (weekParam) {
      const dates = getWeekDates(weekParam);
      query.date = { $in: dates };
    } else {
      query.date = dateParam || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    }

    if (!isAdmin(user.role)) { query.employeeId = user.userId; }
    else if (employeeId) { query.employeeId = employeeId; }

    const records = await Attendance.find(query)
      .populate("employeeId", "employeeName role zoneId username")
      .sort({ date: 1 }).lean();

    if (weekParam) {
      const dates = getWeekDates(weekParam);
      return ok({ week: weekParam, dates, heatmap: buildHeatmap(records as {employeeId: unknown; date: string; dayStatus: string}[], dates), raw: records });
    }

    const presentCount = records.filter(r => r.currentStatus === "checked_in" || r.currentStatus === "on_break").length;
    return ok({ records, presentCount, date: query.date });
  } catch (err) { return serverError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB();

    const { employeeId, date, dayStatus, notes, checkInTime, checkOutTime } = await req.json();
    if (!employeeId || !date) return error("employeeId and date are required");

    const existing = await Attendance.findOne({ employeeId, date });
    if (existing) {
      if (dayStatus) existing.dayStatus = dayStatus;
      if (notes) existing.notes = notes;
      if (checkInTime) existing.firstCheckIn = new Date(checkInTime);
      if (checkOutTime) existing.lastCheckOut = new Date(checkOutTime);
      existing.markedByAdmin = true;
      await existing.save();
      return ok(existing);
    }

    const record = await Attendance.create({ employeeId, date, dayStatus: dayStatus || "absent", currentStatus: checkInTime ? "checked_out" : "absent", firstCheckIn: checkInTime ? new Date(checkInTime) : null, lastCheckOut: checkOutTime ? new Date(checkOutTime) : null, notes: notes || "", markedByAdmin: true });
    return ok(record, 201);
  } catch (err) { return serverError(err); }
}
