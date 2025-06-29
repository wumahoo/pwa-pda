# PMS-PDA 仓库分拣系统

一个基于 Vue 3 + TypeScript 开发的 Progressive Web App (PWA) 仓库分拣系统，专为解决 PDA 设备在网络信号差的环境下（如货架角落）的离线作业问题而设计。

## 🚀 功能特性

### 核心功能
- **离线作业支持** - 在网络信号差的环境下正常工作
- **条码扫描** - 支持摄像头扫描和手动输入
- **任务管理** - 分拣任务的创建、分配和跟踪
- **数据同步** - 网络恢复时自动同步本地数据
- **PWA 支持** - 可安装到设备桌面，提供原生应用体验

### 技术特性
- **响应式设计** - 适配各种屏幕尺寸
- **离线缓存** - Service Worker 实现资源和数据缓存
- **实时同步** - 后台自动同步数据到服务端
- **安全可靠** - 本地数据加密存储
- **性能优化** - 懒加载、代码分割等优化策略

## 📱 业务流程

1. **登录系统** - 分拣员使用账号密码登录
2. **查看任务** - 显示分配的分拣任务列表
3. **选择任务** - 分拣员选择要执行的任务
4. **扫描商品** - 使用摄像头扫描或手动输入商品条码
5. **验证匹配** - 系统验证条码与 SKU 是否匹配
6. **标记完成** - 完成商品分拣并标记任务状态
7. **本地保存** - 结果保存到本地存储
8. **自动同步** - 网络可用时自动同步到服务端

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **路由管理**: Vue Router 4
- **UI 组件库**: Vant 4
- **构建工具**: Vite
- **PWA 支持**: Workbox
- **条码扫描**: ZXing-js
- **本地存储**: IndexedDB
- **网络请求**: Axios

## 📦 安装和运行

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 安装依赖
```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 开发环境运行
```bash
# 启动开发服务器
npm run dev

# 或
yarn dev
```

访问 http://localhost:5173 查看应用

### 生产环境构建
```bash
# 构建生产版本
npm run build

# 或
yarn build
```

### 预览生产版本
```bash
# 预览构建结果
npm run preview

# 或
yarn preview
```

## 📁 项目结构

```
pms-pda/
├── public/                 # 静态资源
│   ├── manifest.json      # PWA 配置文件
│   ├── sw.js             # Service Worker
│   ├── logo.svg          # 应用图标
│   └── favicon.svg       # 网站图标
├── src/
│   ├── components/        # 公共组件
│   ├── views/            # 页面组件
│   │   ├── Login.vue     # 登录页面
│   │   ├── TaskList.vue  # 任务列表
│   │   ├── TaskDetail.vue # 任务详情
│   │   ├── Scanner.vue   # 扫描页面
│   │   ├── Profile.vue   # 个人中心
│   │   ├── Settings.vue  # 应用设置
│   │   └── Sync.vue      # 数据同步
│   ├── router/           # 路由配置
│   ├── stores/           # 状态管理
│   ├── services/         # 业务服务
│   │   ├── api.ts        # API 接口
│   │   ├── storage.ts    # 本地存储
│   │   ├── sync.ts       # 数据同步
│   │   └── scanner.ts    # 条码扫描
│   ├── utils/            # 工具函数
│   ├── types/            # TypeScript 类型定义
│   ├── App.vue           # 根组件
│   └── main.ts           # 应用入口
├── index.html            # HTML 模板
├── vite.config.ts        # Vite 配置
├── package.json          # 项目配置
└── README.md            # 项目说明
```

## 🔧 配置说明

### 环境变量
创建 `.env.local` 文件配置环境变量：

```env
# API 基础地址
VITE_API_BASE_URL=https://your-api-domain.com/api

# 应用标题
VITE_APP_TITLE=PMS-PDA 仓库分拣系统

# 是否启用调试模式
VITE_DEBUG=false
```

### PWA 配置
PWA 相关配置在 `public/manifest.json` 中：

- `name`: 应用完整名称
- `short_name`: 应用简短名称
- `theme_color`: 主题颜色
- `background_color`: 背景颜色
- `display`: 显示模式（standalone）
- `start_url`: 启动 URL

## 📱 使用指南

### 安装 PWA
1. 在支持的浏览器中访问应用
2. 点击浏览器提示的"安装"按钮
3. 或在应用内点击安装提示
4. 应用将添加到设备桌面

### 离线使用
1. 首次访问时会缓存必要资源
2. 离线状态下仍可正常使用
3. 数据会保存在本地
4. 网络恢复时自动同步

### 扫描条码
1. 进入扫描页面
2. 允许摄像头权限
3. 将条码对准扫描框
4. 或点击手动输入按钮

## 🔒 安全特性

- **数据加密**: 本地敏感数据加密存储
- **权限控制**: 基于角色的访问控制
- **安全头**: 配置了完整的安全响应头
- **HTTPS**: 生产环境强制使用 HTTPS
- **CSP**: 内容安全策略防止 XSS 攻击

## 🚀 性能优化

- **代码分割**: 按路由分割代码
- **懒加载**: 组件和资源懒加载
- **缓存策略**: 多层缓存机制
- **压缩优化**: Gzip/Brotli 压缩
- **图片优化**: WebP 格式支持

## 🐛 故障排除

### 常见问题

**Q: 扫描功能不工作？**
A: 检查浏览器是否支持摄像头 API，确保已授权摄像头权限。

**Q: 离线状态下数据丢失？**
A: 检查浏览器存储空间，清理不必要的缓存数据。

**Q: PWA 无法安装？**
A: 确保使用 HTTPS 协议，检查 manifest.json 配置是否正确。

**Q: 数据同步失败？**
A: 检查网络连接，确认 API 服务器状态正常。

## 📄 许可证

本项目采用 MIT 许可证。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 🔄 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🚀 PWA 支持
- 📱 条码扫描功能
- 💾 离线数据存储
- 🔄 自动数据同步
- 🎨 响应式 UI 设计
