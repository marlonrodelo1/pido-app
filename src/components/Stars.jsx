export default function Stars({ rating, size = 12 }) {
  return (
    <span style={{ color: '#FF6B2C', fontSize: size }}>
      {'★'.repeat(Math.floor(rating))}
      <span style={{ color: 'var(--c-muted)', marginLeft: 4, fontSize: size }}>{rating}</span>
    </span>
  )
}
