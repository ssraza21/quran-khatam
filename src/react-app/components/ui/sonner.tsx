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
          "--normal-text": "#1C1917",
          "--normal-border": "#E7E5E4",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans shadow-md",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
