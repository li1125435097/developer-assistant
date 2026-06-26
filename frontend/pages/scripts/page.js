import { escapeHtml, showToast } from '../../js/utils.js';
import {
  renderTopbarActions,
  renderContent,
  renderModals,
} from './template.js';

const API_BASE = '/api/scripts';

let addScriptModal = null;
let variablesModal = null;
let resultModal = null;
let pendingExecution = null;
let editingScriptId = null;
let allScripts = [];
let currentPage = 1;
let pageSize = 10;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const PLATFORM_LABELS = {
  'window-cmd': 'Win-CMD',
  'window-powershell': 'Win-PowerShell',
  linux: 'Linux',
  mac: 'Mac',
  all: 'All',
  window: 'Win-CMD',
};

function formatPlatformLabel(platform) {
  return PLATFORM_LABELS[platform] || platform || 'Win-CMD';
}

function getModals() {
  return {
    addScript: new bootstrap.Modal(document.getElementById('addScriptModal')),
    variables: new bootstrap.Modal(document.getElementById('variablesModal')),
    result: new bootstrap.Modal(document.getElementById('resultModal')),
  };
}

function fetchScripts() {
  return $.getJSON(API_BASE).then(function (json) {
    return json.data;
  });
}

function getTotalPages(total) {
  return Math.max(1, Math.ceil(total / pageSize));
}

function normalizeCurrentPage(total) {
  const totalPages = getTotalPages(total);
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }
}

function renderPagination(total) {
  const totalPages = getTotalPages(total);
  const $pagination = $('#scriptsPagination');
  const $nav = $('#paginationNav');

  if (!total) {
    $pagination.hide();
    $nav.empty();
    $('#paginationInfo').text('共 0 条');
    return;
  }

  $pagination.show();

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  $('#paginationInfo').text('显示 ' + start + '-' + end + '，共 ' + total + ' 条');
  $('#pageSizeSelect').val(String(pageSize));

  const items = [];

  items.push(
    '<li class="page-item' + (currentPage <= 1 ? ' disabled' : '') + '">' +
      '<button type="button" class="page-link" data-page="' + (currentPage - 1) + '" aria-label="上一页">' +
        '<i class="bi bi-chevron-left"></i>' +
      '</button>' +
    '</li>'
  );

  for (let page = 1; page <= totalPages; page += 1) {
    items.push(
      '<li class="page-item' + (page === currentPage ? ' active' : '') + '">' +
        '<button type="button" class="page-link" data-page="' + page + '">' + page + '</button>' +
      '</li>'
    );
  }

  items.push(
    '<li class="page-item' + (currentPage >= totalPages ? ' disabled' : '') + '">' +
      '<button type="button" class="page-link" data-page="' + (currentPage + 1) + '" aria-label="下一页">' +
        '<i class="bi bi-chevron-right"></i>' +
      '</button>' +
    '</li>'
  );

  $nav.html(items.join(''));
}

