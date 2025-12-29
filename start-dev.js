#!/usr/bin/env node

// =============================================
// Script Node.js pour lancer RAGGuard + Dashboard
// =============================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Lancement de RAGGuard + Dashboard...\n');

// Vérifier si le dossier dashcraft-app existe
const dashboardPath = path.join(__dirname, 'dashcraft-app');
if (!fs.existsSync(dashboardPath)) {
    console.error('❌ Erreur : le dossier "dashcraft-app" n\'existe pas');
    process.exit(1);
}

// Couleurs pour les logs
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Fonction pour préfixer les logs
function prefixStream(stream, prefix, color) {
    const originalWrite = stream.write;
    stream.write = function(chunk, encoding, callback) {
        const lines = chunk.toString().split('\n');
        const prefixed = lines
            .filter(line => line.trim())
            .map(line => `${color}[${prefix}]${colors.reset} ${line}`)
            .join('\n') + '\n';
        originalWrite.call(stream, prefixed, encoding, callback);
    };
}

// Lancer le backend RAGGuard (port 3000)
console.log('🔧 Démarrage du backend RAGGuard (port 3000)...');
const backend = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    cwd: __dirname,
    shell: true
});

// Préfixer les logs du backend
prefixStream(backend.stdout, 'RAGGuard', colors.green);
prefixStream(backend.stderr, 'RAGGuard', colors.red);

backend.on('error', (err) => {
    console.error(`❌ Erreur backend: ${err.message}`);
    process.exit(1);
});

// Attendre un peu que le backend démarre
setTimeout(() => {
    // Lancer le dashboard (port 3001)
    console.log('📊 Démarrage du dashboard (port 3001)...');
    const dashboard = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        cwd: dashboardPath,
        shell: true,
        env: { ...process.env, PORT: '3001' }
    });

    // Préfixer les logs du dashboard
    prefixStream(dashboard.stdout, 'Dashboard', colors.cyan);
    prefixStream(dashboard.stderr, 'Dashboard', colors.magenta);

    dashboard.on('error', (err) => {
        console.error(`❌ Erreur dashboard: ${err.message}`);
        process.exit(1);
    });

    console.log('\n✅ Serveurs démarrés :');
    console.log('   • Backend RAGGuard : http://localhost:3000');
    console.log('   • Dashboard        : http://localhost:3001');
    console.log('\n⚡ Appuyez sur Ctrl+C pour arrêter les deux serveurs\n');

    // Gérer l'arrêt propre
    process.on('SIGINT', () => {
        console.log('\n🛑 Arrêt des serveurs...');
        backend.kill('SIGINT');
        dashboard.kill('SIGINT');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Arrêt des serveurs...');
        backend.kill('SIGTERM');
        dashboard.kill('SIGTERM');
        process.exit(0);
    });

}, 3000);

// Gérer les erreurs du backend
backend.on('close', (code) => {
    console.log(`Backend terminé avec le code ${code}`);
    process.exit(code);
});
