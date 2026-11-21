// First tab stop on a page: lets keyboard and screen-reader users jump past
// the navigation. Invisible until focused. The target needs id + tabIndex={-1}.
export default function SkipLink({ target = 'main-content' }) {
  const go = (e) => {
    e.preventDefault();
    const el = document.getElementById(target);
    if (el) {
      el.focus();
      el.scrollIntoView?.();
    }
  };
  return (
    <a
      href={`#${target}`}
      onClick={go}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-600 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}
