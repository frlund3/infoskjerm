import { Play } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function VideoModule({ fields }: Props) {
  const title = (fields.title as string) || ''
  const videoUrl = (fields.video_url as string) || ''
  const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
  const embedUrl = isYoutube
    ? videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/') + '?autoplay=1&mute=1&loop=1'
    : videoUrl

  return (
    <div className="relative h-full bg-black overflow-hidden">
      {videoUrl ? (
        isYoutube ? (
          <iframe src={embedUrl} className="w-full h-full border-0" allow="autoplay; fullscreen" />
        ) : (
          <video src={videoUrl} autoPlay muted loop className="w-full h-full object-cover" />
        )
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
          <Play className="w-16 h-16 mb-4" />
          <p className="text-xl">Ingen video-URL angitt</p>
        </div>
      )}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-10 py-8">
          <p className="text-white text-2xl font-bold">{title}</p>
        </div>
      )}
    </div>
  )
}
