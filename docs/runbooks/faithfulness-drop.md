# Runbook: Chute du Score de Fidélité

## Alerte P1
**Condition:** `avg(last_30m): llm.response.faithfulness_score < 0.75`

---

## Symptômes
- Score de fidélité moyen en dessous de 75%
- Augmentation du taux d'abstention
- Plaintes utilisateurs sur la qualité des réponses

---

## Étapes de Diagnostic

### 1. Inspecter les traces récentes (2h)

```bash
# Via Datadog APM
# Filtrer: service:ragguard AND @faithfulness_score:<0.75
# Trier par timestamp desc
```

Dans le dashboard Datadog:
- Aller dans APM > Traces
- Filtrer par `service:ragguard`
- Ajouter facette `@faithfulness_score`
- Examiner les traces avec score < 0.75

### 2. Extraire les logs problématiques

```sql
-- Via Supabase
SELECT 
    trace_id,
    query,
    faithfulness_score,
    llm_model,
    sources,
    created_at
FROM rag_queries
WHERE faithfulness_score < 0.5
AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Analyser les patterns

Questions à se poser:
- [ ] Les requêtes concernent-elles un domaine spécifique?
- [ ] Le retrieval retourne-t-il des documents pertinents?
- [ ] Y a-t-il eu un changement de prompt récent?
- [ ] Y a-t-il eu un changement de modèle LLM?
- [ ] L'index vectoriel est-il à jour?

### 4. Vérifier les changements récents

```bash
# Vérifier les déploiements récents
git log --oneline -20

# Vérifier les changements de prompt
git diff HEAD~5 -- prompts/

# Vérifier les changements de config
git diff HEAD~5 -- .env.example src/lib/config.ts
```

---

## Actions Correctives

### Si changement de prompt/modèle détecté

```bash
# Rollback vers la version précédente
git revert <commit-hash>

# Redéployer
npm run build && npm run start
```

### Si problème de retrieval

1. Vérifier l'état de l'index vectoriel:
```sql
-- Compter les chunks sans embedding
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NULL;
```

2. Élargir le Top K:
```typescript
// Dans src/lib/config.ts
rag: {
    topK: 8, // Augmenter de 5 à 8
}
```

3. Ajuster le seuil de similarité:
```typescript
similarityThreshold: 0.6, // Baisser de 0.7 à 0.6
```

### Si problème de contexte

1. Augmenter les tokens de contexte:
```typescript
maxContextTokens: 6000, // Augmenter de 4000 à 6000
```

2. Améliorer le reranking:
- Vérifier que le reranker fonctionne
- Augmenter le nombre de chunks à reranker

---

## Validation Post-Fix

1. Monitorer le score de fidélité pendant 30 minutes
2. Vérifier que le score remonte au-dessus de 0.75
3. Tester manuellement quelques requêtes problématiques
4. Confirmer l'absence de régression

---

## Escalade

Si le problème persiste après 1 heure:
- Contacter l'équipe ML/Data
- Envisager un rollback complet
- Activer le mode dégradé (réponses simplifiées)

---

## Prévention

- Mettre en place des tests de régression sur le golden dataset
- Alerter sur les changements de prompt en CI/CD
- Review obligatoire pour les changements de modèle
