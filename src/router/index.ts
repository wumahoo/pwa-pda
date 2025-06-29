import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/index'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Login.vue'),
      meta: {
        requiresAuth: false,
        title: '登录'
      }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: {
        requiresAuth: false,
        title: '登录'
      }
    },
    {
      path: '/tasks',
      name: 'TaskList',
      component: () => import('@/views/TaskList.vue'),
      meta: {
        requiresAuth: true,
        title: '任务列表'
      }
    },
    {
      path: '/task/:id',
      name: 'TaskDetail',
      component: () => import('@/views/TaskDetail.vue'),
      meta: {
        requiresAuth: true,
        title: '任务详情'
      }
    },
    {
      path: '/scan/:taskId',
      name: 'Scanner',
      component: () => import('@/views/Scanner.vue'),
      meta: {
        requiresAuth: true,
        title: '扫描条码'
      }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/Profile.vue'),
      meta: {
        requiresAuth: true,
        title: '个人中心'
      }
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue'),
      meta: {
        requiresAuth: true,
        title: '设置'
      }
    },
    {
      path: '/sync',
      name: 'Sync',
      component: () => import('@/views/Sync.vue'),
      meta: {
        requiresAuth: true,
        title: '数据同步'
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound.vue'),
      meta: {
        requiresAuth: false,
        title: '页面未找到'
      }
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const appStore = useAppStore()
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - PMS分拣系统`
  }

  // 如果用户已登录，但尝试访问登录页，则重定向到任务列表
  if (to.name === 'Login' && appStore.isLoggedIn) {
    next({ name: 'TaskList' })
    return
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!appStore.isLoggedIn) {
      // 未登录，重定向到登录页
      next({
        name: 'Login',
        query: { redirect: to.fullPath }
      })
    } else {
      next()
    }
  } else {
    next()
  }
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
})

export default router