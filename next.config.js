/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AIRTABLE_TOKEN_NEWSPAL: process.env.AIRTABLE_TOKEN_NEWSPAL,
    AIRTABLE_BASE_NEWSPAL: process.env.AIRTABLE_BASE_NEWSPAL,
    OPENAI_TOKEN_NEWSPAL: process.env.OPENAI_TOKEN_NEWSPAL,
    PORTAL_PASSWORD_NEWSPAL: process.env.PORTAL_PASSWORD_NEWSPAL,
  },
}

module.exports = nextConfig