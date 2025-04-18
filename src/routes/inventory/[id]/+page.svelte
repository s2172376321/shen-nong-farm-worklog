<!-- src/routes/inventory/[id]/+page.svelte -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui';

    export let data;

    let { item, transactions } = data;
    let error = data.error;

    function handleGoBack() {
        goto('/inventory');
    }

    function formatDateTime(dateStr: string) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getTransactionTypeText(type: string) {
        const typeMap: { [key: string]: string } = {
            'in': '進貨',
            'out': '出庫',
            'adjust': '直接調整'
        };
        return typeMap[type] || type;
    }
</script>

<div class="min-h-screen bg-gray-900 text-white p-4">
    <div class="max-w-6xl mx-auto">
        <div class="mb-4">
            <Button on:click={handleGoBack} variant="secondary" class="flex items-center text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                返回庫存列表
            </Button>
        </div>

        {#if error}
            <div class="bg-red-600/20 border border-red-600 text-white p-4 rounded-lg">
                <p class="text-center">{error}</p>
                <div class="flex justify-center mt-4">
                    <Button on:click={handleGoBack} variant="secondary">
                        返回庫存列表
                    </Button>
                </div>
            </div>
        {:else if item}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- 左側：基本資訊 -->
                <div class="md:col-span-1">
                    <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
                        <h1 class="text-xl font-bold mb-4">{item.product_name}</h1>
                        
                        <div class="space-y-4">
                            <div>
                                <p class="text-gray-400 text-sm">產品編號</p>
                                <p class="font-medium">{item.product_id}</p>
                            </div>
                            
                            <div>
                                <p class="text-gray-400 text-sm">類別</p>
                                <p>{item.category || '其他'}</p>
                            </div>
                            
                            <div>
                                <p class="text-gray-400 text-sm">單位</p>
                                <p>{item.unit}</p>
                            </div>
                            
                            <div>
                                <p class="text-gray-400 text-sm">現有庫存</p>
                                <p class="text-xl font-bold text-green-400">
                                    {item.current_quantity} {item.unit}
                                </p>
                            </div>
                            
                            <div>
                                <p class="text-gray-400 text-sm">最低庫存</p>
                                <p class={parseFloat(item.current_quantity) <= parseFloat(item.min_quantity) && parseFloat(item.min_quantity) > 0 ? 'text-red-400' : ''}>
                                    {item.min_quantity} {item.unit}
                                </p>
                            </div>
                            
                            {#if item.description}
                                <div>
                                    <p class="text-gray-400 text-sm">描述</p>
                                    <p class="whitespace-pre-wrap">{item.description}</p>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- 右側：交易記錄 -->
                <div class="md:col-span-2">
                    <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
                        <h2 class="text-lg font-bold mb-4">交易記錄</h2>
                        
                        {#if !transactions || transactions.length === 0}
                            <p class="text-gray-400 text-center py-4">暫無交易記錄</p>
                        {:else}
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">時間</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">類型</th>
                                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">數量</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">用途</th>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">備註</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-700">
                                        {#each transactions as transaction}
                                            <tr>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                                    {formatDateTime(transaction.created_at)}
                                                </td>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                                    <span class={
                                                        transaction.transaction_type === 'in' ? 'text-green-400' :
                                                        transaction.transaction_type === 'out' ? 'text-red-400' :
                                                        'text-yellow-400'
                                                    }>
                                                        {getTransactionTypeText(transaction.transaction_type)}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm text-right">
                                                    {transaction.quantity} {item.unit}
                                                </td>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                                    {transaction.purpose || '-'}
                                                </td>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                                    {transaction.notes || '-'}
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <div class="bg-yellow-600/20 border border-yellow-600 text-white p-4 rounded-lg">
                <p class="text-center">找不到該庫存項目</p>
                <div class="flex justify-center mt-4">
                    <Button on:click={handleGoBack} variant="secondary">
                        返回庫存列表
                    </Button>
                </div>
            </div>
        {/if}
    </div>
</div> 