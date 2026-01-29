import axios from 'axios'

const shopifyAPI = axios.create({
  baseURL: `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}`,
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
})

export async function getProducts() {
  try {
    const response = await shopifyAPI.get('/products.json')
    return response.data.products
  } catch (error) {
    console.error('Error fetching products:', error)
    throw error
  }
}

export async function getInventoryLevels() {
  try {
    const response = await shopifyAPI.get('/inventory_levels.json')
    return response.data.inventory_levels
  } catch (error) {
    console.error('Error fetching inventory:', error)
    throw error
  }
}

export async function getOrders(since) {
  try {
    const params = since ? { created_at_min: since } : {}
    const response = await shopifyAPI.get('/orders.json', { params })
    return response.data.orders
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

export default shopifyAPI
