# Airtable RSS Feeds Setup

## Airtable Tabel Configuratie

Maak een nieuwe tabel in je Airtable base met de naam: **`rss_feeds`**

### Velden (lowercase!)

| Veldnaam | Type | Beschrijving | Opties |
|----------|------|--------------|--------|
| `id` | Single line text | Unieke feed identifier | Primary field |
| `name` | Single line text | Feed naam (bijv. "Security.NL") | - |
| `url` | URL | Feed URL | - |
| `category` | Single select | Categorie van de feed | cybersecurity, bouwcertificaten, ai-companion, ai-learning, marketingtoolz |
| `enabled` | Checkbox | Of de feed actief is | - |
| `maxarticles` | Number | Max artikelen per fetch | Default: 25 |

## Hoe het werkt

### Prioriteit volgorde
1. 🥇 **Airtable** - Primaire bron voor feeds (centraal beheer)
2. 🥈 **Local file** - Backup als Airtable niet bereikbaar is

### Synchronisatie flows

#### Feed toevoegen
```
User klikt "Add RSS Feed" op settings pagina
  ↓
Validatie van feed data
  ↓
POST /api/feeds (PUT method)
  ↓
1. Toevoegen aan Airtable (addFeedToAirtable)
2. Toevoegen aan local backup (saveFeedConfigs)
  ↓
Feed verschijnt in lijst
```

#### Feed aanpassen (toggle enabled)
```
User toggle feed aan/uit
  ↓
POST /api/feeds
  ↓
1. Sync naar Airtable (syncFeedsToAirtable)
2. Save naar local backup (saveFeedConfigs)
  ↓
Status geupdate
```

#### Feed verwijderen
```
User klikt verwijder button
  ↓
DELETE /api/feeds?feedId=xxx
  ↓
1. Verwijderen uit Airtable (deleteFeedFromAirtable)
2. Verwijderen uit local backup (saveFeedConfigs)
  ↓
Feed verdwijnt uit lijst
```

#### Feeds laden
```
User opent settings pagina
  ↓
GET /api/feeds
  ↓
1. Probeer laden uit Airtable (loadFeedsFromAirtable)
   ↓ (als succesvol)
   Return Airtable feeds

   ↓ (als mislukt of leeg)
2. Fallback naar local storage (getFeedConfigs)
   ↓
   Return local feeds
```

## Voordelen

✅ **Centraal beheer** - Feeds beheren zonder code deployment
✅ **Team toegang** - Meerdere mensen kunnen feeds toevoegen
✅ **Backup** - Local file als Airtable niet bereikbaar is
✅ **History** - Airtable houdt wijzigingsgeschiedenis bij
✅ **Sync** - Automatisch sync tussen Airtable en applicatie
✅ **No git commits** - Feeds toevoegen zonder code changes

## Eerste keer setup

1. **Maak de tabel in Airtable**
   - Ga naar je News Pal Airtable base
   - Maak nieuwe tabel: `rss_feeds` (lowercase!)
   - Voeg de 6 velden toe zoals hierboven beschreven

2. **Migreer bestaande feeds**
   - Run lokaal: `npm run dev`
   - Open: http://localhost:3000/api/feeds/migrate (TODO: create this endpoint)
   - Of handmatig: kopieer feeds uit `feeds-persistent.json` naar Airtable

3. **Test de sync**
   - Open settings pagina
   - Voeg een test feed toe
   - Check of deze in Airtable verschijnt
   - Toggle de feed aan/uit
   - Verwijder de test feed

4. **Deploy naar Netlify**
   - Commit en push de code
   - Netlify deploy gebeurt automatisch
   - Check of Airtable credentials correct zijn in Netlify environment

## Environment Variables

Zorg dat deze variabelen zijn ingesteld:
- `AIRTABLE_TOKEN_NEWSPAL` - Airtable API token
- `AIRTABLE_BASE_NEWSPAL` - Airtable base ID

## Troubleshooting

### Feeds worden niet geladen uit Airtable
- Check console logs voor Airtable errors
- Verifieer dat environment variables correct zijn
- Check of tabel naam exact `rss_feeds` is (lowercase!)
- Verifieer dat alle veldnamen lowercase zijn

### Feeds verdwijnen nog steeds
- Dit zou nu niet meer moeten gebeuren
- Als het toch gebeurt, check:
  - Console logs voor sync errors
  - Of Airtable rate limits bereikt zijn
  - Of local file `feeds-persistent.json` correct is

### Feeds sync niet naar Airtable
- Check Airtable API token permissions
- Verifieer dat veldnamen exact matchen
- Check console logs voor specifieke errors