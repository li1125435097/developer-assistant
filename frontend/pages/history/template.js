export function renderTopbarActions() {
  return (
    '<button type="button" class="btn btn-outline-danger" id="btnClearHistory">' +
      '<i class="bi bi-trash me-1"></i>' +
      '<span class="d-none d-sm-inline">清空历史</span>' +
    '</button>'
  );
}

export function renderContent() {
  return (
    '<div class="content-card">' +
      '<div class="content-card-header">' +
        '<div class="d-flex align-items-center gap-2">' +
          '<i class="bi bi-clock-history text-primary"></i>' +
          '<span class="fw-semibold">执行记录</span>' +
        '</div>' +
        '<span class="badge rounded-pill bg-primary-subtle text-primary-emphasis" id="historyCount">0</span>' +
      '</div>' +
      '<div class="table-responsive">' +
        '<table class="table table-hover align-middle mb-0" id="historyTable">' +
          '<thead>' +
            '<tr>' +
              '<th style="width: 18%">时间</th>' +
              '<th style="width: 18%">脚本</th>' +
              '<th style="width: 12%">动作</th>' +
              '<th style="width: 10%">状态</th>' +
              '<th style="width: 30%">命令</th>' +
              '<th style="width: 12%">操作</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="historyBody">' +
            '<tr>' +
              '<td colspan="6" class="text-center text-muted py-5">' +
                '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>' +
                '加载中...' +
              '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="content-card-footer" id="historyPagination">' +
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
          '<nav aria-label="执行历史分页">' +
            '<ul class="pagination pagination-sm mb-0" id="paginationNav"></ul>' +
          '</nav>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

export function renderModals() {
  return (
    '<div class="modal fade" id="historyDetailModal" tabindex="-1" aria-labelledby="historyDetailModalLabel" aria-hidden="true">' +
      '<div class="modal-dialog modal-lg modal-dialog-scrollable">' +
        '<div class="modal-content">' +
          '<div class="modal-header text-white" id="historyDetailModalHeader">' +
            '<h5 class="modal-title" id="historyDetailModalLabel"></h5>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="关闭"></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<dl class="row mb-3 small" id="historyDetailMeta"></dl>' +
            '<label class="form-label small text-muted mb-1">执行输出</label>' +
            '<pre class="execution-log" id="historyDetailLog"></pre>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-light" data-bs-dismiss="modal">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
