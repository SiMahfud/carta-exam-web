import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "CartaExam - Platform Ujian Digital SMAN 1 Campurdarat",
        short_name: "CartaExam",
        description: "Aplikasi Ujian Online Digital Mandiri dan Aman untuk Siswa dan Guru",
        start_url: "/student",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#2563eb",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
        ],
    };
}
