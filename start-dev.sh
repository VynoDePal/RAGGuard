#!/bin/bash

# =============================================
# Script pour lancer RAGGuard + Dashboard en même temps
# =============================================

set -e

echo "🚀 Lancement de RAGGuard + Dashboard..."

# Vérifier si les dossiers existent
if [ ! -d "dashcraft-app" ]; then
    echo "❌ Erreur : le dossier 'dashcraft-app' n'existe pas"
    exit 1
fi

# Fonction pour tuer les processus enfants à la sortie
cleanup() {
    echo ""
    echo "🛑 Arrêt des serveurs..."
    jobs -p | xargs -r kill
    exit 0
}
trap cleanup SIGINT SIGTERM

# Lancer le backend RAGGuard (port 3000)
echo "🔧 Démarrage du backend RAGGuard (port 3000)..."
cd "$(pwd)"
npm run dev &
RAG_PID=$!

# Attendre un peu que le backend démarre
sleep 3

# Lancer le dashboard (port 3001)
echo "📊 Démarrage du dashboard (port 3001)..."
cd "$(pwd)/dashcraft-app"
PORT=3001 npm run dev &
DASH_PID=$!

# Revenir au dossier racine
cd "$(pwd)"

echo ""
echo "✅ Serveurs démarrés :"
echo "   • Backend RAGGuard : http://localhost:3000"
echo "   • Dashboard        : http://localhost:3001"
echo ""
echo "⚡ Appuyez sur Ctrl+C pour arrêter les deux serveurs"

# Attendre que tous les jobs en arrière-plan se terminent
wait
