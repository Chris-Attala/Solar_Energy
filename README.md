# ☀️ EMA Solar Dashboard v2.1

Dashboard analytique pour installation solaire APsystems/EMA — Mandelieu-la-Napoule.

## Déploiement Vercel (recommandé)

1. Poussez ce repo sur GitHub
2. Importez sur vercel.com → Deploy
3. Pour activer la **sync cross-device** : voir section Supabase ci-dessous

## Activer la persistance cloud (sync tous appareils)

### Étape 1 — Créer le bucket Supabase (3 min, gratuit)
1. Créez un compte sur **[supabase.com](https://supabase.com)**
2. **New Project** → donnez un nom → attendez 1 min
3. Dans le menu gauche : **Storage** → **New bucket**
   - Name : `ema-data`
   - Cochez **Public bucket**
   - Save
4. **Settings** → **API** → copiez :
   - `Project URL`  → c'est `VITE_SUPABASE_URL`
   - `anon public`  → c'est `VITE_SUPABASE_ANON_KEY`

### Étape 2 — Ajouter les variables sur Vercel
1. Votre projet Vercel → **Settings** → **Environment Variables**
2. Ajoutez :
   - `VITE_SUPABASE_URL` = `https://xxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbG...`
3. **Redéployez** (Deployments → ⋯ → Redeploy)

Après ça : uploadez votre CSV depuis n'importe quel appareil → toutes vos autres sessions l'auront automatiquement au prochain chargement.

## Développement local

```bash
cp .env.example .env.local
# Remplissez les valeurs Supabase dans .env.local
npm install
npm run dev
```

## Fonctionnalités
- Upload .xls / .xlsx / .csv (APsystems EMA)
- 8 KPI cards avec Performance Ratio Open-Meteo
- Graphique production réelle + attendue + **ensoleillement MJ/m²**
- Flux énergétiques, camembert autoconsommation, prévision 14 jours
- Projections 12 mois (basé sur Open-Meteo N-1 + votre taux d'autoconsommation réel)
- Comparaison saisonnière détaillée
- Export Excel (4 onglets) + PDF
- Prix €/kWh ajustable en live
- Dark/light mode, responsive mobile
- **Persistance cloud cross-device** (avec Supabase)
