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

function parseLinkHeader(header) {
  if (!header) return null
  
  const links = {}
  const parts = header.split(',')
  
  parts.forEach(part => {
    const section = part.split(';')
    if (section.length !== 2) return
    
    const url = section[0].replace(/<(.*)>/, '$1').trim()
    const name = section[1].replace(/rel="(.*)"/, '$1').trim()
    
    links[name] = url
  })
  
  return links
}

export async function getOrders(since) {
  try {
    let allOrders = []
    let url = '/orders.json'
    let params = {
      limit: 250,
      status: 'any'
    }
    
    if (since) {
      params.created_at_min = since
    }

    let requestCount = 0
    const maxRequests = 40 // 40 * 250 = 10,000 orders max

    while (url && requestCount < maxRequests) {
      const response = await shopifyAPI.get(url, requestCount === 0 ? { params } : {})
      const orders = response.data.orders
      
      if (orders && orders.length > 0) {
        allOrders = allOrders.concat(orders)
        console.log(`Fetched ${orders.length} orders, total: ${allOrders.length}`)
      }
      
      // Parse Link header for pagination
      const links = parseLinkHeader(response.headers.link)
      
      if (links && links.next) {
        // Extract just the path and query from the full URL
        const nextUrl = new URL(links.next)
        url = nextUrl.pathname + nextUrl.search
      } else {
        url = null // No more pages
      }
      
      requestCount++
      
      // Rate limiting - Shopify allows 2 requests/second
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