<template>
  <div class="app-shell">
    <TitleBar v-if="isElectron" title="开发者脚本助手" />
    <el-container class="layout-container">
    <el-aside :width="asideWidth" class="layout-aside">
      <div class="layout-logo" :class="{ 'is-collapse': isCollapse }">
        <el-icon :size="22" color="var(--el-color-primary)"><Monitor /></el-icon>
        <span v-show="!isCollapse">脚本助手</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        class="layout-menu"
      >
        <el-menu-item
          v-for="item in menuRoutes"
          :key="item.name"
          :index="item.path"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>

      <div class="layout-footer" :class="{ 'is-collapse': isCollapse }">
        <template v-if="!isCollapse">v1.0.0</template>
        <el-icon v-else><InfoFilled /></el-icon>
      </div>
    </el-aside>

    <el-container>
      <el-header class="layout-header" height="60px">
        <el-button :icon="isCollapse ? Expand : Fold" circle @click="toggleCollapse" />
        <div class="layout-header-title">
          <h2>{{ pageTitle }}</h2>
          <p>{{ pageSubtitle }}</p>
        </div>
        <div class="layout-header-actions">
          <el-select
            v-model="themeMode"
            size="small"
            style="width: 120px"
            @change="applyTheme"
          >
            <el-option
              v-for="opt in THEME_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
      </el-header>

      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Fold, Expand } from '@element-plus/icons-vue';
import TitleBar from '@/components/TitleBar.vue';
import { menuRoutes, THEME_OPTIONS } from '@/router';
import { useTheme } from '@/composables/useTheme';

const route = useRoute();
const isCollapse = ref(false);
const isElectron = Boolean(window.electronAPI?.isElectron);
const { themeMode, applyTheme } = useTheme();

const asideWidth = computed(() => (isCollapse.value ? '64px' : '220px'));
const activeMenu = computed(() => route.path);
const pageTitle = computed(() => route.meta.title || '');
const pageSubtitle = computed(() => route.meta.subtitle || '');

function toggleCollapse(): void {
  isCollapse.value = !isCollapse.value;
  localStorage.setItem('sidebar-collapsed', isCollapse.value ? '1' : '0');
}

onMounted(() => {
  isCollapse.value = localStorage.getItem('sidebar-collapsed') === '1';
});
</script>

<style scoped lang="scss">
// layout styles in global index.scss
</style>
