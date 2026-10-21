// Keeps the demo honest: it borrows the company's look, so it must never pass
// for an official product. Leave this in every deployed build.
export function Disclaimer() {
  return (
    <div className="border-b border-line bg-surface px-4 py-2 text-center text-xs text-ink-muted">
      Unofficial prototype built by{' '}
      <a className="font-medium text-ink underline underline-offset-2" href="https://www.linkedin.com/in/sanskar-pal-493691225" target="_blank" rel="noreferrer">
        Sanskar Pal
      </a>{' '}
      as a job-application project. Not affiliated with or endorsed by Agave. All data is fictional.
    </div>
  )
}
