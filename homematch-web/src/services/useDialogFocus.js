import {useEffect, useRef} from 'react';
export default function useDialogFocus(open, busy, onClose) {
  const dialog = useRef(null);
  const options = useRef({busy,onClose});
  useEffect(() => {options.current = {busy,onClose};}, [busy,onClose]);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previous = document.activeElement;
    const focusables = () => Array.from(element.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]'));
    (focusables()[0] || element).focus();
    const keydown = event => {
      if (event.key === 'Escape' && !options.current.busy) {event.preventDefault(); options.current.onClose();}
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {event.preventDefault(); element.focus(); return;}
      if (event.shiftKey && document.activeElement === items[0]) {event.preventDefault(); items[items.length-1].focus();}
      else if (!event.shiftKey && document.activeElement === items[items.length-1]) {event.preventDefault(); items[0].focus();}
    };
    element.addEventListener('keydown',keydown);
    return () => {element.removeEventListener('keydown',keydown); if (previous?.isConnected) previous.focus();};
  }, [open]);
  return dialog;
}
