import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LoginSession } from "@/models/LoginSession";
import "@/models/Zone"; // ensure Zone schema is registered for population
import { signToken, buildLoginCookie } from "@/lib/auth";
import { error, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { username, password } = await req.json();

    if (!username || !password)
      return error("Username and password are required");

    const user = await User.findOne({ username: username.toLowerCase(), status: "active" })
      .populate("zoneId", "zoneName");

    if (!user) return error("Invalid username or password", 401);

    const valid = await user.comparePassword(password);
    if (!valid) return error("Invalid username or password", 401);

    // Create login session
    await LoginSession.create({ userId: user._id, loginTime: new Date() });

    const zone = user.zoneId as any;
    const token = signToken({
      userId: String(user._id),
      username: user.username,
      role: user.role,
      zoneId: zone ? String(zone._id) : null,
      zoneName: zone ? zone.zoneName : null,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userId: user._id,
        username: user.username,
        employeeName: user.employeeName,
        role: user.role,
        zoneId: zone?._id || null,
        zoneName: zone?.zoneName || null,
      },
    });

    response.headers.set("Set-Cookie", buildLoginCookie(token));
    return response;
  } catch (err) {
    return serverError(err);
  }
}
