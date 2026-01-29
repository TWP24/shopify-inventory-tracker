import { getProducts } from '../../../lib/shopify'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const shopifyProducts = await getProducts()

    for (const product of shopifyProducts) {
      for (const variant of product.variants) {
        const { data: existing } = await supabase
          .from('products')
          .select('*')
          .eq('sku', variant.sku)
          .single()

        const productData = {
          sku: variant.sku || `${product.id}-${variant.id}`,
          name: `${product.title} - ${variant.title}`,
          shopify_product_id: product.id,
          shopify_variant_id: variant.id,
          current_stock: variant.inventory_quantity || 0,
          cogs: 0,
          reorder_point: 10,
          reorder_quantity: 50,
          lead_time_days: 14,
          updated_at: new Date().toISOString()
        }

        if (existing) {
          await supabase
            .from('products')
            .update(productData)
            .eq('id', existing.id)
        } else {
          await supabase
            .from('products')
            .insert(productData)
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `Synced ${shopifyProducts.length} products`
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'No additional details'
    })
  }
}