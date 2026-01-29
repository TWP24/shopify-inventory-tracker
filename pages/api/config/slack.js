export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { webhook_url } = req.body
    
    return res.status(200).json({
      success: true,
      message: 'Please add to Vercel environment variables:',
      variables: {
        SLACK_WEBHOOK_URL: webhook_url
      }
    })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
