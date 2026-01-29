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
    let allOrders = []
    let params = {
      limit: 250,
      status: 'any'
    }
    
    if (since) {
      params.created_at_min = since
    }

    let hasMore = true
    
    while (hasMore) {
      const response = await shopifyAPI.get('/orders.json', { params })
      const orders = response.data.orders
      
      allOrders = allOrders.concat(orders)
      
      // Check for pagination link
      const linkHeader = response.headers.link
      if (linkHeader && linkHeader.includes('rel="next"')) {
        // Extract next page info from link header
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1])
          params.page_info = nextUrl.searchParams.get('page_info')
        } else {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    return allOrders
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

export default shopifyAPI