import type { ThemeConfig } from 'antd'
import { theme as antdTheme } from 'antd'

/* ─────────────────────────────────────────
   Brand palette (single source of truth)
   ───────────────────────────────────────── */
export const BRAND = {
  primary:    '#6366f1',   // Indigo 500
  primaryHov: '#4f46e5',   // Indigo 600
  secondary:  '#8b5cf6',   // Violet 500
  accent:     '#a78bfa',   // Violet 400
  success:    '#22c55e',   // Green 500
  warning:    '#f59e0b',   // Amber 500
  error:      '#ef4444',   // Red 500
  info:       '#38bdf8',   // Sky 400

  /* Neutral greys */
  neutral50:  '#f9fafb',
  neutral100: '#f3f4f6',
  neutral200: '#e5e7eb',
  neutral300: '#d1d5db',
  neutral400: '#9ca3af',
  neutral500: '#6b7280',
  neutral600: '#4b5563',
  neutral700: '#374151',
  neutral800: '#1f2937',
  neutral900: '#111827',

  /* Surface colours */
  surfaceLight: '#ffffff',
  surfaceDark:  '#0f0f17',
  bgLight:      '#f9fafb',
  bgDark:       '#050507',

  /* Typography */
  fontFamily: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`,
  fontMono:   `'JetBrains Mono', 'Fira Code', ui-monospace, monospace`,

  /* Border radius */
  radiusSm:  6,
  radiusMd:  10,
  radiusLg:  16,
  radiusXl:  24,
  radiusFull: 9999,

  /* Motion */
  durationFast: '0.15s',
  durationBase: '0.25s',
  durationSlow: '0.4s',
}

/* ─────────────────────────────────────────
   Shared token overrides (light + dark)
   ───────────────────────────────────────── */
const sharedTokens: ThemeConfig['token'] = {
  /* Brand */
  colorPrimary:          BRAND.primary,
  colorSuccess:          BRAND.success,
  colorWarning:          BRAND.warning,
  colorError:            BRAND.error,
  colorInfo:             BRAND.info,

  /* Typography */
  fontFamily:            BRAND.fontFamily,
  fontFamilyCode:        BRAND.fontMono,
  fontSize:              14,
  fontSizeSM:            12,
  fontSizeLG:            16,
  fontSizeXL:            20,
  fontSizeHeading1:      36,
  fontSizeHeading2:      28,
  fontSizeHeading3:      22,
  fontSizeHeading4:      18,
  fontSizeHeading5:      16,

  /* Line height */
  lineHeight:            1.6,
  lineHeightLG:          1.7,
  lineHeightSM:          1.4,

  /* Spacing */
  padding:               16,
  paddingSM:             12,
  paddingXS:             8,
  paddingLG:             24,
  margin:                16,
  marginSM:              12,
  marginXS:              8,
  marginLG:              24,

  /* Border */
  borderRadius:          BRAND.radiusMd,
  borderRadiusSM:        BRAND.radiusSm,
  borderRadiusLG:        BRAND.radiusLg,
  borderRadiusOuter:     BRAND.radiusMd,

  /* Motion */
  motionDurationFast:    BRAND.durationFast,
  motionDurationMid:     BRAND.durationBase,
  motionDurationSlow:    BRAND.durationSlow,
  motionEaseInOut:       'cubic-bezier(0.4, 0, 0.2, 1)',
  motionEaseOut:         'cubic-bezier(0, 0, 0.2, 1)',
  motionEaseInBack:      'cubic-bezier(0.71, -0.46, 0.88, 0.6)',


  /* Sizing */
  controlHeight:         40,
  controlHeightSM:       32,
  controlHeightLG:       48,
  wireframe:             false,
}

/* ─────────────────────────────────────────
   Component-level overrides
   ───────────────────────────────────────── */
const components: ThemeConfig['components'] = {
  Button: {
    borderRadius:        BRAND.radiusMd,
    fontWeight:          600,
    controlHeight:       40,
    controlHeightSM:     32,
    controlHeightLG:     48,
    paddingContentHorizontal: 20,
  },

  Input: {
    borderRadius:        BRAND.radiusMd,
    controlHeight:       40,
    controlHeightSM:     32,
    controlHeightLG:     48,
    paddingBlock:        10,
    paddingInline:       14,
  },

  Select: {
    borderRadius:        BRAND.radiusMd,
    controlHeight:       40,
    controlHeightSM:     32,
    controlHeightLG:     48,
  },

  Card: {
    borderRadius:        BRAND.radiusLg,
    paddingLG:           24,
  },

  Modal: {
    borderRadius:        BRAND.radiusXl,
  },

  Drawer: {
    borderRadius:        BRAND.radiusLg,
  },

  Table: {
    borderRadius:        BRAND.radiusMd,
    headerBg:            'transparent',
  },

  Tabs: {
    borderRadius:        BRAND.radiusMd,
    inkBarColor:         BRAND.primary,
    itemActiveColor:     BRAND.primary,
    itemSelectedColor:   BRAND.primary,
  },

  Form: {
    labelFontSize:       13,
  },

  Tag: {
    borderRadius:        BRAND.radiusFull,
  },

  Badge: {
    borderRadius:        BRAND.radiusFull,
  },

  Tooltip: {
    borderRadius:        BRAND.radiusMd,
  },

  Notification: {
    borderRadius:        BRAND.radiusLg,
  },

  Message: {
    borderRadius:        BRAND.radiusMd,
  },
}

/* ─────────────────────────────────────────
   Light theme
   ───────────────────────────────────────── */
export const lightTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorBgBase:          BRAND.surfaceLight,
    colorTextBase:        BRAND.neutral900,
    colorBgContainer:     '#ffffff',
    colorBgElevated:      '#ffffff',
    colorBgLayout:        BRAND.bgLight,
    colorBorder:          BRAND.neutral200,
    colorBorderSecondary: BRAND.neutral100,
    colorText:            BRAND.neutral700,
    colorTextSecondary:   BRAND.neutral500,
    colorTextTertiary:    BRAND.neutral400,
    colorTextDisabled:    BRAND.neutral300,
    colorFill:            BRAND.neutral100,
    colorFillSecondary:   BRAND.neutral50,
    colorSplit:           BRAND.neutral100,
    boxShadow:
      '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    boxShadowSecondary:
      '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  },
  components,
}
