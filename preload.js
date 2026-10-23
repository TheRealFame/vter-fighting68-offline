window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason
  console.log('UNHANDLED ' + (r && r.stack ? r.stack : String(r)))
})
window.addEventListener('error', (e) => {
  console.log('WINDOW_ERROR ' + (e.error && e.error.stack ? e.error.stack : e.message))
})
