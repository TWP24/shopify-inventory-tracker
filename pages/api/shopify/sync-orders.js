import axios from 'axios'
import { supabase } from '../../../lib/supabase'

async function shopifyGraphQL(query, variables = {}) {
  const response = await axios.post(
    `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`,
    { query, variables },
    {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (response.data.errors) {
    throw new Error(JSON.stringify(response.data.errors))
  }
  
  return response.data.data
}

export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    // Get all line items sold in last 90 days using GraphQL
    const query = `
      query getOrders($query: String!, $first: Int!, $after: String) {
        orders(first: $first, query: $query, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              createdAt
              lineItems(first: 250) {
                edges {
                  node {
                    sku
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    `
    
    const searchQuery = `created_at:>='${ninetyDaysAgo.toISOString().split('T')[0]}'`
    
    let hasNextPage = true
    let cursor = null
    let allLineItems = {}
    let orderCount = 0
    
    while (hasNextPage) {
      const variables = {
        query: searchQuery,
        first: 250,
        after: cursor
      }
      
      const data = await shopifyGraphQL(query, variables)
      
      // Process line items
      data.orders.edges.forEach(orderEdge => {
        orderCount++
        orderEdge.node.lineItems.edges.forEach(lineItemEdge => {
          const sku = lineItemEdge.node.sku
          const qty = lineItemEdge.node.quantity
          
          if (sku) {
            if (!allLineItems[sku]) {
              allLineItems[sku] = 0
            }
            allLineItems[sku] += qty
          }
        })
      })
      
      hasNextPage = data.orders.pageInfo.hasNextPage
      cursor = data.orders.pageInfo.endCursor
      
      console.log(`Processed ${orderCount} orders, SKUs tracked: ${Object.keys(allLineItems).length}`)
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Update daily averages in database
    const { data: products } = await supabase.from('products').select('*')
    
    for (const product of products) {
      const totalSold = allLineItems[product.sku] || 0
      const avgDailySales = totalSold / 90
      
      await supabase
        .from('products')
        .update({ daily_avg_sales: avgDailySales })
        .eq('id', product.id)
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `Processed ${orderCount} orders, updated ${Object.keys(allLineItems).length} SKUs` 
    })
  } catch (error) {
    console.error('GraphQL sync error:', error)
    return res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'No additional details'
    })
  }
}