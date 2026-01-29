import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { product_id } = req.query
    
    try {
      let query = supabase.from('forecasts').select('*')
      
      if (product_id) {
        query = query.eq('product_id', product_id)
      }
      
      const { data, error } = await query.order('forecast_date')

      if (error) throw error
      return res.status(200).json(data)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { data, error } = await supabase
        .from('forecasts')
        .upsert(req.body, { 
          onConflict: 'product_id,forecast_date' 
        })
        .select()

      if (error) throw error
      return res.status(201).json(data)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
