export function usePrintableReport() {
  const print = () => window.print()
  return { print }
}
