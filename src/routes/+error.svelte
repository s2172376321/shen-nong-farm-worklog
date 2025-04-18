<script lang="ts">
    import { page } from '$app/stores';
    import { Button } from '$lib/components/ui';
</script>

<div class="min-h-screen bg-gray-900 text-white p-4">
    <div class="max-w-6xl mx-auto">
        <div class="bg-red-600/20 border border-red-600 text-white p-4 rounded-lg">
            <h1 class="text-2xl font-bold mb-4">錯誤 {$page.status}</h1>
            <p class="text-center mb-4">{$page.error?.message}</p>
            <div class="flex justify-center">
                <Button href="/" variant="secondary">
                    返回首頁
                </Button>
            </div>
        </div>
    </div>
</div> 