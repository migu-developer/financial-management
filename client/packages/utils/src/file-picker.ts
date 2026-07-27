/**
 * Opens the browser's file chooser and resolves with the picked image.
 *
 * WEB ONLY. React Native Web renders no `<input type="file">`, so the input is
 * created imperatively, clicked, and discarded — that keeps DOM handling out of
 * the React tree instead of leaking a hidden element into every screen that
 * mounts the chat.
 */

/**
 * MIME types offered in the picker.
 *
 * Broad on purpose — the server normalizes whatever arrives, so filtering here
 * would only stop a user from choosing a file that would have worked. HEIC is
 * included so a user who picks one gets an explanatory message rather than a
 * chooser that silently refuses to show their photo.
 */
export const IMAGE_PICKER_ACCEPT =
  'image/jpeg,image/png,image/webp,image/avif,image/tiff,image/gif,image/heic,image/heif';

/**
 * @returns the picked file, or `null` when the user dismissed the chooser.
 */
export const pickImageFile = (): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = IMAGE_PICKER_ACCEPT;
    input.style.display = 'none';

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => {
      finish(input.files?.[0] ?? null);
    });

    // `cancel` fires when the chooser is dismissed. Without it the promise
    // would never settle and the UI would stay stuck in "picking" forever.
    // It is reasonably well supported; the `change` path still covers browsers
    // that lack it, at the cost of the promise staying pending on a dismissal.
    input.addEventListener('cancel', () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
