import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Renders children into document.body — used by overlays (Modal, Drawer). */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  return mounted ? createPortal(children, document.body) : null;
}
