"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createGroupSchema, type CreateGroupInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus } from "lucide-react"

interface CreateGroupDialogProps {
  onCreated: () => void
}

export function CreateGroupDialog({ onCreated }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [apiError, setApiError] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError("")

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const responseData = await res.json()

      if (!res.ok) {
        setApiError(responseData.error || "Failed to create group")
        return
      }

      reset() // Limpia el formulario
      setOpen(false) // Cierra el modal
      onCreated() // Actualiza la lista
    } catch {
      setApiError("An error occurred while creating the group")
    }
  })

  // Función para resetear errores y datos si el usuario cierra y abre el modal
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      reset()
      setApiError("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="plastic-button">
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="plastic-surface border-0">
        <DialogHeader>
          <DialogTitle>Crear un nuevo grupo</DialogTitle>
          <DialogDescription>
            Crea un grupo para empezar a coordinar la disponibilidad con los
            demás.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {apiError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre del grupo</Label>
            <Input
              id="name"
              placeholder="Por ejemplo: Reunión de fin de semana, Reunión de equipo"
              className={`plastic-input ${errors.name ? "border-destructive" : ""}`}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripcion (opcional)</Label>
            <Textarea
              id="description"
              placeholder="¿Para que se utiliza el grupo?"
              className="plastic-input resize-none"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="plastic-button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="plastic-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear grupo"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
