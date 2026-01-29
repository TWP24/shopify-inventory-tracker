import { getProducts, getInventoryLevels } from '../../../lib/shopify'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const shopifyProducts = await getProducts()
    const inventoryLevels = await getInventoryLevels()

    const inventoryMap = {}
    inventoryLevels.forEach(level => {
      inventoryMap[level.inventory_item_id] = level.available
    })

    for (const product of shopifyProducts) {
      for (const variant of product.variants) {
        const currentStock = inventoryMap[variant.inventory_item_id] || 0

        const { data: existing } = await supabase
          .from('products')
          .select('*')
          .eq('sku', variant.sku)
          .single()

        if (existing) {
          await supabase
            .from('products')
            .update({
              current_stock: currentStock,
              shopify_product_id: product.id,
              shopify_variant_id: variant.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('products')
            .insert({
              sku: variant.sku,
              name: `${product.title} - ${variant.title}`,
              shopify_product_id: product.id,
              shopify_variant_id: variant.id,
              current_stock: currentStock,
              cogs: 0,
              reorder_point: 10,
              reorder_quantity: 50,
              lead_time_days: 14
            })
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `Synced ${shopifyProducts.length} products` 
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({ error: error.message })
  }
}
