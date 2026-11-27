import { db } from "./db";
import { users } from "./schema";
import bcrypt from "bcryptjs";

async function main() {
    console.log("Seeding database...");

    try {
        const adminPasswordHash = await bcrypt.hash("password123", 10);
        const studentPasswordHash = await bcrypt.hash("siswa123", 10);

        await db.insert(users).values({
            name: "Administrator",
            username: "admin",
            password: adminPasswordHash,
            role: "admin",
        }).onConflictDoNothing();
        console.log("Admin user seeded: admin / password123 (change after login)");

        await db.insert(users).values({
            name: "Student Demo",
            username: "siswa",
            password: studentPasswordHash,
            role: "student",
        }).onConflictDoNothing();
        console.log("Student user seeded: siswa / siswa123");
    } catch (e) {
        console.error("Error seeding:", e);
    }
}

main();
