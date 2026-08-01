import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Repris de NOLI (src/components/ui/sonner.tsx), adapte :
 * la dependance next-themes a ete retiree. Le theme suivra la classe `dark`
 * posee sur le document, sans librairie supplementaire.
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
      },
    }}
    {...props}
  />
);

export { Toaster };
