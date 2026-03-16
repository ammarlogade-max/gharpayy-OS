import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await connectDB();
    const { id } = await params;
    if (!isAdmin(user.role) && user.userId !== id) return forbidden();

    const emp = await User.findById(id).populate("zoneId","zoneName areas").select("-passwordHash").lean();
    if (!emp) return notFound("Employee");

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const att = await Attendance.find({ employeeId: id, date: { $gte: thirtyDaysAgo.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}) } }).sort({ date: -1 }).lean();
    const summary = { totalDays: att.length, present: att.filter(a=>a.dayStatus!=="absent").length, absent: att.filter(a=>a.dayStatus==="absent").length, late: att.filter(a=>a.dayStatus==="late").length, early: att.filter(a=>a.dayStatus==="early").length, onTime: att.filter(a=>a.dayStatus==="on_time").length, avgWorkMinutes: att.length ? Math.round(att.reduce((s,a)=>s+(a.totalWorkMinutes||0),0)/att.length) : 0 };

    return ok({ employee: emp, attendanceSummary: summary, recentAttendance: att });
  } catch (err) { return serverError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    delete body.passwordHash; delete body.password;

    const emp = await User.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).select("-passwordHash").populate("zoneId","zoneName");
    if (!emp) return notFound("Employee");
    return ok(emp);
  } catch (err) { return serverError(err); }
}
