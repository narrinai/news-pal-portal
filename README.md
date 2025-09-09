# News Pal Portal

Een nieuws management portal voor het dagelijks ophalen, cureren en herschrijven van cybersecurity nieuws met AI voor WordPress publicatie.

## Functionaliteiten

- 🔐 **Wachtwoordbeveiliging** - Simpele toegangscontrole
- 📰 **RSS Feed Parsing** - Automatisch ophalen van nieuws uit meerdere bronnen
- 🎯 **Smart Filtering** - Automatische selectie van cybersecurity-gerelateerde artikelen
- 🤖 **AI Herschrijving** - Transformatie van artikelen naar Nederlandse, WordPress-ready content
- 📊 **Airtable Integratie** - Volledige content database met status tracking
- 🚀 **Netlify Deployment** - Serverless hosting met scheduled functions

## Nieuwsbronnen

### Internationaal Cybersecurity
- The Hacker News
- Krebs on Security
- Security Week
- Threatpost
- Dark Reading

### Nederlands Cybersecurity
- Security.NL
- Computable

## Setup

### 1. Airtable Database Opzetten

Maak een nieuwe Airtable base aan met een tabel genaamd "Articles" met de volgende velden:

```
- title (Single line text)
- description (Long text)
- url (URL)
- source (Single line text)
- publishedAt (Date & time)
- status (Single select: pending, selected, rewritten, published)
- category (Single select: cybersecurity-nl, cybersecurity-international, other)
- originalContent (Long text)
- rewrittenContent (Long text)
- wordpressHtml (Long text)
- createdAt (Created time)
```

### 2. Environment Variables

Kopieer `.env.example` naar `.env.local` en vul de volgende variabelen in:

```env
AIRTABLE_API_KEY=your_personal_access_token_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
OPENAI_API_KEY=your_openai_api_key_here
PORTAL_PASSWORD=jouw_eigen_wachtwoord
```

**Belangrijk:** Gebruik een Airtable Personal Access Token (begint met `pat...`) met de volgende scopes:
- `data.records:read`
- `data.records:write` 
- `data.recordComments:write`
- `schema.bases:read`

### 3. Lokale Development

```bash
npm install
npm run dev
```

Ga naar `http://localhost:3000` om de portal te gebruiken.

### 4. Netlify Deployment

1. Push je code naar een GitHub repository
2. Verbind je repository met Netlify
3. Stel de environment variables in via Netlify dashboard
4. Deploy!

## Gebruik

1. **Login** - Gebruik je ingestelde wachtwoord
2. **Artikelen Ophalen** - Klik op "Nieuwe Artikelen Ophalen" om de laatste cybersecurity nieuws op te halen
3. **Selecteren** - Bekijk pending artikelen en selecteer relevante content
4. **Herschrijven** - Gebruik de AI om artikelen te herschrijven naar Nederlandse WordPress content
5. **Kopiëren** - Kopieer de WordPress HTML naar je clipboard voor publicatie

## Workflows

### Dagelijkse Nieuwscyclus
1. Automatische RSS feed parsing (8:00 UTC via scheduled function)
2. Handmatige selectie van relevante artikelen
3. AI-herschrijving naar Nederlandse content
4. Copy-paste naar WordPress voor publicatie

### Status Flow
`pending` → `selected` → `rewritten` → `published`

## Technische Stack

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Netlify Functions
- **Database**: Airtable
- **AI**: OpenAI GPT-4
- **Deployment**: Netlify
- **RSS Parsing**: rss-parser

## Kosten Schatting (per maand)

- Netlify Functions: Gratis (100k requests)
- Airtable: Gratis (1,200 records)
- OpenAI API: ~€15-50 (afhankelijk van gebruik)

**Totaal: €15-50/maand**