import { EditContentView } from "../../../innhold/_components/edit-content-view"

export const dynamic = "force-dynamic"

export default async function EditInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditContentView id={id} listHref="/admin/invitasjoner" />
}
