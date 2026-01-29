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

function getPageInfo(linkHeader) {
  if (!linkHeader) return null
  
  const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  if (!nextMatch) return null
  
  const url = nextMatch[1]
  const pageInfoMatch = url.match(/page_info=([^&]+)/)
  
  return pageInfoMatch ? pageInfoMatch[1] : null
}

export async function getOrders(since) {
  try {
    let allOrders = []
    let pageInfo = null
    
    const baseParams = {
      limit: 250,
      status: 'any'
    }
    
    if (since) {
      baseParams.created_at_min = since
    }

    let requestCount = 0
    const maxRequests = 40

    while (requestCount < maxRequests) {
      const params = { ...baseParams }
      
      if (pageInfo) {
        delete params.created_at_min
        delete params.status
        params.page_info = pageInfo
      }
      
      const response = await shopifyAPI.get('/orders.json', { params })
      const orders = response.data.orders
      
      if (!orders || orders.length === 0) {
        break
      }
      
      allOrders = allOrders.concat(orders)
      console.log(`Fetched ${orders.length} orders, total: ${allOrders.length}`)
      
      pageInfo = getPageInfo(response.headers.link)
      
      if (!pageInfo) {
        break
      }
      
      requestCount++
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`Total orders fetched: ${allOrders.length}`)
    return allOrders
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

export default shopifyAPI