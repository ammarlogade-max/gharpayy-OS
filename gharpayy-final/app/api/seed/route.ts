import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Zone } from "@/models/Zone";
import { User } from "@/models/User";
import { Property } from "@/models/Property";
import { Lead } from "@/models/Lead";
import { LeadOwnership } from "@/models/LeadOwnership";
import { LeadActivity } from "@/models/LeadActivity";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Clear existing
   // Clear existing — drop all collections cleanly
await Promise.all([
  Zone.collection.drop().catch(() => {}),
  User.collection.drop().catch(() => {}),
  Property.collection.drop().catch(() => {}),
  Lead.collection.drop().catch(() => {}),
  LeadOwnership.collection.drop().catch(() => {}),
  LeadActivity.collection.drop().catch(() => {}),
]);

    // ── Zones ──
    const zoneData = [
      { zoneName: "Indiranagar",     zoneManager: "Ravi Kumar", areas: ["Indiranagar", "HAL Airport Road"] },
      { zoneName: "Domlur",          zoneManager: "Sneha Iyer",  areas: ["Domlur", "Ejipura"] },
      { zoneName: "Murugeshpalya",   zoneManager: "Amit Shah",   areas: ["Murugeshpalya", "Old Airport Road"] },
      { zoneName: "EGL",             zoneManager: "Priya Nair",  areas: ["EGL", "Bellandur", "Sarjapur Road"] },
      { zoneName: "Electronic City", zoneManager: "Kiran Rao",   areas: ["Electronic City", "Hosur Road"] },
    ];
    const zones = await Zone.insertMany(zoneData);

    // ── Super Admin ──
    await User.create({
      username: "superadmin",
      passwordHash: "Admin@1234",
      employeeName: "Super Admin",
      role: "super_admin",
      zoneId: null,
    });

    // ── Zone users ──
    const roles = ["zone_admin","alpha","beta","gamma","fire","water"];
    for (const zone of zones) {
      for (const role of roles) {
        const zoneSafe = zone.zoneName.toLowerCase().replace(/\s/g, "_");
        await User.create({
          username: `${role}_${zoneSafe}`,
          passwordHash: "Pass@1234",
          employeeName: `${role} (${zone.zoneName})`,
          role,
          zoneId: zone._id,
        });
      }
    }

    // ── Properties — use create() one by one so pre-save hook fires ──
    const p1 = await Property.create({ propertyName: "Indiranagar Luxe PG", zoneId: zones[0]._id, location: "Indiranagar",     totalBeds: 20, availableBeds: 5,  rentPrice: 15000, genderAllowed: "coed",  propertyRating: "A" });
    const p2 = await Property.create({ propertyName: "Domlur Premium Stay", zoneId: zones[1]._id, location: "Domlur",          totalBeds: 15, availableBeds: 3,  rentPrice: 12000, genderAllowed: "girls", propertyRating: "A" });
    const p3 = await Property.create({ propertyName: "Murugesh Boys PG",    zoneId: zones[2]._id, location: "Murugeshpalya",   totalBeds: 30, availableBeds: 8,  rentPrice: 9000,  genderAllowed: "boys",  propertyRating: "B" });
    const p4 = await Property.create({ propertyName: "EGL Comfort Stay",    zoneId: zones[3]._id, location: "EGL",             totalBeds: 25, availableBeds: 6,  rentPrice: 13000, genderAllowed: "coed",  propertyRating: "A" });
    const p5 = await Property.create({ propertyName: "E-City Student Hub",  zoneId: zones[4]._id, location: "Electronic City", totalBeds: 40, availableBeds: 12, rentPrice: 8000,  genderAllowed: "coed",  propertyRating: "B" });
    const properties = [p1, p2, p3, p4, p5];

    // ── Leads — use create() one by one so leadId auto-generates ──
    const alphaUser = await User.findOne({ username: "alpha_indiranagar" });

    const leadInputs = [
      { leadName: "Rahul Sharma",  phone: "9876543210", email: "rahul@example.com",  budget: "12000", locationPreference: "Indiranagar",     occupation: "working", stage: "new_lead",        currentZoneId: zones[0]._id, leadSource: "whatsapp",  leadTemperature: "hot" },
      { leadName: "Priya Nair",    phone: "8765432109", email: "priya@example.com",   budget: "8-12k", locationPreference: "Domlur",          occupation: "student", stage: "contacted",       currentZoneId: zones[1]._id, leadSource: "website",   leadTemperature: "warm" },
      { leadName: "Amit Kumar",    phone: "7654321098", email: "amit@example.com",    budget: "9000",  locationPreference: "Murugeshpalya",   occupation: "intern",  stage: "qualified",       currentZoneId: zones[2]._id, leadSource: "instagram", leadTemperature: "warm" },
      { leadName: "Sneha Ghosh",   phone: "6543210987", email: "sneha@example.com",   budget: "13000", locationPreference: "EGL",             occupation: "working", stage: "visit_scheduled", currentZoneId: zones[3]._id, leadSource: "referral",  leadTemperature: "hot" },
      { leadName: "Kiran Reddy",   phone: "9988776655", email: "kiran@example.com",   budget: "8000",  locationPreference: "Electronic City", occupation: "student", stage: "booked",          currentZoneId: zones[4]._id, leadSource: "whatsapp",  leadTemperature: "hot" },
      { leadName: "Global Lead",   phone: "9000000001", email: "global@example.com",  budget: "10000", locationPreference: "Bangalore",       occupation: "working", stage: "new_lead",        currentZoneId: null,         leadSource: "website",   leadTemperature: "warm" },
    ];

    const leads = [];
    for (const ld of leadInputs) {
      const lead = await Lead.create({
        ...ld,
        createdBy: alphaUser!._id,
        currentOwnerId: alphaUser!._id,
      });
      await LeadOwnership.create({
        leadId: lead._id,
        zoneId: ld.currentZoneId || null,
        assignedToUser: alphaUser!._id,
      });
      await LeadActivity.create({
        leadId: lead._id,
        userId: alphaUser!._id,
        actionType: "lead_created",
        notes: "Seeded",
      });
      leads.push(lead);
    }

    return Response.json({
      success: true,
      message: "✅ Seed complete!",
      credentials: {
        superAdmin: { username: "superadmin",              password: "Admin@1234" },
        zoneAdmin:  { username: "zone_admin_indiranagar",  password: "Pass@1234" },
        alpha:      { username: "alpha_indiranagar",       password: "Pass@1234" },
        gamma:      { username: "gamma_domlur",            password: "Pass@1234" },
        fire:       { username: "fire_egl",                password: "Pass@1234" },
        pattern:    "{role}_{zone_name} / Pass@1234",
      },
      counts: {
        zones:      zones.length,
        properties: properties.length,
        leads:      leads.length,
      },
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}