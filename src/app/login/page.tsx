import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { login } from "@/actions/auth"
import { ShieldCheck, Lock, User } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden px-4">
            {/* Background Effects */}
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10"></div>

            <Card className="w-full max-w-md border-none shadow-2xl bg-background/60 backdrop-blur-xl">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Selamat Datang</CardTitle>
                    <CardDescription>
                        Masuk untuk mengakses sistem ujian <br />
                        <span className="font-medium text-primary">SMAN 1 Campurdarat</span>
                    </CardDescription>
                </CardHeader>
                <form action={login}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input id="username" name="username" className="pl-9" placeholder="Masukkan username" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input id="password" name="password" type="password" className="pl-9" placeholder="••••••••" required />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pt-4">
                        <Button className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                            Masuk
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Lupa password? Hubungi administrator sekolah.
                        </p>
                        <Link href="/" className="text-xs text-center text-primary hover:underline">
                            Kembali ke Beranda
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
