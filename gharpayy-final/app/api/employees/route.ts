import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { ok, error, unauthorized, forbidden, serverError, created } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB();

    const { searchParams } = new URL(req.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { status: searchParams.get("status") || "active" };
    if (searchParams.get("role"))   query.role   = searchParams.get("role");
    if (searchParams.get("zoneId")) query.zoneId = searchParams.get("zoneId");

    const employees = await User.find(query).populate("zoneId","zoneName areas").select("-passwordHash").sort({ employeeName: 1 }).lean();

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const todayAtt = await Attendance.find({ employeeId: { $in: employees.map(e => e._id) }, date: today }).lean();
    const attMap: Record<string, unknown> = {};
    for (const a of todayAtt) attMap[String(a.employeeId)] = a;

    const enriched = employees.map(emp => ({ ...emp, todayAttendance: attMap[String(emp._id)] || null }));
    const presentToday = todayAtt.filter(a => a.currentStatus === "checked_in" || a.currentStatus === "on_break").length;

    return ok({ employees: enriched, total: employees.length, presentToday, absentToday: employees.length - presentToday });
  } catch (err) { return serverError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "super_admin") return forbidden();
    await connectDB();

    const { username, password, employeeName, role, zoneId } = await req.json();
    if (!username || !password || !employeeName || !role) return error("username, password, employeeName, role are required");

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return error("Username already taken");

    const emp = await User.create({ username: username.toLowerCase(), passwordHash: password, employeeName, role, zoneId: zoneId || null, status: "active" });
    return created({ _id: emp._id, username: emp.username, employeeName: emp.employeeName, role: emp.role, zoneId: emp.zoneId, status: emp.status });
  } catch (err) { return serverError(err); }
}
