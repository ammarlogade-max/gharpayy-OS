import fetch from "node-fetch";

const BASE = "http://localhost:3000";

async function call(name, method, url, body, cookieJar) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  if (cookieJar.value) opts.headers["Cookie"] = cookieJar.value;

  console.log(`\n=== ${name} (${method} ${url}) ===`);
  const res = await fetch(BASE + url, opts);
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);

  // capture Set-Cookie for auth tests
  const setCookie = res.headers.get("set-cookie");
  if (setCookie && setCookie.includes("gharpayy_token")) {
    cookieJar.value = setCookie.split(";")[0];
    console.log("Captured cookie:", cookieJar.value);
  }
  return { status: res.status, body: text };
}

async function run() {
  const adminCookie = { value: "" };
  const alphaCookie = { value: "" };

  // PART 3 — AUTH TESTS
  await call("Test 1 — Login as Super Admin", "POST", "/api/auth/login", {
    username: "superadmin",
    password: "Admin@1234",
  }, adminCookie);

  await call("Test 2 — Auth Me (Super Admin)", "GET", "/api/auth/me", null, adminCookie);

  await call("Test 3 — Login as alpha_indiranagar", "POST", "/api/auth/login", {
    username: "alpha_indiranagar",
    password: "Pass@1234",
  }, alphaCookie);

  // PART 4 — BASIC CRM (superadmin)
  await call("Test 4 — Get zones", "GET", "/api/zones", null, adminCookie);
  await call("Test 5 — Get users", "GET", "/api/users", null, adminCookie);
  await call("Test 6 — Get leads", "GET", "/api/leads", null, adminCookie);
  await call("Test 7 — Dashboard", "GET", "/api/dashboard", null, adminCookie);
  await call("Test 8 — Properties", "GET", "/api/properties", null, adminCookie);

  // PART 5 — ATTENDANCE (alpha)
  await call("Test 9 — Status BEFORE clock in", "GET", "/api/attendance/status", null, alphaCookie);

  await call("Test 10 — Clock In (session 1)", "POST", "/api/attendance/checkin", {
    lat: 12.9716,
    lng: 77.5946,
  }, alphaCookie);

  await call("Test 11 — Status AFTER clock in", "GET", "/api/attendance/status", null, alphaCookie);

  await call("Test 12 — Start lunch break", "POST", "/api/attendance/break", {
    action: "start",
    breakType: "lunch",
  }, alphaCookie);

  await call("Test 13 — Status while on break", "GET", "/api/attendance/status", null, alphaCookie);

  await call("Test 14 — Start another break while on break", "POST", "/api/attendance/break", {
    action: "start",
    breakType: "short",
  }, alphaCookie);

  await call("Test 15 — End break", "POST", "/api/attendance/break", {
    action: "end",
  }, alphaCookie);

  // Test 16 — Lunch limit (start/end/start)
  await call("Test 16.1 — Start lunch", "POST", "/api/attendance/break", {
    action: "start",
    breakType: "lunch",
  }, alphaCookie);
  await call("Test 16.2 — End lunch", "POST", "/api/attendance/break", {
    action: "end",
  }, alphaCookie);
  await call("Test 16.3 — Start lunch again (should fail)", "POST", "/api/attendance/break", {
    action: "start",
    breakType: "lunch",
  }, alphaCookie);

  await call("Test 17 — Clock Out (session 1)", "POST", "/api/attendance/checkout", {
    "lat": 12.93482034950773,
  "lng": 77.61124032232969,
  }, alphaCookie);

  await call("Test 18 — Clock In (session 2)", "POST", "/api/attendance/checkin", {
    "lat": 12.93482034950773,
  "lng": 77.61124032232969,
  }, alphaCookie);

  await call("Test 19 — Clock In again while checked in", "POST", "/api/attendance/checkin", {
    "lat": 12.93482034950773,
  "lng": 77.61124032232969,
  }, alphaCookie);

  await call("Test 20 — Clock Out (session 2)", "POST", "/api/attendance/checkout", {
    "lat": 12.93482034950773,
  "lng": 77.61124032232969,
  }, alphaCookie);

  await call("Test 21 — Daily report", "GET", "/api/attendance/daily-report", null, alphaCookie);

  await call("Test 22 — Weekly heatmap", "GET", "/api/attendance?week=2026-11", null, alphaCookie);

  // PART 5 admin-only
  await call("Test 23 — Employees as superadmin", "GET", "/api/employees", null, adminCookie);

  // re-login alpha to ensure cookie
  await call("Test 24 — Login alpha again", "POST", "/api/auth/login", {
    username: "alpha_indiranagar",
    password: "Pass@1234",
  }, alphaCookie);
  await call("Test 24 — Employees as alpha (should be forbidden)", "GET", "/api/employees", null, alphaCookie);
}

run().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});