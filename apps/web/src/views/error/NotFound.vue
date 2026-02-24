<script setup lang="ts"></script>

<template>
  <div class="h-full flex items-center justify-center">
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold text-slate-700">
        404
      </h1>
      <p class="text-slate-500">
        页面不存在
      </p>
      <el-button type="primary" @click="$router.push('/')">
        返回首页
      </el-button>
    </div>
  </div>
</template>
