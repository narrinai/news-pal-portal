/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AIRTABLE_TOKEN_NEWSPAL: process.env.AIRTABLE_TOKEN_NEWSPAL,
    AIRTABLE_BASE_NEWSPAL: process.env.AIRTABLE_BASE_NEWSPAL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PORTAL_PASSWORD: process.env.PORTAL_PASSWORD,
  },
}

module.exports = nextConfig