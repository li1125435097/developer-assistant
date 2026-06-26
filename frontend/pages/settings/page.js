import { escapeHtml, showToast } from '../../js/utils.js';
import {
  renderTopbarActions,
  renderContent,
  renderModals,
} from './template.js';

const API_BASE = '/api/settings/config';

const CONFIG_LABELS = {
  clipboard_monitoring: '剪贴板监控',
  clipboard_max_length: '剪贴板内容最大长度',
};

let currentConfig = {};
let saving = false;

function fetchConfig() {
  return $.getJSON(API_BASE).then(function (json) {
    return json.data;
  });
}

function saveConfig(updates) {
  return $.ajax({
    url: API_BASE,
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(updates),
  }).then(function (json) {
    return json.data;
  });
}

function getConfigLabel(key) {
  return CONFIG_LABELS[key] || key;
}

function renderBooleanField(key, value) {
  const id = 'config-' + key;
  const checked = value ? ' checked' : '';

  return (
    '<div class="settings-field d-flex align-items-start gap-2">' +
      '<label class="settings-field-label mb-0" for="' + escapeHtml(id) + '">' +
        escapeHtml(getConfigLabel(key)) + '：' +
      '</label>' +
      '<div class="form-check form-switch mb-0">' +
        '<input class="form-check-input config-switch" type="checkbox" role="switch"' +
          ' id="' + escapeHtml(id) + '"' +
          ' data-key="' + escapeHtml(key) + '"' +
          checked + '>' +
      '</div>' +
    '</div>'
  );
}

function renderInputField(key, value) {
  const id = 'config-' + key;
  const inputType = typeof value === 'number' ? 'number' : 'text';
  const minAttr = inputType === 'number' ? ' min="1" step="1"' : '';

  return (
    '<div class="settings-field d-flex align-items-start gap-2">' +
      '<label class="settings-field-label mb-0" for="' + escapeHtml(id) + '">' +
        escapeHtml(getConfigLabel(key)) + '：' +
      '</label>' +
      '<input type="' + inputType + '" class="form-control config-input"' +
        ' id="' + escapeHtml(id) + '"' +
        ' data-key="' + escapeHtml(key) + '"' +
        ' value="' + escapeHtml(String(value)) + '"' +
        minAttr + '>' +
    '</div>'
  );
}

function renderConfigForm(config) {
  const keys = Object.keys(config);

  if (!keys.length) {
    return '<p class="text-muted mb-0">暂无配置项</p>';
  }

  return keys.map(function (key) {
    const value = config[key];
    if (typeof value === 'boolean') {
      return renderBooleanField(key, value);
    }
    return renderInputField(key, value);
  }).join('');
}

function renderForm(config) {
  currentConfig = { ...config };
  $('#settingsForm').html(
    '<div class="settings-form">' + renderConfigForm(config) + '</div>'
  );
}

function handleSaveError(xhr, revert) {
  if (revert) {
    revert();
  }

  let message = '保存失败';
  if (xhr.responseJSON && xhr.responseJSON.error) {
    message = xhr.responseJSON.error;
  }
  showToast(message, 'error');
}

function updateConfig(key, value, revert) {
  if (saving) {
    return;
  }

  saving = true;

  saveConfig({ [key]: value })
    .then(function (data) {
      currentConfig = { ...data };
      showToast('已保存');
    })
    .fail(function (xhr) {
      handleSaveError(xhr, revert);
    })
    .always(function () {
      saving = false;
    });
}

function bindEvents() {
  $('#settingsForm')
    .on('change', '.config-switch', function () {
      const key = $(this).data('key');
      const checked = $(this).prop('checked');
      const previous = currentConfig[key];

      updateConfig(key, checked, function () {
        $('#config-' + key).prop('checked', previous);
      });
    })
    .on('change', '.config-input', function () {
      const key = $(this).data('key');
      const raw = $(this).val();
      const previous = currentConfig[key];
      let value = raw;

      if (typeof previous === 'number') {
        value = Number(raw);
        if (!Number.isInteger(value) || value < 1) {
          showToast('请输入大于 0 的整数', 'error');
          $(this).val(String(previous));
          return;
        }
      }

      if (value === previous) {
        return;
      }

      const $input = $(this);
      updateConfig(key, value, function () {
        $input.val(String(previous));
      });
    });
}

function loadSettings() {
  fetchConfig()
    .then(function (config) {
      renderForm(config);
    })
    .fail(function () {
      $('#settingsForm').html(
        '<p class="text-danger mb-0">加载配置失败，请刷新页面重试。</p>'
      );
      showToast('加载配置失败', 'error');
    });
}

export { renderTopbarActions, renderContent, renderModals };

export default {
  renderTopbarActions,
  renderContent,
  renderModals,

  init() {
    bindEvents();
    loadSettings();
  },

  destroy() {
    $('#settingsForm').off('change');
  },
};
