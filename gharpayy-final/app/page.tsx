export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>🏠 Gharpayy OS — Backend API</h1>
      <p><a href="/attendance" style={{color:"#E8540A",fontWeight:"bold"}}>→ Open Attendance Module</a></p>
      <h3>Auth</h3>
      <ul>
        <li>POST /api/auth/login</li>
        <li>POST /api/auth/logout</li>
        <li>GET  /api/auth/me</li>
      </ul>
      <h3>Employee Operations</h3>
      <ul>
        <li>POST /api/attendance/checkin</li>
        <li>POST /api/attendance/checkout</li>
        <li>POST /api/attendance/break</li>
        <li>GET  /api/attendance/status</li>
        <li>GET  /api/attendance/daily-report</li>
        <li>GET/POST /api/attendance</li>
        <li>GET/POST /api/employees, /api/employees/[id]</li>
        <li>GET/POST /api/rooms, /api/rooms/[id]</li>
        <li>GET/POST /api/beds, /api/beds/[id]</li>
      </ul>
      <h3>CRM</h3>
      <ul>
        <li>GET/POST /api/zones, /api/zones/[id]</li>
        <li>GET/POST /api/users, /api/users/[id]</li>
        <li>GET/POST /api/leads, /api/leads/[id]</li>
        <li>PATCH    /api/leads/[id]/stage</li>
        <li>POST     /api/leads/[id]/transfer</li>
        <li>GET/POST /api/leads/[id]/activity</li>
        <li>GET/POST /api/visits, /api/visits/[id]</li>
        <li>GET/POST /api/bookings, /api/bookings/[id]</li>
        <li>GET/POST /api/properties, /api/properties/[id]</li>
        <li>GET      /api/dashboard</li>
        <li>GET/PATCH /api/notifications</li>
      </ul>
    </main>
  );
}
