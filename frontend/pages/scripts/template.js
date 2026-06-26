export function renderTopbarActions() {
  return (
    '<button type="button" class="btn btn-primary" id="btnAddScript">' +
      '<i class="bi bi-plus-lg me-1"></i>' +
      '<span class="d-none d-sm-inline">添加脚本</span>' +
    '</button>'
  );
}

export function renderContent() {
  return (
    '<div class="content-card">' +
      '<div class="content-card-header">' +
        '<div class="d-flex align-items-center gap-2">' +
          '<i class="bi bi-collection text-primary"></i>' +
          '<span class="fw-semibold">脚本列表</span>' +
        '</div>' +
        '<span class="badge rounded-pill bg-primary-subtle text-primary-emphasis" id="scriptCount">0</span>' +
      '</div>' +
      '<div class="table-responsive">' +
        '<table class="table table-hover align-middle mb-0" id="scriptsTable">' +
          '<thead>' +
            '<tr>' +
              '<th style="width: 16%">名称</th>' +
              '<th style="width: 12%">适用终端</th>' +
              '<th style="width: 24%">描述</th>' +
              '<th style="width: 12%">操作</th>' +
              '<th style="width: 36%">动作</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="scriptsBody">' +
            '<tr>' +
              '<td colspan="5" class="text-center text-muted py-5">' +
                '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>' +
                '加载中...' +
              '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="content-card-footer" id="scriptsPagination">' +
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
          '<nav aria-label="脚本列表分页">' +
            '<ul class="pagination pagination-sm mb-0" id="paginationNav"></ul>' +
          '</nav>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

export function renderModals() {
  return (
    '<div class="modal fade" id="addScriptModal" tabindex="-1" aria-labelledby="addScriptModalLabel" aria-hidden="true">' +
      '<div class="modal-dialog modal-lg modal-dialog-scrollable">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title" id="addScriptModalLabel">' +
              '<i class="bi bi-plus-circle me-2 text-primary"></i>添加脚本' +
            '</h5>' +
            '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<form id="addScriptForm">' +
              '<div class="mb-3">' +
                '<label for="scriptName" class="form-label">名称 <span class="text-danger">*</span></label>' +
                '<input type="text" class="form-control" id="scriptName" required placeholder="脚本名称">' +
              '</div>' +
              '<div class="mb-3">' +
                '<label for="scriptDesc" class="form-label">描述</label>' +
                '<textarea class="form-control" id="scriptDesc" rows="2" placeholder="脚本描述"></textarea>' +
              '</div>' +
              '<div class="mb-3">' +
                '<label class="form-label">适用终端</label>' +
                '<div>' +
                  '<div class="form-check form-check-inline">' +
                    '<input class="form-check-input" type="radio" name="scriptPlatform" id="platformWindowCmd" value="window-cmd" checked>' +
                    '<label class="form-check-label" for="platformWindowCmd">Win-CMD</label>' +
                  '</div>' +
                  '<div class="form-check form-check-inline">' +
                    '<input class="form-check-input" type="radio" name="scriptPlatform" id="platformWindowPowershell" value="window-powershell">' +
                    '<label class="form-check-label" for="platformWindowPowershell">Win-PowerShell</label>' +
                  '</div>' +
                  '<div class="form-check form-check-inline">' +
                    '<input class="form-check-input" type="radio" name="scriptPlatform" id="platformLinux" value="linux">' +
                    '<label class="form-check-label" for="platformLinux">Linux</label>' +
                  '</div>' +
                  '<div class="form-check form-check-inline">' +
                    '<input class="form-check-input" type="radio" name="scriptPlatform" id="platformMac" value="mac">' +
                    '<label class="form-check-label" for="platformMac">Mac</label>' +
                  '</div>' +
                  '<div class="form-check form-check-inline">' +
                    '<input class="form-check-input" type="radio" name="scriptPlatform" id="platformAll" value="all">' +
                    '<label class="form-check-label" for="platformAll">All</label>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="mb-3">' +
                '<div class="d-flex justify-content-between align-items-center mb-2">' +
                  '<label class="form-label mb-0">动作列表 <span class="text-danger">*</span></label>' +
                  '<button type="button" class="btn btn-sm btn-outline-primary" id="btnAddAction">' +
                    '<i class="bi bi-plus"></i> 添加动作' +
                  '</button>' +
                '</div>' +
                '<div id="actionsContainer"></div>' +
                '<small class="text-muted">脚本支持动态变量，格式为 <code>{{变量名}}</code></small>' +
              '</div>' +
            '</form>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-light" data-bs-dismiss="modal">取消</button>' +
            '<button type="button" class="btn btn-primary" id="btnSaveScript">' +
              '<i class="bi bi-check-lg me-1"></i>保存' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="modal fade" id="variablesModal" tabindex="-1" aria-labelledby="variablesModalLabel" aria-hidden="true">' +
      '<div class="modal-dialog">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title" id="variablesModalLabel">' +
              '<i class="bi bi-input-cursor-text me-2 text-primary"></i>填写变量' +
            '</h5>' +
            '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<form id="variablesForm"></form>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-light" data-bs-dismiss="modal">取消</button>' +
            '<button type="button" class="btn btn-primary" id="btnRunWithVars">' +
              '<i class="bi bi-play-fill me-1"></i>运行' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="modal fade" id="resultModal" tabindex="-1" aria-labelledby="resultModalLabel" aria-hidden="true">' +
      '<div class="modal-dialog modal-lg">' +
        '<div class="modal-content">' +
          '<div class="modal-header text-white" id="resultModalHeader">' +
            '<h5 class="modal-title" id="resultModalLabel"></h5>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="关闭"></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<pre class="execution-log" id="resultLog"></pre>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-light" data-bs-dismiss="modal">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
