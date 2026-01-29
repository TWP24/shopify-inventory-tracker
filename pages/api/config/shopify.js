export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { shop_domain, access_token, api_version } = req.body
    
    return res.status(200).json({
      success: true,
      message: 'Please add these to Vercel environment variables:',
      variables: {
        SHOPIFY_SHOP_DOMAIN: shop_domain,
        SHOPIFY_ACCESS_TOKEN: access_token,
        SHOPIFY_API_VERSION: api_version
      }
    })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
