import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LoginSession } from "@/models/LoginSession";
import { getCurrentUser, buildLogoutCookie } from "@/lib/auth";
import { serverError } from "@/lib/response";

export async function POST() {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (user) {
      // Close the latest open session and calculate active hours
      const session = await LoginSession.findOne({
        userId: user.userId,
        logoutTime: null,
      }).sort({ loginTime: -1 });

      if (session) {
        const logoutTime = new Date();
        const activeHours =
          (logoutTime.getTime() - session.loginTime.getTime()) / 3600000;
        session.logoutTime = logoutTime;
        session.activeHours = Math.round(activeHours * 100) / 100;
        await session.save();
      }
    }

    const response = NextResponse.json({ success: true, data: "Logged out" });
    response.headers.set("Set-Cookie", buildLogoutCookie());
    return response;
  } catch (err) {
    return serverError(err);
  }
}
