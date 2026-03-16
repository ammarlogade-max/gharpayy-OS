export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(empLat: number, empLng: number, targetLat: number, targetLng: number, maxMeters = 100): boolean {
  return getDistanceMeters(empLat, empLng, targetLat, targetLng) <= maxMeters;
}

// Early = before 10:20, On Time = 10:20–10:35, Late = after 10:35
export function getDayStatus(checkInTime: Date): "early" | "on_time" | "late" {
  const total = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  if (total < 10 * 60 + 20) return "early";
  if (total <= 10 * 60 + 35) return "on_time";
  return "late";
}
