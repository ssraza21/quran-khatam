import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-center"
      style={
        {
          "--normal-bg": "#fff",
          "--normal-text": "#4A4A4A",
          "--normal-border": "#E0E0E0",
          "--border-radius": "24px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-[Inter,system-ui,sans-serif] shadow-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
