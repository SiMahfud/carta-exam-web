/**
 * Error message mapping for user-friendly error display
 * Uses Indonesian language for consistency with the app
 */

export interface ErrorInfo {
    title: string;
    description: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}

// Map of error codes to user-friendly messages
const errorMessages: Record<string, ErrorInfo> = {
    // Authentication errors
    'AUTH_INVALID_CREDENTIALS': {
        title: 'Login Gagal',
        description: 'Email atau password yang Anda masukkan salah. Silakan coba lagi.',
        action: { label: 'Lupa Password?', href: '/forgot-password' }
    },
    'AUTH_SESSION_EXPIRED': {
        title: 'Sesi Berakhir',
        description: 'Sesi Anda telah berakhir. Silakan login kembali.',
        action: { label: 'Login', href: '/login' }
    },
    'AUTH_UNAUTHORIZED': {
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk mengakses halaman ini.'
    },

    // Validation errors
    'VALIDATION_ERROR': {
        title: 'Data Tidak Valid',
        description: 'Mohon periksa kembali data yang Anda masukkan.'
    },
    'REQUIRED_FIELD_MISSING': {
        title: 'Field Wajib Kosong',
        description: 'Mohon lengkapi semua field yang wajib diisi.'
    },

    // Network errors
    'NETWORK_ERROR': {
        title: 'Koneksi Bermasalah',
        description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        action: { label: 'Coba Lagi' }
    },
    'TIMEOUT_ERROR': {
        title: 'Waktu Habis',
        description: 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.',
        action: { label: 'Coba Lagi' }
    },

    // Database errors
    'NOT_FOUND': {
        title: 'Data Tidak Ditemukan',
        description: 'Data yang Anda cari tidak ditemukan atau telah dihapus.'
    },
    'DUPLICATE_ENTRY': {
        title: 'Data Sudah Ada',
        description: 'Data dengan informasi yang sama sudah ada dalam sistem.'
    },
    'DELETE_CONSTRAINT': {
        title: 'Tidak Dapat Dihapus',
        description: 'Data ini masih digunakan oleh data lain dan tidak dapat dihapus.'
    },

    // Exam errors
    'EXAM_NOT_STARTED': {
        title: 'Ujian Belum Dimulai',
        description: 'Ujian ini belum dimulai. Silakan tunggu hingga waktu ujian.'
    },
    'EXAM_ENDED': {
        title: 'Ujian Telah Berakhir',
        description: 'Waktu ujian telah habis. Jawaban Anda sudah tersimpan.'
    },
    'EXAM_ALREADY_SUBMITTED': {
        title: 'Ujian Sudah Dikumpulkan',
        description: 'Anda telah mengumpulkan jawaban untuk ujian ini.'
    },
    'EXAM_TOKEN_INVALID': {
        title: 'Token Tidak Valid',
        description: 'Token akses ujian tidak valid. Hubungi pengawas ujian Anda.'
    },
    'EXAM_MAX_VIOLATIONS': {
        title: 'Ujian Dibatalkan',
        description: 'Ujian Anda dibatalkan karena terlalu banyak pelanggaran.'
    },

    // File errors
    'FILE_TOO_LARGE': {
        title: 'File Terlalu Besar',
        description: 'Ukuran file melebihi batas maksimum yang diizinkan.'
    },
    'INVALID_FILE_TYPE': {
        title: 'Tipe File Tidak Valid',
        description: 'Jenis file ini tidak diizinkan. Gunakan format yang didukung.'
    },

    // Generic errors
    'INTERNAL_ERROR': {
        title: 'Terjadi Kesalahan',
        description: 'Terjadi kesalahan pada server. Tim kami telah diberitahu.'
    },
    'UNKNOWN_ERROR': {
        title: 'Terjadi Kesalahan',
        description: 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'
    }
};

/**
 * Get user-friendly error info from an error code or message
 */
export function getErrorInfo(error: string | Error | unknown): ErrorInfo {
    let errorCode = 'UNKNOWN_ERROR';

    if (typeof error === 'string') {
        // Check if it's a known error code
        if (errorMessages[error]) {
            errorCode = error;
        } else {
            // Try to extract error code from message
            const match = error.match(/\[([A-Z_]+)\]/);
            if (match && errorMessages[match[1]]) {
                errorCode = match[1];
            }
        }
    } else if (error instanceof Error) {
        // Check message for error code
        const match = error.message.match(/\[([A-Z_]+)\]/);
        if (match && errorMessages[match[1]]) {
            errorCode = match[1];
        }
    } else if (error && typeof error === 'object') {
        // Check for code property
        const obj = error as { code?: string; error?: string };
        if (obj.code && errorMessages[obj.code]) {
            errorCode = obj.code;
        } else if (obj.error && errorMessages[obj.error]) {
            errorCode = obj.error;
        }
    }

    // Check for network-specific errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
    }

    return errorMessages[errorCode] || errorMessages['UNKNOWN_ERROR'];
}

/**
 * Format API error response to ErrorInfo
 */
export function formatApiError(response: { error?: string; message?: string; code?: string }): ErrorInfo {
    if (response.code && errorMessages[response.code]) {
        return errorMessages[response.code];
    }

    if (response.error && errorMessages[response.error]) {
        return errorMessages[response.error];
    }

    return {
        title: 'Terjadi Kesalahan',
        description: response.message || response.error || 'Silakan coba lagi.'
    };
}
