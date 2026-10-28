import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { ConfirmDialog, Dialog } from './Dialog';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export interface MessageOptions {
  title: string;
  description: string;
  confirmLabel?: string;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showMessage: (options: MessageOptions) => Promise<void>;
}

type DialogRequest =
  | { id: string; kind: 'confirm'; options: ConfirmOptions; resolve: (confirmed: boolean) => void }
  | { id: string; kind: 'message'; options: MessageOptions; resolve: () => void };

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDialog, setActiveDialog] = useState<DialogRequest | null>(null);
  const activeDialogRef = useRef<DialogRequest | null>(null);
  const queueRef = useRef<DialogRequest[]>([]);
  const nextIdRef = useRef(0);

  const enqueue = useCallback((request: Omit<DialogRequest, 'id'>) => {
    const nextRequest = { ...request, id: `app-dialog-${++nextIdRef.current}` } as DialogRequest;
    if (activeDialogRef.current) {
      queueRef.current.push(nextRequest);
      return;
    }

    activeDialogRef.current = nextRequest;
    setActiveDialog(nextRequest);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    enqueue({ kind: 'confirm', options, resolve });
  }), [enqueue]);

  const showMessage = useCallback((options: MessageOptions) => new Promise<void>((resolve) => {
    enqueue({ kind: 'message', options, resolve });
  }), [enqueue]);

  const settleActiveDialog = useCallback((confirmed: boolean) => {
    const current = activeDialogRef.current;
    if (!current) return;

    if (current.kind === 'confirm') current.resolve(confirmed);
    else current.resolve();

    const nextDialog = queueRef.current.shift() ?? null;
    activeDialogRef.current = nextDialog;
    setActiveDialog(nextDialog);
  }, []);

  const closeDialog = useCallback(() => settleActiveDialog(false), [settleActiveDialog]);
  const confirmDialog = useCallback(() => settleActiveDialog(true), [settleActiveDialog]);

  useEffect(() => () => {
    const pending = [...queueRef.current, ...(activeDialogRef.current ? [activeDialogRef.current] : [])];
    activeDialogRef.current = null;
    queueRef.current = [];
    pending.forEach((request) => {
      if (request.kind === 'confirm') request.resolve(false);
      else request.resolve();
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, showMessage }}>
      {children}
      {activeDialog?.kind === 'confirm' && (
        <ConfirmDialog
          key={activeDialog.id}
          isOpen
          onClose={closeDialog}
          onConfirm={confirmDialog}
          title={activeDialog.options.title}
          description={activeDialog.options.description}
          confirmLabel={activeDialog.options.confirmLabel}
          cancelLabel={activeDialog.options.cancelLabel}
          isDestructive={activeDialog.options.isDestructive}
        />
      )}
      {activeDialog?.kind === 'message' && (
        <Dialog
          key={activeDialog.id}
          isOpen
          onClose={closeDialog}
          title={activeDialog.options.title}
          description={activeDialog.options.description}
          size="sm"
          footer={(
            <Button data-dialog-initial-focus variant="primary" size="sm" onClick={closeDialog} className="min-h-[44px] px-4 focus:ring-2 focus:ring-[#ba8d3d] focus:ring-offset-2 focus:ring-offset-[#0e0d0c]">
              {activeDialog.options.confirmLabel ?? 'متوجه شدم'}
            </Button>
          )}
        />
      )}
    </DialogContext.Provider>
  );
};

export const useAppDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('بخش دیالوگ‌ها باید داخل فراهم‌کننده دیالوگ قرار بگیرد.');
  return context;
};
