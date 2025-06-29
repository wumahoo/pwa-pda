<template>
  <div class="not-found">
    <div class="not-found-content">
      <van-empty
        image="error"
        description="页面未找到"
      />
      <div class="actions">
        <van-button
          type="primary"
          size="large"
          @click="goHome"
        >
          返回首页
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Empty as VanEmpty, Button as VanButton } from 'vant'

const router = useRouter()

const goHome = () => {
  router.push('/tasks')
}
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #f8f9fa;
}

.not-found-content {
  text-align: center;
  width: 100%;
  max-width: 400px;
}

.actions {
  margin-top: 24px;
}
</style>