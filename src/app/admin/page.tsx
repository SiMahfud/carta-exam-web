import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Ujian</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Siswa Terdaftar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Ujian Aktif</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">0</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
