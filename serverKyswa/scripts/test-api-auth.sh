#!/bin/bash

# Script de test API Kyswa Travel - Authentication
# Teste les endpoints auth, users, profile, clients

BASE_URL="http://localhost:3000/api"
echo "🧪 Tests API Kyswa Travel - PostgreSQL"
echo "======================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "📡 Test 1: Health Check..."
HEALTH=$(curl -s "$BASE_URL/test/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "status"; then
  echo -e "${GREEN}✅ Serveur actif${NC}"
else
  echo -e "${RED}❌ Serveur non accessible${NC}"
  exit 1
fi
echo ""

# Test 2: Liste des utilisateurs (devrait échouer sans auth)
echo "👤 Test 2: Liste utilisateurs (sans auth)..."
USERS=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/users" 2>/dev/null)
HTTP_CODE=$(echo "$USERS" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ Protection authentification OK${NC}"
else
  echo -e "${YELLOW}⚠️  Code HTTP: $HTTP_CODE (attendu: 401)${NC}"
fi
echo ""

# Test 3: Login avec identifiants (devra être adapté)
echo "🔐 Test 3: Tentative de login..."
echo -e "${YELLOW}Note: Nécessite des identifiants valides${NC}"
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@kyswa.sn","password":"Test123!"}' 2>/dev/null)

if echo "$LOGIN" | grep -q "token"; then
  echo -e "${GREEN}✅ Login réussi${NC}"
  TOKEN=$(echo "$LOGIN" | jq -r '.token' 2>/dev/null || echo "")
  echo "Token: ${TOKEN:0:20}..."
elif echo "$LOGIN" | grep -q "Identifiants incorrects"; then
  echo -e "${YELLOW}⚠️  Login échoué: Identifiants incorrects${NC}"
  echo -e "${YELLOW}Utilisez un email/mot de passe valide de votre base${NC}"
else
  echo -e "${RED}❌ Erreur login: $LOGIN${NC}"
fi
echo ""

# Test 4: Liste des clients (sans auth)
echo "👥 Test 4: Liste clients (sans auth)..."
CLIENTS=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/clients" 2>/dev/null)
HTTP_CODE=$(echo "$CLIENTS" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ Protection authentification OK${NC}"
else
  echo -e "${YELLOW}⚠️  Code HTTP: $HTTP_CODE${NC}"
fi
echo ""

# Test 5: Suivi public (devrait fonctionner sans auth)
echo "🎫 Test 5: Suivi public billet/réservation..."
PUBLIC=$(curl -s "$BASE_URL/public/suivre/billet?numeroBillet=TEST123" 2>/dev/null)
if echo "$PUBLIC" | grep -q "message" || echo "$PUBLIC" | grep -q "billet"; then
  echo -e "${GREEN}✅ Endpoint public accessible${NC}"
else
  echo -e "${YELLOW}⚠️  Réponse inattendue${NC}"
fi
echo ""

echo "======================================"
echo -e "${GREEN}✅ Tests terminés${NC}"
echo ""
echo "💡 Pour tester avec authentification:"
echo "  1. Créer un utilisateur ou utiliser un existant"
echo "  2. Récupérer le token JWT avec POST /api/auth/login"
echo "  3. Ajouter le header: Authorization: Bearer <token>"
echo ""
