export function escapeHtml(str) {
  return $('<div>').text(str).html();
}

export function showToast(message, type = 'success') {
  const id = 'toast-' + Date.now();
  const bgClass = type === 'success' ? 'text-bg-success' : 'text-bg-danger';

  $('#toastContainer').append(
    '<div id="' + id + '" class="toast ' + bgClass + '" role="alert">' +
      '<div class="d-flex">' +
        '<div class="toast-body">' + escapeHtml(message) + '</div>' +
        '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
      '</div>' +
    '</div>'
  );

  const toastEl = document.getElementById(id);
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  $(toastEl).on('hidden.bs.toast', function () {
    $(this).remove();
  });
}
