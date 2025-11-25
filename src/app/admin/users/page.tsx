import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { desc } from "drizzle-orm"

export default async function UsersPage() {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt))

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Manajemen User</h2>
            <div className="grid gap-4">
                {allUsers.map((user) => (
                    <Card key={user.id}>
                        <CardHeader>
                            <CardTitle>{user.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Username: {user.username}</p>
                            <p>Role: {user.role}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
