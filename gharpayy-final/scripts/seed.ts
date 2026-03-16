/**
 * Seed script — run with: npm run seed
 * Creates: 5 zones, super_admin, one zone_admin per zone,
 *          one of each sub-role per zone, 5 sample properties, 10 sample leads
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Try multiple possible .env file locations
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Import models
const MONGODB_URI = process.env.MONGODB_URI 
  || "mongodb+srv://gharpayy_user:GN87c9Tb3tkjqSMY@cluster0.iibqlyr.mongodb.net/gharpayy?retryWrites=true&w=majority&appName=Cluster0";

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not set in .env.local");
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to MongoDB");

  // Dynamically import models after connection
  const { Zone } = require("../models/Zone");
  const { User } = require("../models/User");
  const { Property } = require("../models/Property");
  const { Lead } = require("../models/Lead");
  const { LeadOwnership } = require("../models/LeadOwnership");
  const { LeadActivity } = require("../models/LeadActivity");

  // Clear existing seed data
  await Promise.all([
    Zone.deleteMany({}),
    User.deleteMany({}),
    Property.deleteMany({}),
    Lead.deleteMany({}),
    LeadOwnership.deleteMany({}),
    LeadActivity.deleteMany({}),
  ]);
  console.log("🗑️   Cleared existing data");

  // ── Zones ──
  const zoneData = [
    { zoneName: "Indiranagar", zoneManager: "Ravi Kumar", areas: ["Indiranagar", "HAL Airport Road"] },
    { zoneName: "Domlur",      zoneManager: "Sneha Iyer",  areas: ["Domlur", "Ejipura", "CV Raman Nagar"] },
    { zoneName: "Murugeshpalya", zoneManager: "Amit Shah", areas: ["Murugeshpalya", "Old Airport Road"] },
    { zoneName: "EGL",         zoneManager: "Priya Nair",  areas: ["EGL", "Bellandur", "Sarjapur Road"] },
    { zoneName: "Electronic City", zoneManager: "Kiran Rao", areas: ["Electronic City", "Bommasandra", "Hosur Road"] },
  ];
  const zones = await Zone.insertMany(zoneData);
  console.log(`✅  Created ${zones.length} zones`);

  // ── Super Admin ──
  const superAdmin = await User.create({
    username: "superadmin",
    passwordHash: "Admin@1234",
    employeeName: "Super Admin",
    role: "super_admin",
    zoneId: null,
  });
  console.log("✅  Super admin created → username: superadmin / password: Admin@1234");

  // ── Zone users ──
  const roles = ["zone_admin", "alpha", "beta", "gamma", "fire", "water"];
  const createdUsers: any[] = [superAdmin];

  for (const zone of zones) {
    for (const role of roles) {
      const username = `${role}_${zone.zoneName.toLowerCase().replace(/\s/g, "_")}`;
      const user = await User.create({
        username,
        passwordHash: "Pass@1234",
        employeeName: `${role.charAt(0).toUpperCase() + role.slice(1)} (${zone.zoneName})`,
        role,
        zoneId: zone._id,
      });
      createdUsers.push(user);
    }
  }
  console.log(`✅  Created ${createdUsers.length} users`);

  // ── Properties ──
  const propertyData = [
    { propertyId: "P001", propertyName: "Indiranagar Luxe PG", zoneId: zones[0]._id, address: "12th Main, Indiranagar",     location: "Indiranagar",     latitude: 12.9784, longitude: 77.6408, totalBeds: 20, availableBeds: 5,  rentPrice: 15000, propertyRating: "A", genderAllowed: "coed",  foodAvailable: true,  amenities: ["WiFi", "AC", "Meals"],    status: "active" },
    { propertyId: "P002", propertyName: "Domlur Premium Stay",  zoneId: zones[1]._id, address: "Domlur Layout",             location: "Domlur",          latitude: 12.9604, longitude: 77.6380, totalBeds: 15, availableBeds: 3,  rentPrice: 12000, propertyRating: "A", genderAllowed: "girls", foodAvailable: false, amenities: ["WiFi", "Laundry"],        status: "active" },
    { propertyId: "P003", propertyName: "Murugesh Boys PG",     zoneId: zones[2]._id, address: "Murugeshpalya Main Rd",     location: "Murugeshpalya",   latitude: 12.9590, longitude: 77.6490, totalBeds: 30, availableBeds: 8,  rentPrice: 9000,  propertyRating: "B", genderAllowed: "boys",  foodAvailable: false, amenities: ["WiFi", "Parking"],        status: "active" },
    { propertyId: "P004", propertyName: "EGL Comfort Stay",     zoneId: zones[3]._id, address: "EGL Signal, Bellandur",     location: "EGL",             latitude: 12.9352, longitude: 77.6962, totalBeds: 25, availableBeds: 6,  rentPrice: 13000, propertyRating: "A", genderAllowed: "coed",  foodAvailable: true,  amenities: ["WiFi", "AC", "Gym"],      status: "active" },
    { propertyId: "P005", propertyName: "E-City Student Hub",   zoneId: zones[4]._id, address: "Phase 2, Electronic City", location: "Electronic City", latitude: 12.8399, longitude: 77.6770, totalBeds: 40, availableBeds: 12, rentPrice: 8000,  propertyRating: "B", genderAllowed: "coed",  foodAvailable: true,  amenities: ["WiFi", "Meals"],          status: "active" },
  ];
  const properties = await Property.insertMany(propertyData);
  console.log(`✅  Created ${properties.length} properties`);

  // ── Sample Leads ──
  const alphaUser = createdUsers.find((u) => u.role === "alpha" && String(u.zoneId) === String(zones[0]._id));

  const leadData = [
    { leadName: "Rahul Sharma",   phone: "9876543210", email: "rahul@example.com",   budget: "12000", locationPreference: "Indiranagar", occupation: "working", stage: "new_lead",        currentZoneId: zones[0]._id, leadSource: "whatsapp", leadTemperature: "hot" },
    { leadName: "Priya Nair",     phone: "8765432109", email: "priya@example.com",    budget: "8-12k", locationPreference: "Domlur",       occupation: "student", stage: "contacted",       currentZoneId: zones[1]._id, leadSource: "website",  leadTemperature: "warm" },
    { leadName: "Amit Kumar",     phone: "7654321098", email: "amit@example.com",     budget: "9000",  locationPreference: "Murugeshpalya",occupation: "intern",  stage: "qualified",       currentZoneId: zones[2]._id, leadSource: "instagram",leadTemperature: "warm" },
    { leadName: "Sneha Ghosh",    phone: "6543210987", email: "sneha@example.com",    budget: "13000", locationPreference: "EGL",          occupation: "working", stage: "visit_scheduled", currentZoneId: zones[3]._id, leadSource: "referral", leadTemperature: "hot" },
    { leadName: "Kiran Reddy",    phone: "9988776655", email: "kiran@example.com",    budget: "8000",  locationPreference: "Electronic City",occupation: "student",stage: "visit_completed",currentZoneId: zones[4]._id, leadSource: "whatsapp", leadTemperature: "hot" },
    { leadName: "Meera Pillai",   phone: "8877665544", email: "meera@example.com",    budget: "15000", locationPreference: "Indiranagar", occupation: "working", stage: "negotiation",     currentZoneId: zones[0]._id, leadSource: "website",  leadTemperature: "hot" },
    { leadName: "Rohan Verma",    phone: "7766554433", email: "rohan@example.com",    budget: "10000", locationPreference: "Domlur",       occupation: "intern",  stage: "booked",          currentZoneId: zones[1]._id, leadSource: "walk_in",  leadTemperature: "hot" },
    { leadName: "Ananya Singh",   phone: "6655443322", email: "ananya@example.com",   budget: "8500",  locationPreference: "Murugeshpalya",occupation: "student", stage: "lost",            currentZoneId: zones[2]._id, leadSource: "instagram",leadTemperature: "cold" },
    { leadName: "Vikram Joshi",   phone: "9123456780", email: "vikram@example.com",   budget: "12000", locationPreference: "EGL",          occupation: "working", stage: "new_lead",        currentZoneId: null,         leadSource: "website",  leadTemperature: "warm" },
    { leadName: "Divya Menon",    phone: "8234567891", email: "divya@example.com",    budget: "9500",  locationPreference: "Electronic City",occupation: "student",stage: "contacted",       currentZoneId: zones[4]._id, leadSource: "whatsapp", leadTemperature: "warm" },
  ];

  for (const ld of leadData) {
    const lead = await Lead.create({ ...ld, createdBy: alphaUser._id, currentOwnerId: alphaUser._id });
    await LeadOwnership.create({ leadId: lead._id, zoneId: ld.currentZoneId || null, assignedToUser: alphaUser._id });
    await LeadActivity.create({ leadId: lead._id, userId: alphaUser._id, actionType: "lead_created", notes: "Seeded" });
  }
  console.log(`✅  Created ${leadData.length} sample leads`);

  console.log("\n🎉  Seed complete!\n");
  console.log("─────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Super Admin  → superadmin / Admin@1234");
  console.log("  Zone Admin   → zone_admin_indiranagar / Pass@1234");
  console.log("  Alpha        → alpha_indiranagar / Pass@1234");
  console.log("  (pattern: {role}_{zone_name} / Pass@1234)");
  console.log("─────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});