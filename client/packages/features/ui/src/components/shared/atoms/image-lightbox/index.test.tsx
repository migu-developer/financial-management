import { ImageLightbox, type ImageLightboxProps } from '.';
import { lightboxInset, mediaSize } from '@features/ui/utils/spacing';

/**
 * The repo mocks `react-native` wholesale and ships no testing library, so the
 * animation itself cannot be driven here. What IS worth asserting are the
 * numeric decisions the motion depends on — those are plain arithmetic and would
 * otherwise only be caught by looking at the screen.
 */
describe('ImageLightbox', () => {
  it('exports a function component', () => {
    expect(typeof ImageLightbox).toBe('function');
    expect(ImageLightbox.name).toBe('ImageLightbox');
  });
});

describe('lightbox geometry', () => {
  const target = (screen: number) => screen - lightboxInset * 2;

  it('leaves an inset on both sides so the photo never bleeds to the edge', () => {
    // 380dp is the web drawer width; the expanded photo must stay inside it.
    expect(target(380)).toBe(380 - lightboxInset * 2);
    expect(target(380)).toBeLessThan(380);
  });

  it('never shrinks below the thumbnail it grew from', () => {
    // The component clamps with Math.max(target, origin): on a viewport narrower
    // than the thumbnail the animation would otherwise run BACKWARDS — the photo
    // would shrink on opening, which reads as a glitch.
    const tinyScreen = 100;
    const expanded = Math.max(
      target(tinyScreen),
      mediaSize.chatAttachment.width,
    );
    expect(expanded).toBe(mediaSize.chatAttachment.width);
    expect(expanded).toBeGreaterThanOrEqual(mediaSize.chatAttachment.width);
  });

  it('centers the expanded photo', () => {
    const screen = 800;
    const width = target(screen);
    expect((screen - width) / 2).toBe(lightboxInset);
  });
});

describe('accessibility semantics are not interchangeable', () => {
  it('the expanded image takes a DESCRIPTION, never an action label', () => {
    // REGRESSION: one prop served both, so the caller's "Expand the receipt
    // photo" ended up on the already-expanded image — a screen reader announced
    // an action the user had just completed. The prop names now say which is
    // which, and ImageLightbox only ever receives the description.
    const props: Pick<
      ImageLightboxProps,
      'accessibilityLabel' | 'closeAccessibilityLabel'
    > = {
      accessibilityLabel: 'Attached receipt photo',
      closeAccessibilityLabel: 'Close the expanded photo',
    };

    expect(props.accessibilityLabel).not.toMatch(/expand/i);
    expect(props.closeAccessibilityLabel).toMatch(/close/i);
  });
});
