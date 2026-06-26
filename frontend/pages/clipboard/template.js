export function renderTopbarActions() {
  return (
    '<button type="button" class="btn btn-outline-secondary" id="btnToggleMonitoring">' +
      '<i class="bi bi-record-circle me-1" id="toggleMonitoringIcon"></i>' +
      '<span class="d-none d-sm-inline" id="toggleMonitoringLabel">开始记录</span>' +
    '</button>' +
    '<button type="button" class="btn btn-outline-danger" id="btnClearClipboard">' +
      '<i class="bi bi-trash me-1"></i>' +
      '<span class="d-none d-sm-inline">清空记录</span>' +
    '</button>'
  );
}

export function renderContent() {
  return (
    '<div class="content-card">' +
      '<div class="content-card-header">' +
        '<div class="d-flex align-items-center gap-2">' +
          '<i class="bi bi-clipboard text-primary"></i>' +
          '<span class="fw-semibold">剪贴板记录</span>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2">' +
          '<span class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis d-none" id="monitoringBadge">' +
            '<i class="bi bi-circle-fill me-1 monitoring-dot"></i>记录中' +
          '</span>' +
          '<span class="badge rounded-pill bg-primary-subtle text-primary-emphasis" id="clipboardCount">0</span>' +
        '</div>' +
      '</div>' +
      '<div class="table-responsive">' +
        '<table class="table table-hover align-middle mb-0" id="clipboardTable">' +
          '<thead>' +
            '<tr>' +
              '<th style="width: 20%">时间</th>' +
              '<th style="width: 68%">内容</th>' +
              '<th style="width: 12%">操作</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="clipboardBody">' +
            '<tr>' +
              '<td colspan="3" class="text-center text-muted py-5">' +
                '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>' +
                '加载中...' +
              '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="content-card-footer" id="clipboardPagination">' +
        '<div class="d-flex flex-wrap align-items-center justify-content-end w-100 gap-3">' +
          '<span class="text-muted small" id="paginationInfo">共 0 条</span>' +
          '<label class="d-flex align-items-center gap-2 mb-0 text-muted small">' +
            '每页' +
            '<select class="form-select form-select-sm page-size-select" id="pageSizeSelect">' +
              '<option value="10" selected>10</option>' +
              '<option value="20">20</option>' +
              '<option value="50">50</option>' +
            '</select>' +
            '条' +
          '</label>' +
          '<nav aria-label="剪贴板记录分页">' +
            '<ul class="pagination pagination-sm mb-0" id="paginationNav"></ul>' +
          '</nav>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

export function renderModals() {
  return (
    '<div class="modal fade" id="clipboardDetailModal" tabindex="-1" aria-labelledby="clipboardDetailModalLabel" aria-hidden="true">' +
      '<div class="modal-dialog modal-lg modal-dialog-scrollable">' +
        '<div class="modal-content">' +
          '<div class="modal-header bg-primary text-white">' +
            '<h5 class="modal-title" id="clipboardDetailModalLabel">' +
              '<i class="bi bi-clipboard me-2"></i>剪贴板内容' +
            '</h5>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="关闭"></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<p class="text-muted small mb-2" id="clipboardDetailTime"></p>' +
            '<pre class="execution-log" id="clipboardDetailContent"></pre>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-outline-primary" id="btnCopyDetail">' +
              '<i class="bi bi-clipboard me-1"></i>复制内容' +
            '</button>' +
            '<button type="button" class="btn btn-light" data-bs-dismiss="modal">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
