/**
 * Breadcrumb configuration for admin pages
 * Maps route segments to human-readable labels
 */

export interface BreadcrumbSegment {
    label: string;
    href: string;
}

// Static route labels
const routeLabels: Record<string, string> = {
    'admin': 'Dashboard',
    'subjects': 'Mata Pelajaran',
    'classes': 'Kelas & Siswa',
    'question-banks': 'Bank Soal',
    'exam-templates': 'Template Ujian',
    'exam-sessions': 'Sesi Ujian',
    'exams': 'Ujian',
    'grading': 'Penilaian',
    'users': 'Manajemen User',
    'create': 'Buat Baru',
    'edit': 'Edit',
    'preview': 'Preview',
    'questions': 'Soal',
    'results': 'Hasil',
    'monitor': 'Monitor',
    'student': 'Siswa',
    'settings': 'Pengaturan',
};

/**
 * Generate breadcrumbs from pathname
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbSegment[] {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbSegment[] = [];

    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        currentPath += `/${segment}`;

        // Skip numeric/UUID segments in labels but include in path
        const isId = /^[a-f0-9-]{8,}$/i.test(segment) || /^\d+$/.test(segment);

        if (isId) {
            // For ID segments, we'll let the component fetch the actual name
            breadcrumbs.push({
                label: '...',
                href: currentPath,
            });
        } else {
            breadcrumbs.push({
                label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
                href: currentPath,
            });
        }
    }

    return breadcrumbs;
}

/**
 * Get label for a route segment
 */
export function getRouteLabel(segment: string): string {
    return routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}
