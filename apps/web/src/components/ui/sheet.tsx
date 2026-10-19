"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export function SheetContent({ children, ...props }: ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content className="sheet-content" {...props}>
        {children}
        <Dialog.Close className="sheet-close" aria-label="Закрити меню">
          <X size={20} />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
export const SheetTitle = Dialog.Title;
export const SheetClose = Dialog.Close;
