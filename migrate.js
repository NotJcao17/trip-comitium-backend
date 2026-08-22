const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function runMigrations() {
    console.log('🚀 Iniciando proceso de migraciones en TiDB Cloud...');

    try {
        // 1. Crear tabla de control de migraciones si no existe
        await db.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Obtener lista de migraciones ya aplicadas
        const [appliedRows] = await db.query('SELECT migration_name FROM schema_migrations;');
        const appliedSet = new Set(appliedRows.map(r => r.migration_name));

        // 3. Leer archivos en server/migrations/
        const migrationsDir = path.join(__dirname, 'migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.log('No se encontró la carpeta migrations.');
            process.exit(0);
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        let count = 0;

        for (const file of files) {
            if (appliedSet.has(file)) {
                console.log(`⏩ [SALTADA] ${file} (ya aplicada anteriormente)`);
                continue;
            }

            console.log(`⚙️  [APLICANDO] ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sqlContent = fs.readFileSync(filePath, 'utf-8');

            // Separar sentencias por punto y coma
            const statements = sqlContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const statement of statements) {
                await db.query(statement);
            }

            // Registrar en schema_migrations
            await db.query('INSERT INTO schema_migrations (migration_name) VALUES (?);', [file]);
            console.log(`✅ [COMPLETADA] ${file}`);
            count++;
        }

        console.log(`\n🎉 Proceso de migraciones finalizado con éxito. (${count} nuevas migraciones aplicadas)`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al ejecutar las migraciones:', error);
        process.exit(1);
    }
}

runMigrations();
