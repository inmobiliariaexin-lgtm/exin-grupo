'use client'

import { useRef, type FormEvent } from 'react'

type DeleteAction = (formData: FormData) => void | Promise<void>

export function AdminDeleteForm({
  action,
  id,
  prompt,
  buttonLabel = 'Eliminar',
}: {
  action: DeleteAction
  id: string
  prompt: string
  buttonLabel?: string
}) {
  const confirmation = useRef<HTMLInputElement>(null)

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    const answer = window.prompt(`${prompt}\n\nPara confirmar, escribe ELIMINAR.`)
    if (answer?.trim().toUpperCase() !== 'ELIMINAR') {
      event.preventDefault()
      return
    }
    if (confirmation.current) confirmation.current.value = answer.trim().toUpperCase()
  }

  return (
    <form action={action} onSubmit={confirmDelete} className="admin-delete-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="confirmation" value="" ref={confirmation} />
      <button type="submit" className="delete-button">{buttonLabel}</button>
    </form>
  )
}