function renderScripts(scripts) {
  const $tbody = $('#scriptsBody');
  const total = scripts.length;
  $('#scriptCount').text(total);

  normalizeCurrentPage(total);
  renderPagination(total);

  if (!total) {
    $tbody.html(
      '<tr><td colspan="5" class="text-center py-5">' +
        '<div class="empty-state">' +
          '<i class="bi bi-inbox d-block"></i>' +
          '<p class="text-muted mb-2">暂无脚本</p>' +
          '<button type="button" class="btn btn-sm btn-outline-primary" id="btnAddScriptEmpty">' +
            '<i class="bi bi-plus-lg me-1"></i>添加第一个脚本' +
          '</button>' +
        '</div>' +
      '</td></tr>'
    );
    $('#btnAddScriptEmpty').on('click', openAddScriptModal);
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const pageScripts = scripts.slice(start, start + pageSize);

  const rows = $.map(pageScripts, function (script) {
    const actions = script.actions || [];
    const buttons = actions.length
      ? $.map(actions, function (a, idx) {
          return (
            '<button type="button" class="btn btn-sm btn-outline-primary action-btn"' +
              ' data-script-id="' + script.id + '"' +
              ' data-action-index="' + idx + '">' +
              escapeHtml(a.action) +
            '</button>'
          );
        }).join('')
      : '<span class="text-muted small">无动作</span>';

    return (
      '<tr>' +
        '<td class="fw-medium">' +
          '<i class="bi bi-file-code text-primary me-2"></i>' +
          escapeHtml(script.name) +
        '</td>' +
        '<td class="small">' +
          '<span class="badge bg-secondary-subtle text-secondary-emphasis">' +
            escapeHtml(formatPlatformLabel(script.platform)) +
          '</span>' +
        '</td>' +
        '<td class="text-muted small">' + escapeHtml(script.description || '—') + '</td>' +
        '<td class="script-ops">' +
          '<div class="d-flex gap-1">' +
            '<button type="button" class="btn btn-sm btn-outline-secondary btn-edit-script"' +
              ' data-script-id="' + script.id + '" title="编辑">' +
              '<i class="bi bi-pencil"></i>' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-secondary btn-clone-script"' +
              ' data-script-id="' + script.id + '" title="克隆">' +
              '<i class="bi bi-copy"></i>' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-script"' +
              ' data-script-id="' + script.id + '"' +
              ' data-script-name="' + escapeHtml(script.name) + '" title="删除">' +
              '<i class="bi bi-trash"></i>' +
            '</button>' +
          '</div>' +
        '</td>' +
        '<td class="action-buttons">' + buttons + '</td>' +
      '</tr>'
    );
  });

  $tbody.html(rows.join(''));
}

function loadScripts() {
  return fetchScripts()
    .then(function (scripts) {
      allScripts = scripts;
      renderScripts(allScripts);
    })
    .fail(function () {
      allScripts = [];
      currentPage = 1;
      $('#scriptsBody').html(
        '<tr><td colspan="5" class="text-center text-danger py-5">' +
          '<i class="bi bi-exclamation-circle me-2"></i>加载失败，请刷新重试' +
        '</td></tr>'
      );
      $('#scriptCount').text('—');
      $('#scriptsPagination').hide();
    });
}

function handleActionClick() {
  const $btn = $(this);
  const scriptId = Number($btn.data('script-id'));
  const actionIndex = Number($btn.data('action-index'));

  $.getJSON(API_BASE + '/' + scriptId + '/actions/' + actionIndex + '/variables')
    .done(function (json) {
      const variables = json.data || [];
      if (variables.length === 0) {
        executeScript(scriptId, actionIndex, {});
      } else {
        showVariablesModal(scriptId, actionIndex, variables);
      }
    })
    .fail(function () {
      showToast('获取变量失败', 'danger');
    });
}

function showVariablesModal(scriptId, actionIndex, variables) {
  pendingExecution = { scriptId: scriptId, actionIndex: actionIndex };

  const fields = $.map(variables, function (v) {
    return (
      '<div class="mb-3">' +
        '<label class="form-label" for="var-' + escapeHtml(v) + '">' +
          '' + escapeHtml(v) + '' +
        '</label>' +
        '<input type="text" class="form-control variable-input"' +
          ' id="var-' + escapeHtml(v) + '"' +
          ' name="' + escapeHtml(v) + '" required>' +
      '</div>'
    );
  });

  $('#variablesForm').html(fields.join(''));
  variablesModal.show();
}

function formatExecutionLog(data) {
  if (typeof data === 'string') {
    return data || '(无输出)';
  }

  const parts = [];
  if (data && data.stdout) parts.push(data.stdout);
  if (data && data.stderr) parts.push(data.stderr);
  return parts.join('\n').trim() || '(无输出)';
}

function showExecutionResult(success, log) {
  const $header = $('#resultModalHeader');
  const $label = $('#resultModalLabel');

  if (success) {
    $header.removeClass('bg-danger').addClass('bg-success');
    $label.html('<i class="bi bi-check-circle me-2"></i>执行成功');
  } else {
    $header.removeClass('bg-success').addClass('bg-danger');
    $label.html('<i class="bi bi-exclamation-triangle me-2"></i>执行失败');
  }

  $('#resultLog').text(formatExecutionLog(log));
  resultModal.show();
}

function executeScript(scriptId, actionIndex, variables) {
  const $btn = $('[data-script-id="' + scriptId + '"][data-action-index="' + actionIndex + '"]');
  const originalText = $btn.text();

  $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');

  return $.ajax({
    url: API_BASE + '/' + scriptId + '/execute',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ actionIndex: actionIndex, variables: variables }),
  })
    .done(function (json) {
      if (json.success) {
        showExecutionResult(true, json.data);
      } else {
        showExecutionResult(false, json.error || '未知错误');
      }
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showExecutionResult(false, (json && json.error) || xhr.statusText || '请求失败');
    })
    .always(function () {
      $btn.prop('disabled', false).text(originalText);
    });
}

