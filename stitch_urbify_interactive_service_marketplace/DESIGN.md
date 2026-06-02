---
name: Emerald Orbit
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#ecffe3'
  on-secondary: '#003907'
  secondary-container: '#13ff43'
  on-secondary-container: '#007117'
  tertiary: '#c0c1ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#9699ff'
  on-tertiary-container: '#1d17b2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#72ff70'
  secondary-fixed-dim: '#00e639'
  on-secondary-fixed: '#002203'
  on-secondary-fixed-variant: '#00530e'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  container-gap: 20px
---

## Brand & Style

This design system embodies a **"Tech-Control"** aesthetic—a high-density, command-center interface designed for precision, oversight, and advanced data management. The brand personality is authoritative, futuristic, and highly organized, catering to users who manage complex systems or large-scale projects.

The visual language blends **Minimalism** with **Glassmorphism**. It utilizes deep, multi-layered dark surfaces to create a sense of vast digital space, punctuated by vibrant, luminous accents that draw immediate attention to critical status indicators and data points. The emotional response is one of total awareness and streamlined efficiency. A subtle dot or line grid background should be used sparingly to reinforce the technical, structured nature of the environment.

## Colors

The palette is rooted in a deep, obsidian foundation to maximize contrast for data visualization. 

- **Primary (Emerald):** Used for primary actions, success states, and key brand elements.
- **Secondary (Neon Green):** Reserved for "active" indicators, high-alert data points, and terminal-style accents.
- **Tertiary (Electric Indigo):** Used for information-dense secondary actions and branding flourishes, as seen in the reference image.
- **Neutral (Midnight Slate):** A range of deep blues and greys used for surfaces, borders, and secondary text.

The system relies on high-luminance colors against low-luminance backgrounds to ensure accessibility and visual pop in a "lights-out" interface.

## Typography

Typography is sharp and contemporary. **Hanken Grotesk** serves as the primary typeface, offering a clean, professional look with high legibility in dense layouts. For technical metadata, status labels, and "code-like" data points, **JetBrains Mono** is utilized to reinforce the Tech-Control aesthetic.

Tight letter spacing is applied to headlines for a modern, compact feel, while labels utilize increased tracking and uppercase styling to ensure they stand out as functional markers.

## Layout & Spacing

This design system uses a **Fixed Grid** approach for internal dashboard modules, allowing for high information density without visual clutter. 

- **Grid Model:** A 12-column layout on desktop, transitioning to a single-column flow on mobile.
- **Density:** Elements are tightly packed with a consistent 4px baseline grid. Containers should be grouped logically to minimize travel time for the eye.
- **Responsive Behavior:** Sidebars collapse into a compact icon-only view on tablet, and move to a bottom navigation bar or a hidden drawer on mobile.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

- **Base Layer:** The darkest neutral (#0B0F1A), often featuring a subtle dot-grid texture.
- **Surface Layer:** Solid, slightly lighter containers (#1E293B) with thin, low-opacity borders (1px) to define boundaries.
- **Glass Layer:** Used for floating panels, tooltips, and high-level navigation. These surfaces use a backdrop blur (12px to 20px) and a semi-transparent white or primary-tinted stroke.
- **Inner Glow:** Interactive elements like buttons or active cards may feature a faint inner emerald glow to simulate a backlit physical console.

## Shapes

The shape language is "Rounded-Industrial." While the grid is sharp and rigid, UI elements utilize a 0.5rem (8px) radius to maintain a modern, sophisticated feel that prevents the UI from appearing overly aggressive or dated. Larger cards and containers may scale up to 1rem (16px) to clearly define major content sections.

## Components

- **Buttons:** Primary buttons are solid Emerald with high-contrast dark text. Secondary buttons are "Ghost" style with an Emerald border and JetBrains Mono labels.
- **Chips/Badges:** Small, high-contrast indicators with mono-spaced text. Status chips (e.g., "Active", "In Progress") use a background tint of the status color with a 100% opacity text label.
- **Input Fields:** Dark, recessed backgrounds with a 1px border that glows Emerald upon focus.
- **Cards:** Use a mix of solid midnight-blue backgrounds for standard data and glassmorphic backgrounds for "featured" or "real-time" metrics.
- **Data Visualization:** Charts use high-vibrancy gradients (Emerald to Neon Green). Grid lines within charts should be ultra-thin and low-contrast to keep the focus on the data trend.
- **Navigation:** A vertical sidebar with high-contrast icons and subtle "active" state indicators using a vertical bar or glowing background.