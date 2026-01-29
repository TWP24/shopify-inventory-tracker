import axios from 'axios'
import { supabase } from '../../../lib/supabase'

async function sendSlackMessage(message) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.log('No Slack webhook configured')
    return
  }

  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: message
    })
  } catch (error) {
    console.error('Slack error:', error)
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { productId, alertType, message } = req.body

    try {
      await sendSlackMessage(message)

      await supabase.from('alerts').insert({
        product_id: productId,
        alert_type: alertType,
        message: message
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data: products } = await supabase.from('products').select('*')

    for (const product of products) {
      const daysUntilStockout = product.current_stock / (product.daily_avg_sales || 1)
      const reorderDay = daysUntilStockout - product.lead_time_days

      if (product.current_stock <= product.reorder_point) {
        const message = `⚠️ *Low Stock Alert*
Product: ${product.name} (${product.sku})
Current Stock: ${product.current_stock} units
Reorder Point: ${product.reorder_point} units`

        await sendSlackMessage(message)
        
        await supabase.from('alerts').insert({
          product_id: product.id,
          alert_type: 'low_stock',
          message: message
        })
      }

      if (reorderDay <= 0 && reorderDay > -1) {
        const expectedCost = product.reorder_quantity * product.cogs
        const message = `📦 *Reorder Alert*
Product: ${product.name} (${product.sku})
Recommended Quantity: ${product.reorder_quantity} units
Expected Cost: $${expectedCost.toFixed(2)}
Lead Time: ${product.lead_time_days} days`

        await sendSlackMessage(message)
        
        await supabase.from('alerts').insert({
          product_id: product.id,
          alert_type: 'reorder',
          message: message
        })
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Alert check error:', error)
    return res.status(500).json({ error: error.message })
  }
}