function createActionItem(action, script) {
  action = action || '';
  script = script || '';

  const $div = $(
    '<div class="action-item">' +
      '<div class="row g-2">' +
        '<div class="col-md-12">' +
          '<label class="form-label small">动作名称</label>' +
          '<input type="text" class="form-control form-control-sm action-name"' +
            ' value="' + escapeHtml(action) + '" placeholder="如：构建">' +
        '</div>' +
        '<div class="col-md-12">' +
          '<label class="form-label small">脚本内容</label>' +
          '<textarea class="form-control form-control-sm action-script" rows="2"' +
            ' placeholder="如：npm run build">' + escapeHtml(script) + '</textarea>' +
        '</div>' +
        '<div class="col-12 text-end">' +
          '<button type="button" class="btn btn-sm btn-outline-danger btn-remove-action">' +
            '<i class="bi bi-trash"></i> 删除' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  $div.find('.btn-remove-action').on('click', function () {
    if ($('#actionsContainer .action-item').length <= 1) {
      showToast('至少保留一个动作', 'danger');
      return;
    }
    $div.remove();
  });

  return $div;
}

function resetAddForm() {
  editingScriptId = null;
  $('#addScriptModalLabel').html(
    '<i class="bi bi-plus-circle me-2 text-primary"></i>添加脚本'
  );
  $('#scriptName').val('');
  $('#scriptDesc').val('');
  $('#platformWindowCmd').prop('checked', true);
  $('#actionsContainer').empty().append(createActionItem());
}

function openAddScriptModal() {
  resetAddForm();
  addScriptModal.show();
}

function openEditScriptModal(scriptId) {
  $.getJSON(API_BASE + '/' + scriptId)
    .done(function (json) {
      const script = json.data;
      if (!script) {
        showToast('脚本不存在', 'danger');
        return;
      }

      editingScriptId = script.id;
      $('#addScriptModalLabel').html(
        '<i class="bi bi-pencil me-2 text-primary"></i>编辑脚本'
      );
      $('#scriptName').val(script.name);
      $('#scriptDesc').val(script.description || '');
      let platform = script.platform || 'window-cmd';
      if (platform === 'window') {
        platform = 'window-cmd';
      }
      $('input[name="scriptPlatform"][value="' + platform + '"]').prop('checked', true);
      $('#actionsContainer').empty();

      const actions = script.actions || [];
      if (actions.length) {
        actions.forEach(function (a) {
          $('#actionsContainer').append(createActionItem(a.action, a.script));
        });
      } else {
        $('#actionsContainer').append(createActionItem());
      }

      addScriptModal.show();
    })
    .fail(function () {
      showToast('加载脚本失败', 'danger');
    });
}

function saveScript() {
  const name = $('#scriptName').val().trim();
  const description = $('#scriptDesc').val().trim();
  const platform = $('input[name="scriptPlatform"]:checked').val() || 'window-cmd';
  const actions = [];

  $('#actionsContainer .action-item').each(function () {
    const action = $(this).find('.action-name').val().trim();
    const script = $(this).find('.action-script').val().trim();
    if (!action || !script) {
      return;
    }
    actions.push({ action: action, script: script });
  });

  if ($('#actionsContainer .action-item').length !== actions.length) {
    showToast('请填写完整的动作名称和脚本', 'danger');
    return;
  }

  if (!name) {
    showToast('请填写名称', 'danger');
    return;
  }

  const $btn = $('#btnSaveScript');
  $btn.prop('disabled', true);

  const isEdit = editingScriptId !== null;
  const payload = { name: name, description: description, platform: platform, actions: actions };

  $.ajax({
    url: isEdit ? API_BASE + '/' + editingScriptId : API_BASE,
    method: isEdit ? 'PUT' : 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload),
  })
    .done(function () {
      addScriptModal.hide();
      showToast(isEdit ? '更新成功' : '添加成功');
      loadScripts();
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showToast((json && json.error) || '保存失败', 'danger');
    })
    .always(function () {
      $btn.prop('disabled', false);
    });
}

function runWithVariables() {
  if (!pendingExecution) return;

  const variables = {};
  let valid = true;

  $('#variablesForm .variable-input').each(function () {
    const $input = $(this);
    const value = $input.val().trim();
    if (!value) {
      showToast('请填写 ' + $input.attr('name'), 'danger');
      valid = false;
      return false;
    }
    variables[$input.attr('name')] = value;
  });

  if (!valid) return;

  variablesModal.hide();
  executeScript(
    pendingExecution.scriptId,
    pendingExecution.actionIndex,
    variables
  );
  pendingExecution = null;
}

function handleEditClick() {
  const scriptId = Number($(this).data('script-id'));
  openEditScriptModal(scriptId);
}

