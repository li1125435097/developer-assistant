import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { Document, Clock, DocumentCopy, Setting } from '@element-plus/icons-vue';
import type { Component } from 'vue';
import MainLayout from '@/layouts/MainLayout.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'scripts',
        component: () => import('@/views/ScriptsView.vue'),
        meta: { title: '脚本管理', subtitle: '管理和运行开发脚本' },
      },
      {
        path: 'history',
        name: 'history',
        component: () => import('@/views/HistoryView.vue'),
        meta: { title: '执行历史', subtitle: '查看脚本执行记录' },
      },
      {
        path: 'clipboard',
        name: 'clipboard',
        component: () => import('@/views/ClipboardView.vue'),
        meta: { title: '剪切板记录', subtitle: '查看与管理剪贴板历史' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: '系统设置', subtitle: '应用配置与偏好' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

export interface MenuRoute {
  name: string;
  path: string;
  label: string;
  icon: Component;
}

export const menuRoutes: MenuRoute[] = [
  { name: 'scripts', path: '/', label: '脚本管理', icon: Document },
  { name: 'history', path: '/history', label: '执行历史', icon: Clock },
  { name: 'clipboard', path: '/clipboard', label: '剪切板记录', icon: DocumentCopy },
  { name: 'settings', path: '/settings', label: '系统设置', icon: Setting },
];

export const THEME_OPTIONS = [
  { label: '浅色', value: 'light' as const },
  { label: '深色', value: 'dark' as const },
  { label: '跟随系统', value: 'auto' as const },
];
