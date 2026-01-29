import { getProducts } from '../../../lib/shopify'

export default async function handler(req, res) {
  try {
    const products = await getProducts()
    
    return res.status(200).json({
      success: true,
      shop_name: process.env.SHOPIFY_SHOP_DOMAIN,
      product_count: products.length,
      message: 'Connection successful!'
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