function handleCloneClick() {
  const $btn = $(this);
  const scriptId = Number($btn.data('script-id'));

  $btn.prop('disabled', true);

  $.getJSON(API_BASE + '/' + scriptId)
    .done(function (json) {
      const script = json.data;
      if (!script) {
        showToast('脚本不存在', 'danger');
        $btn.prop('disabled', false);
        return;
      }

      const payload = {
        name: script.name + '克隆',
        description: script.description || '',
        platform: script.platform || 'window-cmd',
        actions: (script.actions || []).map(function (a) {
          return { action: a.action, script: a.script };
        }),
      };

      $.ajax({
        url: API_BASE,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
      })
        .done(function () {
          showToast('克隆成功');
          loadScripts();
        })
        .fail(function (xhr) {
          const json = xhr.responseJSON;
          showToast((json && json.error) || '克隆失败', 'danger');
        })
        .always(function () {
          $btn.prop('disabled', false);
        });
    })
    .fail(function () {
      showToast('加载脚本失败', 'danger');
      $btn.prop('disabled', false);
    });
}

function handleDeleteClick() {
  const $btn = $(this);
  const scriptId = Number($btn.data('script-id'));
  const scriptName = $btn.data('script-name') || '该脚本';

  if (!confirm('确定要删除脚本「' + scriptName + '」吗？此操作不可恢复。')) {
    return;
  }

  $btn.prop('disabled', true);

  $.ajax({
    url: API_BASE + '/' + scriptId,
    method: 'DELETE',
  })
    .done(function () {
      showToast('删除成功');
      loadScripts();
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showToast((json && json.error) || '删除失败', 'danger');
      $btn.prop('disabled', false);
    });
}

function handlePageChange() {
  const $btn = $(this);
  if ($btn.closest('.page-item').hasClass('disabled')) {
    return;
  }

  const page = Number($btn.data('page'));
  if (!page || page === currentPage) {
    return;
  }

  currentPage = page;
  renderScripts(allScripts);
}

function handlePageSizeChange() {
  const nextSize = Number($('#pageSizeSelect').val());
  if (!PAGE_SIZE_OPTIONS.includes(nextSize) || nextSize === pageSize) {
    return;
  }

  pageSize = nextSize;
  currentPage = 1;
  renderScripts(allScripts);
}

function bindEvents() {
  $('#btnAddScript').on('click.scriptsPage', openAddScriptModal);
  $('#btnAddAction').on('click.scriptsPage', function () {
    $('#actionsContainer').append(createActionItem());
  });
  $('#btnSaveScript').on('click.scriptsPage', saveScript);
  $('#btnRunWithVars').on('click.scriptsPage', runWithVariables);
  $('#scriptsBody').on('click.scriptsPage', '.action-btn', handleActionClick);
  $('#scriptsBody').on('click.scriptsPage', '.btn-edit-script', handleEditClick);
  $('#scriptsBody').on('click.scriptsPage', '.btn-clone-script', handleCloneClick);
  $('#scriptsBody').on('click.scriptsPage', '.btn-delete-script', handleDeleteClick);
  $('#paginationNav').on('click.scriptsPage', '.page-link', handlePageChange);
  $('#pageSizeSelect').on('change.scriptsPage', handlePageSizeChange);
}

function unbindEvents() {
  $('#btnAddScript').off('.scriptsPage');
  $('#btnAddAction').off('.scriptsPage');
  $('#btnSaveScript').off('.scriptsPage');
  $('#btnRunWithVars').off('.scriptsPage');
  $('#scriptsBody').off('.scriptsPage');
  $('#paginationNav').off('.scriptsPage');
  $('#pageSizeSelect').off('.scriptsPage');
}

export default {
  renderTopbarActions,
  renderContent,
  renderModals,

  init() {
    const modals = getModals();
    addScriptModal = modals.addScript;
    variablesModal = modals.variables;
    resultModal = modals.result;
    pendingExecution = null;
    editingScriptId = null;
    allScripts = [];
    currentPage = 1;
    pageSize = 10;

    bindEvents();
    loadScripts();
  },

  destroy() {
    unbindEvents();
    pendingExecution = null;
    editingScriptId = null;
    allScripts = [];
    currentPage = 1;
    pageSize = 10;

    if (addScriptModal) {
      addScriptModal.hide();
      addScriptModal = null;
    }
    if (variablesModal) {
      variablesModal.hide();
      variablesModal = null;
    }
    if (resultModal) {
      resultModal.hide();
      resultModal = null;
    }
  },
};
