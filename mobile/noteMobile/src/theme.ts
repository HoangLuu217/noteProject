import { StyleSheet } from 'react-native';

export type ColorTheme = 'blue' | 'green' | 'pink' | 'yellow';

export const lightColors = {
  primary: '#006780',
  primaryContainer: '#4cc9f0',
  onPrimaryContainer: '#005266',

  secondary: '#536500',
  secondaryContainer: '#cdf139',
  onSecondaryContainer: '#596c00',

  tertiary: '#695f00',
  tertiaryContainer: '#cebd00',
  onTertiaryContainer: '#534b00',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',

  background: '#fbf9f1',
  onBackground: '#1b1c17',

  surface: '#fbf9f1',
  onSurface: '#1b1c17',
  surfaceVariant: '#e4e3db',
  onSurfaceVariant: '#3d484d',

  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f4ec',
  surfaceContainer: '#f0eee6',
  surfaceContainerHigh: '#eae8e0',

  outline: '#6d797e',
  outlineVariant: '#bcc8ce',
};

export const darkColors = {
  primary: '#8cd6f0',
  primaryContainer: '#004d61',
  onPrimaryContainer: '#b3e7f8',

  secondary: '#bedc2e',
  secondaryContainer: '#3c4900',
  onSecondaryContainer: '#d9f36b',

  tertiary: '#dfcc00',
  tertiaryContainer: '#4c4400',
  onTertiaryContainer: '#edd900',

  error: '#ffb4ab',
  errorContainer: '#93000a',

  background: '#131410',
  onBackground: '#e4e3d9',

  surface: '#131410',
  onSurface: '#e4e3d9',
  surfaceVariant: '#40484b',
  onSurfaceVariant: '#c0c8cc',

  surfaceContainerLowest: '#0e0f0c',
  surfaceContainerLow: '#1a1b18',
  surfaceContainer: '#1e1f1c',
  surfaceContainerHigh: '#292a27',

  outline: '#899297',
  outlineVariant: '#40484b',
};

export const themeOverrides = {
  green: {
    light: {
      primary: '#386a3d',
      primaryContainer: '#b9f3b8',
      onPrimaryContainer: '#002106',
    },
    dark: {
      primary: '#9edf9e',
      primaryContainer: '#1f5127',
      onPrimaryContainer: '#b9f3b8',
    }
  },
  pink: {
    light: {
      primary: '#8a315f',
      primaryContainer: '#ffd9e6',
      onPrimaryContainer: '#390021',
    },
    dark: {
      primary: '#ffb1d1',
      primaryContainer: '#6e1747',
      onPrimaryContainer: '#ffd9e6',
    }
  },
  yellow: {
    light: {
      primary: '#6c5e0f',
      primaryContainer: '#f8e388',
      onPrimaryContainer: '#211b00',
    },
    dark: {
      primary: '#dbc76f',
      primaryContainer: '#524700',
      onPrimaryContainer: '#f8e388',
    }
  },
  blue: {
    light: {
      primary: '#006780',
      primaryContainer: '#4cc9f0',
      onPrimaryContainer: '#005266',
    },
    dark: {
      primary: '#8cd6f0',
      primaryContainer: '#004d61',
      onPrimaryContainer: '#b3e7f8',
    }
  }
};

let activeColors = lightColors;

export function getActiveColors(isDark: boolean, colorTheme: ColorTheme) {
  const baseColors = isDark ? darkColors : lightColors;
  const overrides = themeOverrides[colorTheme]?.[isDark ? 'dark' : 'light'] || {};
  const computedColors = {
    ...baseColors,
    ...overrides,
  };
  activeColors = computedColors;
  return computedColors;
}

export const theme = {
  get colors() {
    return activeColors;
  },
  clay: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 2,
      borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    buttonPrimary: {
      shadowColor: '#006780',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    avatar: {
      shadowColor: '#006780',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

export function createThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  creator: (colors: typeof lightColors) => T
): (colors: typeof lightColors) => T {
  return (colors: typeof lightColors) => StyleSheet.create(creator(colors));
}
