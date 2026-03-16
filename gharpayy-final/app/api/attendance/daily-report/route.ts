import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { LeadActivity } from "@/models/LeadActivity";
import { User } from "@/models/User";
import { ok, unauthorized, serverError } from "@/lib/response";

/**
 * GET /api/attendance/daily-report
 * Query: ?date=2026-03-16 (default: today)
 *        ?employeeId=xxx  (admin only — specific employee)
 *
 * Returns per-employee daily summary:
 * - clock-in / clock-out times
 * - total time, break time, net work time
 * - CRM activity: calls made, leads contacted, visits scheduled, messages sent
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ||
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const employeeId = searchParams.get("employeeId");

    // Build attendance query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attQuery: Record<string, any> = { date };

    if (!isAdmin(user.role)) {
      // Non-admins only see their own report
      attQuery.employeeId = user.userId;
    } else if (employeeId) {
      attQuery.employeeId = employeeId;
    }

    const attendanceRecords = await Attendance.find(attQuery)
      .populate("employeeId", "employeeName role zoneId username")
      .lean();

    // Build date range for CRM activity (full day in IST)
    const dayStart = new Date(`${date}T00:00:00+05:30`);
    const dayEnd   = new Date(`${date}T23:59:59+05:30`);

    // Fetch CRM activity for all relevant employees
    const employeeIds = attendanceRecords.map(a =>
      (a.employeeId as { _id: unknown })?._id || a.employeeId
    );

    const activities = await LeadActivity.find({
      userId:    { $in: employeeIds },
      createdAt: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    // Build activity map per employee
    const activityMap: Record<string, {
      callsMade: number;
      leadsContacted: number;
      visitsScheduled: number;
      messagesSent: number;
      bookingsConfirmed: number;
      totalActions: number;
    }> = {};

    for (const act of activities) {
      const id = String(act.userId);
      if (!activityMap[id]) {
        activityMap[id] = { callsMade: 0, leadsContacted: 0, visitsScheduled: 0, messagesSent: 0, bookingsConfirmed: 0, totalActions: 0 };
      }
      activityMap[id].totalActions++;
      switch (act.actionType) {
        case "call_made":
        case "call_no_answer":
          activityMap[id].callsMade++;
          activityMap[id].leadsContacted++;
          break;
        case "whatsapp_sent":
          activityMap[id].messagesSent++;
          activityMap[id].leadsContacted++;
          break;
        case "visit_scheduled":
          activityMap[id].visitsScheduled++;
          break;
        case "booking_confirmed":
          activityMap[id].bookingsConfirmed++;
          break;
        case "stage_updated":
        case "note_added":
          activityMap[id].leadsContacted++;
          break;
      }
    }

    // Build final report per employee
    const reports = attendanceRecords.map(att => {
      const emp = att.employeeId as {
        _id: unknown; employeeName?: string; role?: string;
        zoneId?: { zoneName?: string }; username?: string;
      };
      const empId = String(emp?._id || att.employeeId);

      // Compute total elapsed (first check-in → last check-out)
      const totalElapsedMinutes = att.firstCheckIn && att.lastCheckOut
        ? Math.round((new Date(att.lastCheckOut).getTime() - new Date(att.firstCheckIn).getTime()) / 60000)
        : att.firstCheckIn
        ? Math.round((Date.now() - new Date(att.firstCheckIn).getTime()) / 60000)
        : 0;

      const breakMinutes = att.totalBreakMinutes || 0;
      const netWorkMinutes = Math.max(0, att.totalWorkMinutes || totalElapsedMinutes - breakMinutes);

      // Build session timeline events
      const timeline: { time: string; event: string; type: string }[] = [];

      if (att.firstCheckIn) {
        timeline.push({ time: fmt(att.firstCheckIn), event: "Clock-in", type: "checkin" });
      }

      // Interleave sessions and breaks chronologically
      const events: { at: Date; label: string; type: string }[] = [];
      for (const sess of att.sessions) {
        events.push({ at: new Date(sess.checkInTime), label: "Clock-in", type: "checkin" });
        if (sess.checkOutTime) events.push({ at: new Date(sess.checkOutTime), label: "Clock-out", type: "checkout" });
      }
      for (const brk of att.breaks) {
        const typeLabel = brk.breakType === "short" ? "Short Break" : brk.breakType === "lunch" ? "Lunch Break" : "Personal Break";
        events.push({ at: new Date(brk.breakStart), label: `${typeLabel} started`, type: "break_start" });
        if (brk.breakEnd) events.push({ at: new Date(brk.breakEnd), label: `Back from ${typeLabel.toLowerCase()} (${brk.durationMinutes}m)`, type: "break_end" });
      }
      events.sort((a, b) => a.at.getTime() - b.at.getTime());

      const crmActivity = activityMap[empId] || { callsMade: 0, leadsContacted: 0, visitsScheduled: 0, messagesSent: 0, bookingsConfirmed: 0, totalActions: 0 };

      return {
        employeeId: empId,
        employeeName: emp?.employeeName || "Unknown",
        role: emp?.role || "",
        zone: (emp?.zoneId as { zoneName?: string })?.zoneName || "",
        date,
        clockIn:  att.firstCheckIn  ? fmt(att.firstCheckIn)  : null,
        clockOut: att.lastCheckOut  ? fmt(att.lastCheckOut)   : null,
        totalElapsedMinutes,
        breakMinutes,
        netWorkMinutes,
        netWorkFormatted: fmtMins(netWorkMinutes),
        currentStatus: att.currentStatus,
        dayStatus: att.dayStatus,
        sessionCount: att.sessions.length,
        breaks: att.breaks.map(b => ({
          type: b.breakType,
          start: fmt(b.breakStart),
          end: b.breakEnd ? fmt(b.breakEnd) : null,
          durationMinutes: b.durationMinutes,
        })),
        timeline: events.map(e => ({ time: e.at.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}), event: e.label, type: e.type })),
        crmActivity,
      };
    });

    // If no attendance records but admin queried all — include absent employees
    if (isAdmin(user.role) && !employeeId) {
      const allEmployees = await User.find({ status: "active" }).select("_id employeeName role zoneId").populate("zoneId","zoneName").lean();
      const presentIds = new Set(reports.map(r => r.employeeId));
      for (const emp of allEmployees) {
        if (!presentIds.has(String(emp._id))) {
          reports.push({
            employeeId: String(emp._id),
            employeeName: emp.employeeName,
            role: emp.role,
            zone: (emp.zoneId as { zoneName?: string })?.zoneName || "",
            date,
            clockIn: null, clockOut: null,
            totalElapsedMinutes: 0, breakMinutes: 0, netWorkMinutes: 0,
            netWorkFormatted: "0m",
            currentStatus: "absent" as const,
            dayStatus: "absent" as const,
            sessionCount: 0, breaks: [], timeline: [],
            crmActivity: { callsMade:0, leadsContacted:0, visitsScheduled:0, messagesSent:0, bookingsConfirmed:0, totalActions:0 },
          });
        }
      }
    }

    const summary = {
      date,
      totalEmployees: reports.length,
      present: reports.filter(r => r.currentStatus !== "absent").length,
      absent:  reports.filter(r => r.currentStatus === "absent").length,
      avgNetWorkMinutes: reports.length
        ? Math.round(reports.reduce((s,r)=>s+r.netWorkMinutes,0)/reports.length) : 0,
      totalCalls: reports.reduce((s,r)=>s+r.crmActivity.callsMade,0),
      totalLeadsContacted: reports.reduce((s,r)=>s+r.crmActivity.leadsContacted,0),
      totalVisitsScheduled: reports.reduce((s,r)=>s+r.crmActivity.visitsScheduled,0),
    };

    return ok({ date, summary, reports });
  } catch (err) {
    return serverError(err);
  }
}

function fmt(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtMins(m: number): string {
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
