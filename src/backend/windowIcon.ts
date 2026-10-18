import { dlopen, FFIType, type Pointer } from 'bun:ffi';

// Keep the image handles alive for as long as Windows displays the window.
export function setWindowIcon(getWindow: () => Pointer | null, iconPath: string) {
  if (process.platform !== 'win32') return () => {};
  const user32 = dlopen('user32.dll', {
    IsWindow: { args: [FFIType.ptr], returns: FFIType.i32 },
    LoadImageW: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.i32, FFIType.i32, FFIType.u32],
      returns: FFIType.ptr,
    },
    SendMessageW: {
      args: [FFIType.ptr, FFIType.u32, FFIType.u64, FFIType.ptr], returns: FFIType.i64,
    },
    DestroyIcon: { args: [FFIType.ptr], returns: FFIType.i32 },
  });
  const path = Buffer.from(`${iconPath}\0`, 'utf16le');
  const icons: Pointer[] = [];
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const apply = () => {
    const window = getWindow();
    if (!window || !user32.symbols.IsWindow(window)) {
      if (++attempts < 20) timer = setTimeout(apply, 100);
      else console.warn('Could not find the native window to set its icon.');
      return;
    }
    for (const [kind, size] of [[0, 16], [1, 32]] as const) {
      // IMAGE_ICON, LR_LOADFROMFILE; WM_SETICON with ICON_SMALL / ICON_BIG.
      const icon = user32.symbols.LoadImageW(null, path, 1, size, size, 0x10);
      if (!icon) {
        console.warn(`Could not load the ${size}px window icon from ${iconPath}.`);
        continue;
      }
      const handle = Number(icon) as Pointer;
      icons.push(handle);
      user32.symbols.SendMessageW(window, 0x80, kind, handle);
    }
  };
  apply();
  return () => {
    clearTimeout(timer);
    for (const icon of icons) user32.symbols.DestroyIcon(icon);
    user32.close();
  };
}
