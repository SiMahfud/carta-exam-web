import { db } from "./db";
import { users } from "./schema";

async function main() {
    console.log("Seeding database...");

    try {
        await db.insert(users).values({
            name: "Administrator",
            username: "admin",
            password: "password123", // In production, hash this!
            role: "admin",
        });
        console.log("Admin user created: admin / password123");
    } catch (e) {
        console.error("Error seeding:", e);
    }
}

main();
