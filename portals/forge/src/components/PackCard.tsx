import { Link } from 'react-router-dom'

export interface ManifestPack {
  id: string
  kind: string
  title: string
  filename: string
  date: string | null
  theme: string | null
  source: string
}

export function PackCard({ pack }: { pack: ManifestPack }) {
  return (
    <article className="pack-card">
      <span className="pack-card__kind">{pack.kind}</span>
      <h3>{pack.title}</h3>
      <span className="pack-card__file">{pack.filename}</span>
      <Link to={`/pack/${pack.kind}/${pack.id}`} className="pack-card__link">
        Open →
      </Link>
    </article>
  )
}