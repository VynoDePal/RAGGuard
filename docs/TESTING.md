# Guide de Test - RAGGuard

Ce guide explique comment tester le système RAGGuard, de la configuration initiale aux tests end-to-end.

## Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration Initiale](#configuration-initiale)
3. [Tests Manuels avec cURL](#tests-manuels-avec-curl)
4. [Tests via l'Interface Web](#tests-via-linterface-web)
5. [Tests Automatisés](#tests-automatisés)
6. [Scénarios de Test](#scénarios-de-test)
7. [Debugging](#debugging)

---

## Prérequis

### Variables d'Environnement

Assurez-vous que votre fichier `.env.local` contient :

```bash
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LLM - Au moins un provider requis
GOOGLE_API_KEY=your_google_api_key        # Recommandé (gratuit)
OPENAI_API_KEY=your_openai_api_key        # Optionnel

# Optionnel
DD_API_KEY=your_datadog_api_key
```

### Démarrer le Serveur

```bash
# Mode développement
npm run dev

# Ou build + production
npm run build && npm start
```

Le serveur démarre sur `http://localhost:3000`

---

## Configuration Initiale

### 1. Créer un Tenant de Test

Dans Supabase SQL Editor, exécutez :

```sql
-- Créer un tenant de test
INSERT INTO tenants (id, name, slug) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test');

-- Vérifier
SELECT * FROM tenants;
```

### 2. Ajouter des Documents de Test

Créez un fichier `test-data.json` :

```json
{
  "title": "Politique de Remboursement",
  "content": "Notre politique de remboursement est la suivante : Les clients peuvent demander un remboursement dans les 30 jours suivant l'achat. Le produit doit être retourné dans son emballage d'origine. Les frais de retour sont à la charge du client sauf en cas de défaut du produit. Le remboursement est effectué sous 5 à 10 jours ouvrés après réception du produit retourné.",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "language": "fr"
}
```

---

## Tests Manuels avec cURL

### Health Check

```bash
# Vérifier que le service est opérationnel
curl http://localhost:3000/api/health | jq
```

**Réponse attendue :**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-05T18:00:00.000Z",
  "checks": {
    "supabase": true,
    "environment": true
  }
}
```

### Upload d'un Document

```bash
# Créer et uploader un document
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Politique de Remboursement",
    "content": "Notre politique de remboursement est la suivante : Les clients peuvent demander un remboursement dans les 30 jours suivant lachat. Le produit doit être retourné dans son emballage dorigine. Les frais de retour sont à la charge du client sauf en cas de défaut du produit. Le remboursement est effectué sous 5 à 10 jours ouvrés après réception du produit retourné.",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "language": "fr"
  }' | jq
```

**Réponse attendue :**
```json
{
  "id": "uuid-du-document",
  "title": "Politique de Remboursement",
  "chunks_created": 1
}
```

### Lister les Documents

```bash
curl "http://localhost:3000/api/documents?tenant_id=00000000-0000-0000-0000-000000000001" | jq
```

### Requête RAG

```bash
# Poser une question
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quel est le délai de remboursement ?",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "language": "fr"
  }' | jq
```

**Réponse attendue :**
```json
{
  "response": "Le remboursement est effectué sous 5 à 10 jours ouvrés après réception du produit retourné.",
  "sources": [...],
  "faithfulness_score": 0.95,
  "abstained": false,
  "trace_id": "uuid",
  "latency_ms": 1234
}
```

### Requête RAG avec Options

```bash
# Avec paramètres personnalisés
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Comment retourner un produit ?",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "language": "fr",
    "options": {
      "top_k": 3,
      "provider": "google",
      "model": "gemini-2.0-flash-exp",
      "temperature": 0.3
    }
  }' | jq
```

### Récupérer les Statistiques

```bash
curl "http://localhost:3000/api/stats?tenant_id=00000000-0000-0000-0000-000000000001" | jq
```

**Réponse attendue :**
```json
{
  "documents": 1,
  "chunks": 1,
  "queries": 2,
  "avg_faithfulness": 0.92,
  "abstention_rate": 0.0,
  "avg_latency_ms": 1500,
  "trends": {
    "faithfulness_24h": 0.0,
    "queries_24h": 2
  }
}
```

---

## Tests via l'Interface Web

### 1. Page d'Accueil

1. Ouvrez `http://localhost:3000`
2. Vérifiez que la landing page RAGGuard s'affiche
3. Cliquez sur "Accéder au Dashboard"

### 2. Dashboard

1. Ouvrez `http://localhost:3000/dashboard`
2. Testez chaque onglet :
   - **Assistant RAG** : Posez une question dans le chat
   - **Observabilité** : Vérifiez les métriques
   - **Documents** : Consultez la liste des documents

### 3. Test du Chat

1. Dans l'onglet "Assistant RAG"
2. Tapez : "Quel est le délai de remboursement ?"
3. Vérifiez :
   - La réponse est pertinente
   - Le score de fidélité s'affiche
   - Les sources sont listées

---

## Tests Automatisés

### Installation des Dépendances de Test

```bash
# Installer Vitest pour les tests unitaires
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react

# Installer Playwright pour les tests E2E
npm install -D @playwright/test
npx playwright install
```

### Configuration Vitest

Créez `vitest.config.ts` :

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Scripts NPM

Ajoutez dans `package.json` :

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage"
  }
}
```

### Exemple de Test Unitaire

Créez `tests/lib/utils.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import { cn, generateId, sanitizeText } from '@/lib/utils'

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('sanitizeText', () => {
    it('should remove dangerous characters', () => {
      const result = sanitizeText('<script>alert("xss")</script>')
      expect(result).not.toContain('<script>')
    })
  })
})
```

### Exemple de Test E2E avec Playwright

Créez `tests/e2e/rag.spec.ts` :

```typescript
import { test, expect } from '@playwright/test'

