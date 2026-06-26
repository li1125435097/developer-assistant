import { escapeHtml, showToast } from '../../js/utils.js';
import {
  renderTopbarActions,
  renderContent,
  renderModals,
} from './template.js';

const API_BASE = '/api/clipboard';

let detailModal = null;
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let totalPages = 1;
let monitoringEnabled = false;
let refreshTimer = null;
let detailContent = '';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getModal() {
  return new bootstrap.Modal(document.getElementById('clipboardDetailModal'));
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

function truncateContent(content, maxLen) {
  if (!content) return '—';
  const text = String(content);
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function fetchConfig() {
  return $.getJSON(API_BASE + '/config').then(function (json) {
    return json.data;
  });
}

function fetchRecords(page, size) {
  return $.getJSON(API_BASE, {
    page: page,
    pageSize: size,
  }).then(function (json) {
    return json.data;
  });
}

function updateMonitoringUI(enabled) {
  monitoringEnabled = enabled;

  const $btn = $('#btnToggleMonitoring');
  const $icon = $('#toggleMonitoringIcon');
  const $label = $('#toggleMonitoringLabel');
  const $badge = $('#monitoringBadge');

  if (enabled) {
    $btn
      .removeClass('btn-outline-secondary')
      .addClass('btn-success');
    $icon.removeClass('bi-record-circle').addClass('bi-stop-circle');
    $label.text('停止记录');
    $badge.removeClass('d-none');
  } else {
    $btn
      .removeClass('btn-success')
      .addClass('btn-outline-secondary');
    $icon.removeClass('bi-stop-circle').addClass('bi-record-circle');
    $label.text('开始记录');
    $badge.addClass('d-none');
  }
}

function renderPagination() {
  const $pagination = $('#clipboardPagination');
  const $nav = $('#paginationNav');

  if (!totalRecords) {
    $pagination.hide();
    $nav.empty();
    $('#paginationInfo').text('共 0 条');
    return;
  }

  $pagination.show();

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);
  $('#paginationInfo').text('显示 ' + start + '-' + end + '，共 ' + totalRecords + ' 条');
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

function renderRecords(records) {
  const $tbody = $('#clipboardBody');
  $('#clipboardCount').text(totalRecords);
  renderPagination();

  if (!records.length) {
    $tbody.html(
      '<tr><td colspan="3" class="text-center py-5">' +
        '<div class="empty-state">' +
          '<i class="bi bi-inbox d-block"></i>' +
          '<p class="text-muted mb-0">暂无剪贴板记录</p>' +
        '</div>' +
      '</td></tr>'
    );
    return;
  }

  const rows = $.map(records, function (record) {
    return (
      '<tr>' +
        '<td class="text-muted small text-nowrap">' + escapeHtml(formatDateTime(record.created_at)) + '</td>' +
        '<td class="text-truncate" style="max-width: 0;">' +
          '<code class="small">' + escapeHtml(truncateContent(record.content, 120)) + '</code>' +
        '</td>' +
        '<td>' +
          '<div class="d-flex gap-1">' +
            '<button type="button" class="btn btn-sm btn-outline-primary btn-view-clipboard"' +
              ' data-clipboard-id="' + record.id + '" title="查看详情">' +
              '<i class="bi bi-eye"></i>' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-secondary btn-copy-clipboard"' +
              ' data-clipboard-id="' + record.id + '" title="复制">' +
              '<i class="bi bi-clipboard"></i>' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-clipboard"' +
              ' data-clipboard-id="' + record.id + '" title="删除">' +
              '<i class="bi bi-trash"></i>' +
            '</button>' +
          '</div>' +
        '</td>' +
      '</tr>'
    );
  });

  $tbody.html(rows.join(''));
}

function loadRecords() {
  return fetchRecords(currentPage, pageSize)
    .then(function (result) {
      totalRecords = result.total;
      totalPages = result.totalPages;
      currentPage = result.page;
      pageSize = result.pageSize;
      renderRecords(result.records);
    })
    .fail(function () {
      totalRecords = 0;
      totalPages = 1;
      $('#clipboardBody').html(
        '<tr><td colspan="3" class="text-center text-danger py-5">' +
          '<i class="bi bi-exclamation-circle me-2"></i>加载失败，请刷新重试' +
        '</td></tr>'
      );
      $('#clipboardCount').text('—');
      $('#clipboardPagination').hide();
    });
}

function loadConfig() {
  return fetchConfig()
    .then(function (config) {
      updateMonitoringUI(Boolean(config.clipboard_monitoring));
    })
    .fail(function () {
      updateMonitoringUI(false);
    });
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const $temp = $('<textarea>').val(text).appendTo('body').select();
  document.execCommand('copy');
  $temp.remove();
  return $.Deferred().resolve().promise();
}

function fetchRecordById(id) {
  return $.getJSON(API_BASE + '/' + id).then(function (json) {
    return json.data;
  });
}

function showDetail(record) {
  detailContent = record.content || '';
  $('#clipboardDetailTime').text(formatDateTime(record.created_at));
  $('#clipboardDetailContent').text(detailContent);
  detailModal.show();
}

function handleViewClick() {
  const recordId = Number($(this).data('clipboard-id'));

  fetchRecordById(recordId)
    .done(function (record) {
      if (record) {
        showDetail(record);
      } else {
        showToast('记录不存在', 'danger');
      }
    })
    .fail(function () {
      showToast('加载详情失败', 'danger');
    });
}

function handleCopyClick() {
  const $btn = $(this);
  const recordId = Number($btn.data('clipboard-id'));

  $btn.prop('disabled', true);

  fetchRecordById(recordId)
    .done(function (record) {
      if (!record) {
        showToast('记录不存在', 'danger');
        return;
      }

      copyText(record.content || '')
        .then(function () {
          showToast('已复制到剪贴板');
        })
        .fail(function () {
          showToast('复制失败', 'danger');
        });
    })
    .fail(function () {
      showToast('加载记录失败', 'danger');
    })
    .always(function () {
      $btn.prop('disabled', false);
    });
}

function handleDeleteClick() {
  const $btn = $(this);
  const recordId = Number($btn.data('clipboard-id'));

  if (!confirm('确定要删除这条剪贴板记录吗？')) {
    return;
  }

  $btn.prop('disabled', true);

  $.ajax({
    url: API_BASE + '/' + recordId,
    method: 'DELETE',
  })
    .done(function () {
      showToast('删除成功');
      if (totalRecords > 1 && (currentPage - 1) * pageSize >= totalRecords - 1) {
        currentPage = Math.max(1, currentPage - 1);
      }
      loadRecords();
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showToast((json && json.error) || '删除失败', 'danger');
      $btn.prop('disabled', false);
    });
}

function handleClearClick() {
  if (!totalRecords) {
    showToast('暂无记录可清空', 'danger');
    return;
  }

  if (!confirm('确定要清空所有剪贴板记录吗？此操作不可恢复。')) {
    return;
  }

  const $btn = $('#btnClearClipboard');
  $btn.prop('disabled', true);

  $.ajax({
    url: API_BASE,
    method: 'DELETE',
  })
    .done(function () {
      showToast('已清空剪贴板记录');
      currentPage = 1;
      loadRecords();
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showToast((json && json.error) || '清空失败', 'danger');
    })
    .always(function () {
      $btn.prop('disabled', false);
    });
}

function handleToggleMonitoring() {
  const nextEnabled = !monitoringEnabled;
  const $btn = $('#btnToggleMonitoring');
  $btn.prop('disabled', true);

  $.ajax({
    url: API_BASE + '/config',
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify({ clipboard_monitoring: nextEnabled }),
  })
    .done(function (json) {
      const enabled = Boolean(json.data && json.data.clipboard_monitoring);
      updateMonitoringUI(enabled);
      showToast(enabled ? '已开始记录剪贴板' : '已停止记录剪贴板');
      startAutoRefresh();
    })
    .fail(function (xhr) {
      const json = xhr.responseJSON;
      showToast((json && json.error) || '更新配置失败', 'danger');
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
  loadRecords();
}

function handlePageSizeChange() {
  const nextSize = Number($('#pageSizeSelect').val());
  if (!PAGE_SIZE_OPTIONS.includes(nextSize) || nextSize === pageSize) {
    return;
  }

  pageSize = nextSize;
  currentPage = 1;
  loadRecords();
}

function handleCopyDetail() {
  copyText(detailContent)
    .then(function () {
      showToast('已复制到剪贴板');
    })
    .fail(function () {
      showToast('复制失败', 'danger');
    });
}

function startAutoRefresh() {
  stopAutoRefresh();

  if (!monitoringEnabled) {
    return;
  }

  refreshTimer = setInterval(function () {
    loadRecords();
  }, 3000);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function bindEvents() {
  $('#btnToggleMonitoring').on('click.clipboardPage', handleToggleMonitoring);
  $('#btnClearClipboard').on('click.clipboardPage', handleClearClick);
  $('#clipboardBody').on('click.clipboardPage', '.btn-view-clipboard', handleViewClick);
  $('#clipboardBody').on('click.clipboardPage', '.btn-copy-clipboard', handleCopyClick);
  $('#clipboardBody').on('click.clipboardPage', '.btn-delete-clipboard', handleDeleteClick);
  $('#paginationNav').on('click.clipboardPage', '.page-link', handlePageChange);
  $('#pageSizeSelect').on('change.clipboardPage', handlePageSizeChange);
  $('#btnCopyDetail').on('click.clipboardPage', handleCopyDetail);
}

function unbindEvents() {
  $('#btnToggleMonitoring').off('.clipboardPage');
  $('#btnClearClipboard').off('.clipboardPage');
  $('#clipboardBody').off('.clipboardPage');
  $('#paginationNav').off('.clipboardPage');
  $('#pageSizeSelect').off('.clipboardPage');
  $('#btnCopyDetail').off('.clipboardPage');
}

export default {
  renderTopbarActions,
  renderContent,
  renderModals,

  init() {
    detailModal = getModal();
    currentPage = 1;
    pageSize = 10;
    totalRecords = 0;
    totalPages = 1;
    detailContent = '';

    bindEvents();

    $.when(loadConfig(), loadRecords()).then(function () {
      startAutoRefresh();
    });
  },

  destroy() {
    unbindEvents();
    stopAutoRefresh();
    currentPage = 1;
    pageSize = 10;
    totalRecords = 0;
    totalPages = 1;
    detailContent = '';

    if (detailModal) {
      detailModal.hide();
      detailModal = null;
    }
  },
};
