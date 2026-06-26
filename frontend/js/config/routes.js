/**
 * 菜单与路由配置
 * 新增页面：在 pages/ 下创建文件夹，在此添加一条路由即可
 */
export const routes = [
  {
    id: 'scripts',
    path: '/',
    title: '脚本管理',
    subtitle: '管理和运行开发脚本',
    icon: 'bi-code-square',
    menu: {
      label: '脚本管理',
      enabled: true,
    },
    module: '/pages/scripts/page.js',
  },
  {
    id: 'history',
    path: '/history',
    title: '执行历史',
    subtitle: '查看脚本执行记录',
    icon: 'bi-clock-history',
    menu: {
      label: '执行历史',
      enabled: true,
    },
    module: '/pages/history/page.js',
  },
  {
    id: 'clipboard',
    path: '/clipboard',
    title: '剪切板记录',
    subtitle: '查看与管理剪贴板历史',
    icon: 'bi-clipboard',
    menu: {
      label: '剪切板记录',
      enabled: true,
    },
    module: '/pages/clipboard/page.js',
  },
  {
    id: 'settings',
    path: '/settings',
    title: '系统设置',
    subtitle: '应用配置与偏好',
    icon: 'bi-gear',
    menu: {
      label: '系统设置',
      enabled: true,
    },
    module: '/pages/settings/page.js',
  },
];

export function findRouteByPath(path) {
  const normalized = normalizePath(path);
  return routes.find((r) => r.path === normalized) || routes[0];
}

export function findRouteById(id) {
  return routes.find((r) => r.id === id) || routes[0];
}

export function normalizePath(path) {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}
