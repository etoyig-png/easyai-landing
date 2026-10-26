import { expect, test } from '@playwright/test';

// Supplement the retained retired-photo cases with the actual photographed devices.
// These assertions do not claim that old HVAC/electrician/chiropractic assets returned.
for (const [width, height] of [[360, 800], [390, 844], [412, 915], [768, 1024], [1024, 768], [1280, 720], [1440, 900]]) {
  test(`current device photographs fit and retain usable dimensions at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    for (const [section, kind, logicalRatio] of [
      ['discovery', 'laptop', 760 / 600],
      ['engagement', 'laptop', 760 / 600],
      ['response', 'phone', 400 / 680],
    ] as const) {
      const canvas = page.locator(`#${section} .photograph-canvas`);
      await canvas.scrollIntoViewIfNeeded();
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box, `${section} device has no rendered box`).not.toBeNull();
      expect(box!.width, `${section} device collapsed to a thumbnail`).toBeGreaterThanOrEqual(199);
      expect(box!.x, `${section} left edge`).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width, `${section} right edge`).toBeLessThanOrEqual(width + 1);
      expect(Math.abs(box!.width / box!.height - logicalRatio), `${section} canvas stretched`).toBeLessThan(0.01);

      const photo = canvas.locator(`image[data-device-photograph="${kind}"]`);
      await expect(photo).toHaveCount(1);
      const dimensions = await photo.evaluate(async (element) => {
        const svgImage = element as SVGImageElement;
        const image = new Image();
        image.src = svgImage.href.baseVal;
        await image.decode();
        return {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          declaredWidth: svgImage.width.baseVal.value,
          declaredHeight: svgImage.height.baseVal.value,
        };
      });
      expect(dimensions.naturalWidth).toBeGreaterThan(0);
      expect(dimensions.naturalHeight).toBeGreaterThan(0);
      expect(Math.abs(dimensions.declaredWidth / dimensions.declaredHeight - dimensions.naturalWidth / dimensions.naturalHeight), `${section} source photo stretched`).toBeLessThan(0.001);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${section} creates horizontal overflow`).toBeLessThanOrEqual(width + 1);
    }
  });
}
