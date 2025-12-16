import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

async function createTable() {
    console.log('Connecting to MySQL...');
    try {
        const connection = await mysql.createConnection(dbUrl!);
        console.log('Connected.');

        const createQuery = `
            CREATE TABLE IF NOT EXISTS school_settings (
                id varchar(36) PRIMARY KEY,
                school_name varchar(255) NOT NULL DEFAULT 'SMAN 1 Campurdarat',
                school_description text,
                logo_url varchar(500),
                hero_title varchar(255) NOT NULL DEFAULT 'Ujian Modern untuk Generasi Digital',
                hero_description varchar(500) NOT NULL DEFAULT 'Platform ujian yang aman, cerdas, dan mudah digunakan.',
                hero_show_stats boolean DEFAULT true,
                features_title varchar(255) DEFAULT 'Fitur Unggulan',
                features_subtitle varchar(255) DEFAULT 'Dirancang khusus untuk kebutuhan evaluasi akademik modern.',
                features json,
                footer_text varchar(255) DEFAULT 'Built with ❤️ for education.',
                contact_email varchar(255),
                contact_phone varchar(50),
                address text,
                updated_by varchar(36),
                updated_at timestamp DEFAULT CURRENT_TIMESTAMP
            );
        `;

        console.log('Creating table school_settings...');
        await connection.execute(createQuery);
        console.log('Table school_settings created (or already exists).');

        // Check if saved_filters exists
        const createSavedFiltersQuery = `
            CREATE TABLE IF NOT EXISTS saved_filters (
                id varchar(36) PRIMARY KEY,
                user_id varchar(36) NOT NULL,
                name varchar(255) NOT NULL,
                page varchar(255) NOT NULL,
                filters json NOT NULL,
                is_default boolean DEFAULT false,
                created_at timestamp DEFAULT CURRENT_TIMESTAMP
            );
        `;
        console.log('Creating table saved_filters...');
        await connection.execute(createSavedFiltersQuery);
        console.log('Table saved_filters created (or already exists).');

        await connection.end();
    } catch (error) {
        console.error('Failed to create table:', error);
        process.exit(1);
    }
}

createTable();
