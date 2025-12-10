"use client"

import { useEffect, useState } from "react"
import { driver, Driver, DriveStep } from "driver.js"
import "driver.js/dist/driver.css"

const TOUR_COMPLETED_KEY = "cartaexam_admin_tour_completed"

const tourSteps: DriveStep[] = [
    {
        element: "[data-tour='sidebar']",
        popover: {
            title: "Menu Navigasi",
            description: "Gunakan menu samping untuk mengakses berbagai fitur seperti Bank Soal, Template Ujian, dan Manajemen Siswa.",
            side: "right",
            align: "start",
        },
    },
    {
        element: "[data-tour='dashboard-stats']",
        popover: {
            title: "Statistik Dashboard",
            description: "Lihat ringkasan data penting seperti jumlah siswa, ujian aktif, dan soal yang tersedia.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='quick-actions']",
        popover: {
            title: "Aksi Cepat",
            description: "Gunakan menu cepat untuk membuat ujian baru, menambah soal, atau mengelola siswa dengan cepat.",
            side: "top",
            align: "center",
        },
    },
    {
        element: "[data-tour='global-search']",
        popover: {
            title: "Pencarian Global",
            description: "Tekan Ctrl+K (atau Cmd+K di Mac) untuk mencari soal, ujian, siswa, dan lainnya dengan cepat.",
            side: "bottom",
            align: "center",
        },
    },
    {
        element: "[data-tour='help-button']",
        popover: {
            title: "Pusat Bantuan",
            description: "Klik tombol ini kapan saja untuk mengakses panduan dan FAQ.",
            side: "left",
            align: "center",
        },
    },
]

export function OnboardingTour() {
    const [driverInstance, setDriverInstance] = useState<Driver | null>(null)
    const [shouldShowTour, setShouldShowTour] = useState(false)

    useEffect(() => {
        // Check if tour has been completed
        const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY)
        if (!tourCompleted) {
            setShouldShowTour(true)
        }
    }, [])

    useEffect(() => {
        if (!shouldShowTour) return

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            const driverObj = driver({
                showProgress: true,
                showButtons: ["next", "previous", "close"],
                nextBtnText: "Lanjut",
                prevBtnText: "Kembali",
                doneBtnText: "Selesai",
                progressText: "{{current}} dari {{total}}",
                steps: tourSteps,
                onDestroyed: () => {
                    localStorage.setItem(TOUR_COMPLETED_KEY, "true")
                },
            })

            setDriverInstance(driverObj)
            driverObj.drive()
        }, 1000)

        return () => {
            clearTimeout(timeoutId)
            if (driverInstance) {
                driverInstance.destroy()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShowTour])

    return null
}

export function resetOnboardingTour() {
    localStorage.removeItem(TOUR_COMPLETED_KEY)
}
