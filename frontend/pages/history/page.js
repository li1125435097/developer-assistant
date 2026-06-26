import { escapeHtml, showToast } from '../../js/utils.js';
import {
  renderTopbarActions,
  renderContent,
  renderModals,
} from './template.js';

const API_BASE = '/api/history';

let detailModal = null;
let allHistory = [];
let currentPage = 1;
let pageSize = 10;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getModal() {
  return new bootstrap.Modal(document.getElementById('historyDetailModal'));
}

function fetchHistory() {
  return $.getJSON(API_BASE).then(function (json) {
    return json.data;
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatExecutionLog(output) {
  if (typeof output === 'string') {
    return output || '(无输出)';
  }

  const parts = [];
  if (output && output.stdout) parts.push(output.stdout);
  if (output && output.stderr) parts.push(output.stderr);
  return parts.join('\n').trim() || '(无输出)';
}

function formatVariables(variables) {
  const keys = Object.keys(variables || {});
  if (!keys.length) return '—';
  return keys.map(function (key) {
    return key + '=' + variables[key];
  }).join(', ');
}

function renderStatusBadge(success) {
  if (success) {
    return '<span class="badge bg-success-subtle text-success-emphasis">' +
      '<i class="bi bi-check-circle me-1"></i>成功' +
    '</span>';
  }
  return '<span class="badge bg-danger-subtle text-danger-emphasis">' +
    '<i class="bi bi-x-circle me-1"></i>失败' +
  '</span>';
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
  const $pagination = $('#historyPagination');
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

function renderHistory(records) {
  const $tbody = $('#historyBody');
  const total = records.length;
  $('#historyCount').text(total);

  normalizeCurrentPage(total);
  renderPagination(total);

  if (!total) {
    $tbody.html(
      '<tr><td colspan="6" class="text-center py-5">' +
        '<div class="empty-state">' +
          '<i class="bi bi-inbox d-block"></i>' +
          '<p class="text-muted mb-0">暂无执行记录</p>' +
        '</div>' +
      '</td></tr>'
    );
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const pageRecords = records.slice(start, start + pageSize);

  const rows = $.map(pageRecords, function (record) {
    return (
      '<tr>' +
        '<td class="text-muted small text-nowrap">' + escapeHtml(formatDateTime(record.created_at)) + '</td>' +
        '<td class="fw-medium">' +
          '<i class="bi bi-file-code text-primary me-2"></i>' +
          escapeHtml(record.script_name || '—') +
        '</td>' +
        '<td>' + escapeHtml(record.action || '—') + '</td>' +
        '<td>' + renderStatusBadge(record.success) + '</td>' +
        '<td class="text-muted small text-truncate" style="max-width: 0;">' +
          '<code class="small">' + escapeHtml(record.command || '—') + '</code>' +
        '</td>' +
        '<td>' +
          '<div class="d-flex gap-1">' +
            '<button type="button" class="btn btn-sm btn-outline-primary btn-view-history"' +
              ' data-history-id="' + record.id + '" title="查看详情">' +
              '<i class="bi bi-eye"></i>' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-history"' +
              ' data-history-id="' + record.id + '" title="删除">' +
              '<i class="bi bi-trash"></i>' +
            '</button>' +
          '</div>' +
        '</td>' +
      '</tr>'
    );
  });

  $tbody.html(rows.join(''));
}

function loadHistory() {
  return fetchHistory()
    .then(function (records) {
      allHistory = records;
      renderHistory(allHistory);
    })
    .fail(function () {
      allHistory = [];
      currentPage = 1;
      $('#historyBody').html(
        '<tr><td colspan="6" class="text-center text-danger py-5">' +
          '<i class="bi bi-exclamation-circle me-2"></i>加载失败，请刷新重试' +
        '</td></tr>'
      );
      $('#historyCount').text('—');
      $('#historyPagination').hide();
    });
}

function showDetail(record) {
  const $header = $('#historyDetailModalHeader');
  const $label = $('#historyDetailModalLabel');

  if (record.success) {
    $header.removeClass('bg-danger').addClass('bg-success');
    $label.html('<i class="bi bi-check-circle me-2"></i>执行成功');
  } else {
    $header.removeClass('bg-success').addClass('bg-danger');
    $label.html('<i class="bi bi-exclamation-triangle me-2"></i>执行失败');
  }

  $('#historyDetailMeta').html(
    '<dt class="col-sm-3 text-muted">时间</dt>' +
    '<dd class="col-sm-9">' + escapeHtml(formatDateTime(record.created_at)) + '</dd>' +
    '<dt class="col-sm-3 text-muted">脚本</dt>' +
    '<dd class="col-sm-9">' + escapeHtml(record.script_name || '—') + '</dd>' +
    '<dt class="col-sm-3 text-muted">动作</dt>' +
    '<dd class="col-sm-9">' + escapeHtml(record.action || '—') + '</dd>' +
    '<dt class="col-sm-3 text-muted">命令</dt>' +
    '<dd class="col-sm-9"><code>' + escapeHtml(record.command || '—') + '</code></dd>' +
    '<dt class="col-sm-3 text-muted">变量</dt>' +
    '<dd class="col-sm-9">' + escapeHtml(formatVariables(record.variables)) + '</dd>'
  );

  $('#historyDetailLog').text(formatExecutionLog(record.output));
  detailModal.show();
}

function handleViewClick() {
  const historyId = Number($(this).data('history-id'));
  const record = allHistory.find(function (item) {
    return item.id === historyId;
  });

  if (record) {
    showDetail(record);
    return;
  }

  $.getJSON(API_BASE + '/' + historyId)
    .done(function (json) {
      if (json.data) {
        showDetail(json.data);
      } else {
        showToast('记录不存在', 'danger');
      }
    })
    .fail(function () {
      showToast('加载详情失败', 'danger');
    });
}

function handleDeleteClick() {
  const $btn = $(this);
  const historyId = Number($btn.data('history-id'));

  if (!confirm('确定要删除这条执行记录吗？')) {
    return;
  }

  $btn.prop('disabled', true);

  $.ajax({
    url: API_BASE + '/' + historyId,
    method: 'DELETE',
  })
    .done(function () {
      showToast('删除成功');
      loadHistory();
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showToast((json && json.error) || '删除失败', 'danger');
      $btn.prop('disabled', false);
    });
}

function handleClearClick() {
  if (!allHistory.length) {
    showToast('暂无记录可清空', 'danger');
    return;
  }

  if (!confirm('确定要清空所有执行历史吗？此操作不可恢复。')) {
    return;
  }

  const $btn = $('#btnClearHistory');
  $btn.prop('disabled', true);

  $.ajax({
    url: API_BASE,
    method: 'DELETE',
  })
    .done(function () {
      showToast('已清空执行历史');
      loadHistory();
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showToast((json && json.error) || '清空失败', 'danger');
    })
    .always(function () {
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
  renderHistory(allHistory);
}

function handlePageSizeChange() {
  const nextSize = Number($('#pageSizeSelect').val());
  if (!PAGE_SIZE_OPTIONS.includes(nextSize) || nextSize === pageSize) {
    return;
  }

  pageSize = nextSize;
  currentPage = 1;
  renderHistory(allHistory);
}

function bindEvents() {
  $('#btnClearHistory').on('click.historyPage', handleClearClick);
  $('#historyBody').on('click.historyPage', '.btn-view-history', handleViewClick);
  $('#historyBody').on('click.historyPage', '.btn-delete-history', handleDeleteClick);
  $('#paginationNav').on('click.historyPage', '.page-link', handlePageChange);
  $('#pageSizeSelect').on('change.historyPage', handlePageSizeChange);
}

function unbindEvents() {
  $('#btnClearHistory').off('.historyPage');
  $('#historyBody').off('.historyPage');
  $('#paginationNav').off('.historyPage');
  $('#pageSizeSelect').off('.historyPage');
}

export default {
  renderTopbarActions,
  renderContent,
  renderModals,

  init() {
    detailModal = getModal();
    allHistory = [];
    currentPage = 1;
    pageSize = 10;

    bindEvents();
    loadHistory();
  },

  destroy() {
    unbindEvents();
    allHistory = [];
    currentPage = 1;
    pageSize = 10;

    if (detailModal) {
      detailModal.hide();
      detailModal = null;
    }
  },
};
