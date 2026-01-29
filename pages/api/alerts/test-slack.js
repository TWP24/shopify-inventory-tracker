import axios from 'axios'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      if (!process.env.SLACK_WEBHOOK_URL) {
        return res.status(400).json({ error: 'Slack webhook not configured' })
      }

      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: '✓ Test message from Shopify Inventory Tracker\n\nYour Slack integration is working correctly!'
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
