import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) setIsRendered(true);
    else {
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <>
      <div 
        data-testid="bottom-sheet-backdrop"
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex h-12 items-center justify-center pt-2 pb-4">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        
        {title && (
          <div className="flex items-center justify-between px-6 pb-4">
            <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </>
  );
}
