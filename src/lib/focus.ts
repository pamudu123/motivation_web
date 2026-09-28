export function focusMain() {
  const target =
    document.querySelector<HTMLElement>("main h1") ||
    document.querySelector<HTMLElement>("main");
  if (target) {
    target.tabIndex = -1;
    target.focus();
  }
}
