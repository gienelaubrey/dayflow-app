export default function Avatar({ user, size = 37, className = '' }) {
  const photo = user?.photo || user?.avatar || ''
  const name = user?.name || user?.email || 'User'
  const initial = (name.trim().charAt(0) || 'U').toUpperCase()

  const style = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.round(size * 0.42)}px`,
  }

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`avatar ${className}`}
        style={{ ...style, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div className={`avatar ${className}`} style={style}>
      {initial}
    </div>
  )
}