test.describe('RAG System', () => {
  test('health check returns healthy', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    
    const body = await response.json()
    expect(body.status).toBe('healthy')
  })

  test('can upload and query documents', async ({ request }) => {
    const tenantId = '00000000-0000-0000-0000-000000000001'
    
    // Upload document
    const uploadResponse = await request.post('/api/documents', {
      data: {
        title: 'Test Document',
        content: 'Le prix du produit A est de 50 euros.',
        tenant_id: tenantId,
        language: 'fr'
      }
    })
    expect(uploadResponse.ok()).toBeTruthy()
    
    // Query
    const queryResponse = await request.post('/api/rag/query', {
      data: {
        query: 'Quel est le prix du produit A ?',
        tenant_id: tenantId,
        language: 'fr'
      }
    })
    expect(queryResponse.ok()).toBeTruthy()
    
    const result = await queryResponse.json()
    expect(result.response).toContain('50')
    expect(result.faithfulness_score).toBeGreaterThan(0.7)
  })

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Assistant RAG')).toBeVisible()
    await expect(page.getByText('Observabilité')).toBeVisible()
  })
})
```

---

## Scénarios de Test

### Scénario 1 : Test de Fidélité

**Objectif** : Vérifier que le système refuse de répondre sans contexte pertinent.

```bash
# Question sans contexte correspondant
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quelle est la capitale de la France ?",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "language": "fr"
  }' | jq '.abstained, .faithfulness_score'
```

**Résultat attendu** : `abstained: true` si aucun document ne parle de géographie.

### Scénario 2 : Test Multi-Documents

**Objectif** : Vérifier la fusion de plusieurs sources.

```bash
# Uploader plusieurs documents
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Livraison",
    "content": "La livraison standard est gratuite pour les commandes de plus de 50 euros. La livraison express coûte 9.99 euros.",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'

curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Retours",
    "content": "Les retours sont gratuits pendant 30 jours. Utilisez létiquette pré-payée fournie.",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'

# Question nécessitant plusieurs sources
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quelles sont les conditions de livraison et de retour ?",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }' | jq
```

### Scénario 3 : Test de Performance

**Objectif** : Mesurer les latences.

```bash
# Script de benchmark
for i in {1..10}; do
  time curl -s -X POST http://localhost:3000/api/rag/query \
    -H "Content-Type: application/json" \
    -d '{
      "query": "Quel est le délai de remboursement ?",
      "tenant_id": "00000000-0000-0000-0000-000000000001"
    }' > /dev/null
done
```

### Scénario 4 : Test Multi-Provider

**Objectif** : Vérifier que chaque provider LLM fonctionne.

```bash
# Test avec Google Gemini (défaut)
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Test",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "options": { "provider": "google" }
  }' | jq '.response'

# Test avec OpenAI (si configuré)
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Test",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "options": { "provider": "openai" }
  }' | jq '.response'
```

---

## Debugging

### Logs en Temps Réel

```bash
# Voir les logs du serveur Next.js
npm run dev 2>&1 | tee logs.txt
```

### Vérifier les Requêtes dans Supabase

```sql
-- Dernières requêtes RAG
SELECT 
  query,
  response,
  faithfulness_score,
  abstained,
  llm_model,
  retrieval_latency_ms,
  llm_latency_ms,
  created_at
FROM rag_queries
ORDER BY created_at DESC
LIMIT 10;

-- Statistiques par jour
SELECT 
  DATE(created_at) as date,
  COUNT(*) as queries,
  AVG(faithfulness_score) as avg_faithfulness,
  AVG(retrieval_latency_ms + llm_latency_ms) as avg_total_latency
FROM rag_queries
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Problèmes Courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Missing API key` | Clé API non configurée | Vérifier `.env.local` |
| `No chunks found` | Aucun document uploadé | Uploader des documents |
| `Faithfulness score: 0` | Réponse hors contexte | Vérifier le contenu des documents |
| `CORS error` | Requête cross-origin | Utiliser le même domaine |
| `Connection refused` | Serveur arrêté | Relancer `npm run dev` |

### Réinitialiser les Données de Test

```sql
-- Supprimer les données de test (ATTENTION)
DELETE FROM rag_queries WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM document_chunks WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM documents WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

---

## Checklist de Test

- [ ] Health check OK
- [ ] Upload de document fonctionne
- [ ] Requête RAG retourne une réponse
- [ ] Score de fidélité > 0.75 pour questions pertinentes
- [ ] Abstention pour questions hors contexte
- [ ] Dashboard accessible
- [ ] Chat interface fonctionnel
- [ ] Statistiques s'affichent
- [ ] Latence < 3s pour une requête
- [ ] Plusieurs providers LLM testés
