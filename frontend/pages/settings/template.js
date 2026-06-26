export function renderTopbarActions() {
  return '';
}

export function renderContent() {
  return (
    '<div class="content-card">' +
      '<div class="content-card-header">' +
        '<div class="d-flex align-items-center gap-2">' +
          '<i class="bi bi-gear text-primary"></i>' +
          '<span class="fw-semibold">应用配置</span>' +
        '</div>' +
      '</div>' +
      '<div class="content-card-body" id="settingsForm">' +
        '<div class="text-center text-muted py-5">' +
          '<div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>' +
          '加载中...' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

export function renderModals() {
  return '';
}
