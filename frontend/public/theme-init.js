// Sets the theme before first paint; src/shared/lib/theme.ts keeps it afterwards.
// A separate file, not an inline script: the production CSP allows scripts from 'self' only.
;(() => {
  try {
    let t = localStorage.getItem('tidysense.theme')
    if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset.theme = t
    if (t === 'dark') document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0f1720')
  } catch {}
})()
