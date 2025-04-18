import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/db';

// UUID 格式驗證函數
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export const GET: RequestHandler = async () => {
    try {
        const result = await pool.query(`
            SELECT 
                i.id,
                i.product_id,
                i.product_name,
                i.unit,
                i.current_quantity,
                i.category,
                i.min_quantity,
                i.created_at,
                i.updated_at
            FROM inventory_items i
            ORDER BY i.product_name
        `);

        return json(result.rows);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return json({ error: 'Failed to fetch inventory data' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        const { product_id, product_name, unit, current_quantity, category, min_quantity } = data;

        // 檢查是否已存在相同產品ID的項目
        const checkResult = await pool.query(
            'SELECT id FROM inventory_items WHERE product_id = $1',
            [product_id]
        );

        if (checkResult.rows.length > 0) {
            return json({ error: '已存在相同產品ID的庫存項目' }, { status: 400 });
        }

        const result = await pool.query(
            `INSERT INTO inventory_items 
            (product_id, product_name, unit, current_quantity, category, min_quantity)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [product_id, product_name, unit, current_quantity, category, min_quantity]
        );

        return json(result.rows[0]);
    } catch (error) {
        console.error('Error creating inventory item:', error);
        return json({ error: 'Failed to create inventory item' }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        const { id, product_id, product_name, unit, current_quantity, category, min_quantity } = data;

        // 驗證 UUID 格式
        if (!id || !isValidUUID(id)) {
            return json({ error: '無效的庫存項目ID格式' }, { status: 400 });
        }

        // 檢查項目是否存在
        const checkResult = await pool.query(
            'SELECT id FROM inventory_items WHERE id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return json({ error: '找不到該庫存項目' }, { status: 404 });
        }

        const result = await pool.query(
            `UPDATE inventory_items 
            SET product_id = $1, 
                product_name = $2, 
                unit = $3, 
                current_quantity = $4, 
                category = $5, 
                min_quantity = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *`,
            [product_id, product_name, unit, current_quantity, category, min_quantity, id]
        );

        return json(result.rows[0]);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return json({ error: 'Failed to update inventory item' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        const { id } = data;

        // 驗證 UUID 格式
        if (!id || !isValidUUID(id)) {
            return json({ error: '無效的庫存項目ID格式' }, { status: 400 });
        }

        // 檢查項目是否存在
        const checkResult = await pool.query(
            'SELECT id FROM inventory_items WHERE id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return json({ error: '找不到該庫存項目' }, { status: 404 });
        }

        await pool.query('DELETE FROM inventory_items WHERE id = $1', [id]);

        return json({ success: true });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        return json({ error: 'Failed to delete inventory item' }, { status: 500 });
    }
}; 