import Section from './Section.jsx'
import FilmList from './FilmList.jsx'

// Deux listes de films côte à côte (coups de cœur récents, flop…).
export default function TopFlopCompare({
  eyebrow,
  title,
  subtitle,
  a,
  b,
  nameA,
  nameB,
  renderMeta,
  enrichMap,
}) {
  return (
    <Section eyebrow={eyebrow} title={title} subtitle={subtitle}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 border-b border-line pb-1.5 text-sm font-semibold text-green">
            {nameA}
          </h4>
          <FilmList rows={a} renderMeta={renderMeta} enrichMap={enrichMap} emptyText="Aucune note." />
        </div>
        <div>
          <h4 className="mb-2 border-b border-line pb-1.5 text-sm font-semibold text-blue">
            {nameB}
          </h4>
          <FilmList rows={b} renderMeta={renderMeta} enrichMap={enrichMap} emptyText="Aucune note." />
        </div>
      </div>
    </Section>
  )
}
