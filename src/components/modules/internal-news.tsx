interface Props { fields: Record<string, unknown> }

export function InternalNewsModule({ fields }: Props) {
  const title = (fields.title as string) || 'Intern nyhet'
  const body = (fields.body as string) || ''
  const author = (fields.author as string) || ''
  const imageUrl = (fields.imageUrl as string) || ''

  const hasBody = body.trim().length > 0
  const hasImage = imageUrl.trim().length > 0

  // Dynamic title size: longer text = smaller font, title-only = massive
  const titleLength = title.length
  let titleClass = 'font-black leading-[0.95] tracking-tight text-white'
  if (!hasBody && !hasImage) {
    // Title-only mode — fill the screen
    if (titleLength <= 20) titleClass += ' text-[12vw]'
    else if (titleLength <= 40) titleClass += ' text-[8vw]'
    else titleClass += ' text-[6vw]'
  } else {
    if (titleLength <= 30) titleClass += ' text-[6vw]'
    else titleClass += ' text-[4.5vw]'
  }

  if (hasImage) {
    return (
      <div className="flex h-full text-white" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #141414 100%)' }}>
        {/* Left: text */}
        <div className="flex flex-col justify-between flex-1 px-16 py-14">
          <p
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--brand-primary, #16a34a)' }}
          >
            Intern nyhet
          </p>
          <div>
            <h1 className={titleClass}>{title}</h1>
            {hasBody && (
              <p className="text-[2.2vw] text-white/70 leading-relaxed mt-6 max-w-xl">
                {body}
              </p>
            )}
          </div>
          {author && (
            <p className="text-[1.4vw] text-white/40 font-medium">{author}</p>
          )}
        </div>
        {/* Right: image */}
        <div
          className="w-[45%] flex-shrink-0"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #161616 100%)' }}
    >
      {/* Brand accent bar */}
      <div className="h-2 w-full flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className={`flex flex-col flex-1 px-16 ${hasBody ? 'justify-between py-12' : 'justify-center py-20'}`}>
        {hasBody ? (
          <>
            <p
              className="text-sm font-bold uppercase tracking-[0.25em]"
              style={{ color: 'var(--brand-primary, #16a34a)' }}
            >
              Intern nyhet
            </p>
            <div>
              <h1 className={titleClass}>{title}</h1>
              <p className="text-[2.2vw] text-white/70 leading-relaxed mt-6 max-w-3xl">
                {body}
              </p>
            </div>
            {author && (
              <p className="text-[1.4vw] text-white/40 font-medium">{author}</p>
            )}
          </>
        ) : (
          <>
            <p
              className="text-[1.2vw] font-bold uppercase tracking-[0.25em] mb-10"
              style={{ color: 'var(--brand-primary, #16a34a)' }}
            >
              Intern nyhet
            </p>
            <h1 className={titleClass}>{title}</h1>
            {author && (
              <p className="text-[1.4vw] text-white/40 font-medium mt-8">{author}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
