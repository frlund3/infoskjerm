import { ScreenDisplay } from "@/components/screen/screen-display"

export default function ScreenPage({ params }: { params: { token: string } }) {
  return <ScreenDisplay token={params.token} />
}
