// Simple persistent feed storage using Netlify environment simulation
let persistentFeedStore = []

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return stored feeds
    return res.status(200).json({
      success: true,
      feeds: persistentFeedStore,
      count: persistentFeedStore.length
    })
  }
  
  if (req.method === 'POST') {
    // Store feeds
    const { feeds } = req.body
    persistentFeedStore = feeds || []
    
    console.log(`Stored ${persistentFeedStore.length} feeds in persistent storage`)
    
    return res.status(200).json({
      success: true,
      message: `${persistentFeedStore.length} feeds stored`,
      feeds: persistentFeedStore
    })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}