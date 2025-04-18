import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
    try {
        const response = await fetch(`/api/inventory/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
            throw error(response.status, data.error || '載入庫存項目詳情失敗');
        }

        return {
            item: data.item,
            transactions: data.transactions
        };
    } catch (err) {
        if (err instanceof Error) {
            throw error(500, err.message);
        }
        throw error(500, '載入庫存項目詳情失敗，請稍後再試');
    }
}; 