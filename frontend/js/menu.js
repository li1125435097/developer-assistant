import { routes } from './config/routes.js';

const STORAGE_KEY = 'sidebar-collapsed';

export function initSidebar() {
  const collapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  if (collapsed && window.innerWidth >= 992) {
    $('#appWrapper').addClass('sidebar-collapsed');
  }

  $('#btnSidebarCollapse').on('click', function () {
    $('#appWrapper').toggleClass('sidebar-collapsed');
    localStorage.setItem(
      STORAGE_KEY,
      $('#appWrapper').hasClass('sidebar-collapsed')
    );
  });

  $('#btnSidebarToggle, #sidebarOverlay').on('click', function () {
    $('#appWrapper').toggleClass('sidebar-mobile-open');
    $('#sidebarOverlay').toggleClass('show');
  });

  $(window).on('resize', function () {
    if (window.innerWidth >= 992) {
      $('#appWrapper').removeClass('sidebar-mobile-open');
      $('#sidebarOverlay').removeClass('show');
    }
  });
}

export function renderMenu(activePath) {
  const items = routes.map(function (route) {
    const menu = route.menu;
    const isActive = route.path === activePath;
    const isDisabled = !menu.enabled;

    let linkClass = 'nav-link';
    if (isActive) linkClass += ' active';
    if (isDisabled) linkClass += ' disabled';

    const href = isDisabled ? '#' : route.path;
    const attrs = isDisabled
      ? ' tabindex="-1" aria-disabled="true"'
      : ' data-route-path="' + route.path + '"';

    let badge = '';
    if (menu.badge) {
      badge =
        '<span class="badge bg-secondary-subtle text-secondary-emphasis ms-auto nav-badge">' +
        menu.badge +
        '</span>';
    }

    return (
      '<li class="nav-item">' +
        '<a class="' + linkClass + '" href="' + href + '"' + attrs + '>' +
          '<i class="bi ' + route.icon + '"></i>' +
          '<span class="nav-text">' + menu.label + '</span>' +
          badge +
        '</a>' +
      '</li>'
    );
  });

  $('#sidebarNavList').html(items.join(''));
}

export function closeMobileSidebar() {
  $('#appWrapper').removeClass('sidebar-mobile-open');
  $('#sidebarOverlay').removeClass('show');
}
