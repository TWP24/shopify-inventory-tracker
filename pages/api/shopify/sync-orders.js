import { getOrders } from '../../../lib/shopify'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const orders = await getOrders(thirtyDaysAgo.toISOString())

    for (const order of orders) {
      for (const item of order.line_items) {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('sku', item.sku)
          .single()

        if (product) {
          await supabase
            .from('sales_history')
            .insert({
              product_id: product.id,
              date: new Date(order.created_at).toISOString().split('T')[0],
              quantity: item.quantity
            })
        }
      }
    }

    const { data: products } = await supabase.from('products').select('*')

    for (const product of products) {
      const { data: sales } = await supabase
        .from('sales_history')
        .select('quantity')
        .eq('product_id', product.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

      if (sales && sales.length > 0) {
        const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.quantity), 0)
        const avgDailySales = totalSales / 30

        await supabase
          .from('products')
          .update({ daily_avg_sales: avgDailySales })
          .eq('id', product.id)
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `Processed ${orders.length} orders` 
    })
  } catch (error) {
    console.error('Order sync error:', error)
    return res.status(500).json({ error: error.message })
  }
}
