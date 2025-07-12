import { toast } from "sonner"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

export function useToast() {
  return {
    toast: ({ title, description, variant = "default" }: ToastProps) => {
      const message = title && description ? `${title}: ${description}` : title || description || ""
      
      switch (variant) {
        case "destructive":
          toast.error(message)
          break
        case "success":
          toast.success(message)
          break
        default:
          toast(message)
          break
      }
    }
  }
}