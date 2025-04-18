import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/db';

// UUID 格式驗證函數
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export const GET: RequestHandler = async ({ params }) => {
    const { id } = params;

    // 驗證 UUID 格式
    if (!id || !isValidUUID(id)) {
        return json({ error: '無效的庫存項目ID格式' }, { status: 400 });
    }

    try {
        // 使用單一查詢獲取所有需要的數據
        const query = `
            SELECT 
                i.*,
                COALESCE(json_agg(t ORDER BY t.created_at DESC) FILTER (WHERE t.id IS NOT NULL), '[]') as transactions
            FROM inventory_items i
            LEFT JOIN inventory_transactions t ON t.inventory_item_id = i.id
            WHERE i.id = $1
            GROUP BY i.id
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return json({ error: '找不到該庫存項目' }, { status: 404 });
        }
        
        const item = result.rows[0];
        
        // 格式化數據
        item.current_quantity = parseFloat(item.current_quantity).toFixed(2);
        item.min_quantity = parseFloat(item.min_quantity).toFixed(2);
        
        // 格式化交易記錄中的數量
        if (item.transactions) {
            item.transactions = item.transactions.map((t: any) => ({
                ...t,
                quantity: parseFloat(t.quantity).toFixed(2)
            }));
        }

        return json({
            item: {
                id: item.id,
                product_id: item.product_id,
                product_name: item.product_name,
                category: item.category,
                unit: item.unit,
                current_quantity: item.current_quantity,
                min_quantity: item.min_quantity,
                description: item.description,
                created_at: item.created_at,
                updated_at: item.updated_at
            },
            transactions: item.transactions
        });
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        return json({ error: '獲取庫存項目詳情失敗，請稍後再試' }, { status: 500 });
    }
}; 