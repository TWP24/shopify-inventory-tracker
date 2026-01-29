import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { product_id } = req.query
    
    try {
      let query = supabase
        .from('sales_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(90)
      
      if (product_id) {
        query = query.eq('product_id', product_id)
      }
      
      const { data, error } = await query

      if (error) throw error
      return res.status(200).json(data)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
