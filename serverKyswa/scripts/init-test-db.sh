#!/bin/bash

# Script d'initialisation de la base de données de test
# Copie le schéma depuis kyswa_local vers kyswa_test

echo "🔄 Initialisation de la base de test kyswa_test..."

# Supprimer et recréer la base de test
echo "📦 Suppression de l'ancienne base..."
dropdb -U bahdieng kyswa_test 2>/dev/null || echo "Base n'existait pas"

echo "📦 Création de la nouvelle base..."
createdb -U bahdieng kyswa_test

# Copier le schéma (sans les données)
echo "📋 Copie du schéma depuis kyswa_local..."
pg_dump -U bahdieng -s -x -O kyswa_local | psql -U bahdieng kyswa_test

# Vérifier le nombre de tables
TABLE_COUNT=$(psql -U bahdieng -d kyswa_test -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

echo "✅ Base de test initialisée avec $TABLE_COUNT tables"
echo "🎯 Prête pour les tests : postgresql://bahdieng@localhost:5432/kyswa_test"
