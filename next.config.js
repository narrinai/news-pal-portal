/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  env: {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PORTAL_PASSWORD: process.env.PORTAL_PASSWORD,
  },
}

module.exports = nextConfig