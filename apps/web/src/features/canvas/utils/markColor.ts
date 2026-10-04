const MIN_CONTRAST_ON_WHITE = 2.5;

const channel = (value: number) => {
  const unit = value / 255;

  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string) => {
  const value = Number.parseInt(hex, 16);
  const red = channel((value >> 16) & 0xff);
  const green = channel((value >> 8) & 0xff);
  const blue = channel(value & 0xff);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

export const contrastOnWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

export const markColor = (hex: string, fallback: string) =>
  contrastOnWhite(hex) < MIN_CONTRAST_ON_WHITE ? fallback : `#${hex}`;
