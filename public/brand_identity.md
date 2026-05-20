# WebNovation — Brand Identity UI / Web App Reference

## Brand Overview

WebNovation è un brand tech-oriented focalizzato su AI, automazione, sviluppo software, performance marketing e sistemi digitali per PMI.

L’identità visiva deve comunicare innovazione, affidabilità tecnica, modernità, minimalismo, scalabilità e approccio futuristico ma professionale.

---

## Visual Direction

### Core Style

- Minimal tech
- Futuristic clean UI
- Dark modern interface
- Soft gradients
- Rounded elements
- Structured layouts
- High readability
- Enterprise + startup hybrid feeling

### Visual Mood

- Tecnologico
- Premium
- AI-driven
- Fluido
- Ordinato
- Data-oriented

### UI Keywords

- Light glassmorphism
- Subtle glow
- Soft shadows
- Blur surfaces
- Gradient overlays
- Controlled neon accents
- Clean spacing

---

## Color Palette

### Primary Colors

#### Deep Purple — Primary Brand

```css
#2E0D57
```

Use for:
- Navbar
- Sidebar
- Header
- Premium sections
- Gradient base

#### Light Purple — Accent

```css
#A98EFF
```

Use for:
- CTA
- Hover states
- Badges
- Highlights
- Focus states
- Active states

---

## Secondary Colors

#### Dark Background

```css
#0D0D12
```

Main dark mode background.

#### Surface Background

```css
#16161F
```

Cards, modals and panels.

#### Soft Border

```css
#2A2A38
```

Minimal borders and separators.

#### Light Text

```css
#F5F5FA
```

Primary text.

#### Muted Text

```css
#A1A1B5
```

Secondary text and descriptions.

---

## Gradient System

### Primary Gradient

```css
linear-gradient(
  135deg,
  #2E0D57 0%,
  #5B21B6 50%,
  #A98EFF 100%
)
```

### Glow Gradient

```css
linear-gradient(
  180deg,
  rgba(169,142,255,0.25),
  rgba(46,13,87,0)
)
```

---

## Typography

### Primary Font

**Poppins**

Use for:
- Headings
- UI labels
- CTA
- Navigation

Recommended weights:
- 400
- 500
- 600
- 700

### Secondary Font

**Inter**

Use for:
- Body text
- Dashboard data
- Paragraphs
- Forms
- Tables

Recommended weights:
- 400
- 500
- 600

---

## Typography Scale

### H1

```css
font-size: 56px;
font-weight: 700;
line-height: 1.1;
```

### H2

```css
font-size: 40px;
font-weight: 600;
line-height: 1.15;
```

### H3

```css
font-size: 28px;
font-weight: 600;
line-height: 1.2;
```

### Body Large

```css
font-size: 18px;
line-height: 1.6;
```

### Body Standard

```css
font-size: 16px;
line-height: 1.6;
```

### Small Text

```css
font-size: 14px;
line-height: 1.5;
```

---

## UI Components Style

### Buttons

#### Primary Button

- Purple gradient background
- White text
- High border-radius
- Subtle glow on hover
- Strong but clean presence

```css
border-radius: 14px;
padding: 14px 24px;
font-weight: 600;
background: linear-gradient(135deg, #2E0D57 0%, #A98EFF 100%);
color: #FFFFFF;
```

#### Secondary Button

- Transparent or dark surface
- Soft border
- Light text
- Purple hover border

```css
border-radius: 14px;
padding: 14px 24px;
background: rgba(255,255,255,0.03);
border: 1px solid #2A2A38;
color: #F5F5FA;
```

---

## Cards

### Card Style

- Dark background
- Thin border
- Slight blur
- Soft rounded corners
- Premium dashboard feeling

```css
border-radius: 24px;
background: #16161F;
border: 1px solid #2A2A38;
box-shadow: 0 10px 30px rgba(0,0,0,0.25);
```

---

## Inputs

### Input Style

- Dark surface
- Thin border
- Purple focus glow
- Rounded corners

```css
background: #111118;
border: 1px solid #2A2A38;
border-radius: 14px;
color: #F5F5FA;
```

### Focus State

```css
border-color: #A98EFF;
box-shadow: 0 0 0 4px rgba(169,142,255,0.12);
```

---

## Spacing System

Recommended scale:

```txt
4px
8px
12px
16px
24px
32px
48px
64px
96px
```

---

## Border Radius

Recommended values:

```txt
Buttons: 12-14px
Cards: 20-24px
Inputs: 12-14px
Modals: 28px
Sections: 32px
```

---

## Shadows & Effects

### Soft Shadow

```css
box-shadow: 0 10px 30px rgba(0,0,0,0.25);
```

### Purple Glow

```css
box-shadow: 0 0 40px rgba(169,142,255,0.25);
```

### Glass Effect

```css
background: rgba(255,255,255,0.04);
backdrop-filter: blur(18px);
border: 1px solid rgba(255,255,255,0.08);
```

---

## Iconography

Recommended style:
- Outline icons
- Minimal
- Rounded stroke
- Lucide-style icons
- 1.5px / 2px stroke width

Avoid:
- Filled icons
- Overly playful icons
- Complex illustrations inside small UI components

---

## Motion & Animations

### Recommended Motion

- Smooth fade
- Soft scale
- Subtle hover movement
- Animated gradients
- Blur transitions
- Micro-interactions on buttons, cards and dashboard widgets

### Timing

```css
transition: all 0.25s ease;
```

### Hover Example

```css
transform: translateY(-2px);
box-shadow: 0 0 40px rgba(169,142,255,0.20);
```

---

## Layout Guidelines

### Container

```css
max-width: 1440px;
margin: 0 auto;
padding: 0 24px;
```

### Sections

- Use generous spacing
- Alternate between dark surfaces and gradient sections
- Keep layouts modular and easy to scan
- Use strong hierarchy between headline, supporting copy and CTA
- Prefer grid-based layouts

---

## Dashboard Direction

The web app dashboard should feel like an enterprise AI platform with a clean and premium SaaS interface.

### Dashboard Style

- Modular blocks
- Clean analytics
- Futuristic CRM feeling
- Clear data hierarchy
- Technical but simple UI
- Dark surfaces with purple accents

### Avoid

- Too corporate design
- Overly saturated colors
- Aggressive neon
- Excessive cyberpunk style
- Cluttered UI
- Generic agency-template feeling

---

## Recommended Frontend Stack

- Next.js
- TailwindCSS
- Framer Motion
- shadcn/ui
- Lucide Icons

---

## Tailwind Color Suggestions

```js
colors: {
  primary: "#2E0D57",
  accent: "#A98EFF",
  background: "#0D0D12",
  surface: "#16161F",
  border: "#2A2A38",
  text: "#F5F5FA",
  muted: "#A1A1B5"
}
```

---

## Final Creative Direction

WebNovation deve apparire come una piattaforma AI/software premium che unisce automazione, sviluppo e performance marketing in un ecosistema moderno, tecnologico e affidabile.
