import postgres from 'postgres'

const sql = postgres('postgresql://postgres.mkxbqmuoetgbeskkgror:Jalansehat1.@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres')

async function main() {
  try {
    const constraints = await sql`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'documents';
    `
    console.log('Foreign key constraints on documents table:', constraints)
  } catch (err) {
    console.error('Error fetching constraints:', err)
  } finally {
    await sql.end()
  }
}

main()
