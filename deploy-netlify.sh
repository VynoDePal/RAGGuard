#!/bin/bash

# Script de déploiement automatique pour RAGGuard sur Netlify
# Utilise Netlify CLI pour déployer les 2 applications du monorepo

set -e

echo "🚀 Déploiement RAGGuard sur Netlify"
echo ""

# Vérifier que netlify-cli est disponible
if ! command -v netlify &> /dev/null; then
    echo "📦 Installation de Netlify CLI..."
    npm install -g netlify-cli
fi

# Se connecter à Netlify
echo "🔐 Connexion à Netlify..."
netlify login

# Backend
echo ""
echo "📦 Déploiement du Backend RAGGuard..."
cd "$(dirname "$0")"

# Build du backend
echo "🔨 Build du backend..."
npm run build

# Lier au site Netlify
netlify link --id 2c6da7b2-2664-44ae-8d06-f2b54dc4619b

# Déployer en production
netlify deploy --prod --dir=.next

echo "✅ Backend déployé : https://ragguard-backend-api.netlify.app"

# Dashboard
echo ""
echo "📊 Déploiement du Dashboard..."
cd dashcraft-app

# Build du dashboard
echo "🔨 Build du dashboard..."
npm run build

# Lier au site Netlify
netlify link --id ab2e9170-c1c6-4bb4-8d44-75da826a69a6

# Déployer en production
netlify deploy --prod --dir=.next

echo "✅ Dashboard déployé : https://ragguard-dashboard.netlify.app"

echo ""
echo "🎉 Déploiement terminé !"
echo ""
echo "URLs des applications :"
echo "  • Backend  : https://ragguard-backend-api.netlify.app"
echo "  • Dashboard: https://ragguard-dashboard.netlify.app"
