import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const config = {
        shopify_configured: !!process.env.SHOPIFY_ACCESS_TOKEN,
        shop_domain: process.env.SHOPIFY_SHOP_DOMAIN || '',
        api_version: process.env.SHOPIFY_API_VERSION || '2024-01',
        slack_configured: !!process.env.SLACK_WEBHOOK_URL
      }
      
      return res.status(200).json(config)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
