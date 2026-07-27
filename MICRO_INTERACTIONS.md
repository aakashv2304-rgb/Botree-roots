# 🎨 Micro-Interactions & Animations Guide

## Overview
This document describes all the micro-interactions and animations implemented in the Botree Proposal Tracker.

---

## 🔘 Button Interactions

### Ripple Effect
- **What**: Material Design-inspired ripple that emanates from click point
- **Where**: All buttons across the application
- **Trigger**: Mouse click
- **Duration**: 600ms
- **Details**: 
  - White semi-transparent circle expands from click position
  - Automatically cleans up after animation
  - Disabled for disabled buttons
  - Can be disabled per-button with `enableRipple={false}`

### Hover Effects
- **Scale Down on Click**: Buttons scale to 97% when pressed (active state)
- **Lift on Hover**: Buttons translate up 2px with shadow enhancement
- **Smooth Transitions**: All states transition smoothly over 300ms

---

## ☑️ Checkbox Animations

### Check Animation
- **Bounce In**: Checkbox scales from 80% → 110% → 90% → 100%
- **Check Mark Draw**: The checkmark animates from 0 to full height
- **Color Transition**: Background smoothly transitions to indigo (#6366f1)
- **Hover Scale**: Checkbox scales to 105% on hover

### Styling
- **Size**: 20x20px
- **Border Radius**: 4px
- **Colors**: 
  - Unchecked: White background, gray border
  - Checked: Indigo background, white checkmark
  - Hover: Indigo border

---

## 📄 Page Transitions

### Dashboard Route Changes
- **Animation**: Fade out left → Fade in right
- **Duration**: 300ms each direction
- **Effect**: 
  - Current page fades out while sliding left (-30px)
  - New page fades in while sliding right (+30px)
- **Easing**: Cubic bezier (0.4, 0, 0.2, 1)

### Implementation
- Wraps all dashboard routes with `<PageTransition>` component
- Automatically handles route changes
- No flash of content between transitions

---

## 🎴 Card Animations

### Entry Animation
- **KPI Cards**: Staggered fade-in-up animation
- **Delay**: 50ms between each card (0.05s, 0.1s, 0.15s, 0.2s)
- **Effect**: Cards fade in while sliding up 20px
- **Class**: `.stagger-children` on parent

### Hover Effects
- **Lift**: Cards translate up 4px
- **Shadow**: Enhanced shadow on hover
- **Transition**: 300ms smooth transition
- **Class**: `.hover-lift`

---

## 📊 Table Row Interactions

### Proposal Table Rows
- **Hover Background**: Semi-transparent overlay (#374151/30)
- **Scale**: Slight scale increase to 101%
- **Shadow**: Enhanced shadow on hover
- **Cursor**: Pointer to indicate clickability
- **Transition**: 200ms for smooth effect

---

## 🎯 Specialized Animations

### Badge Pulse
- **Where**: Critical SLA count badges
- **Effect**: Gentle pulsing scale (1.0 → 1.05 → 1.0)
- **Duration**: 2s infinite loop
- **Purpose**: Draw attention to urgent items

### Loading Spinner
- **Effect**: Continuous 360° rotation
- **Duration**: 1s per rotation
- **Linear timing**: No easing for smooth infinite spin

### Skeleton Loader
- **Effect**: Shimmer animation left to right
- **Colors**: Gradient from light gray → darker gray → light gray
- **Duration**: 2s infinite
- **Use**: Data loading states

---

## 🎬 Login Page Animations

### Page Load
- **Initial Spinner**: Pink spinning circle while page loads
- **Duration**: 500ms artificial delay for smooth entry

### Sequential Animations
1. **Background Orbs**: Pulsing gradient circles (staggered 1s, 2s delays)
2. **Logo**: Bounce-in animation (0.2s delay)
3. **Header Text**: Fade-in (0.1s delay)
4. **Email Field**: Slide-in from left (0.3s delay)
5. **Password Field**: Slide-in from left (0.4s delay)
6. **Sign In Button**: Slide-in from left (0.5s delay)
7. **Demo Credentials**: Fade-in with stagger (0.7s+ delays)
8. **Footer**: Fade-in (0.9s delay)

### Button States
- **Normal**: Gradient background with shadow
- **Hover**: Scale to 105%, enhanced shadow
- **Loading**: Rotating spinner with "Signing in..." text

---

## 🎨 Color Transitions

### Smooth Color Changes
- **Properties**: color, background-color, border-color
- **Duration**: 200ms
- **Easing**: Ease
- **Class**: `.transition-colors-smooth`

---

## 📱 Responsive Considerations

All animations are:
- **GPU-accelerated**: Using transform and opacity for performance
- **Reduced Motion Aware**: Can be disabled via CSS `prefers-reduced-motion`
- **Performance Optimized**: No layout-triggering animations
- **60fps Target**: All animations designed for smooth 60fps

---

## 🛠️ Technical Details

### Animation Files
- **CSS**: `/app/frontend/src/App.css` (all keyframe definitions)
- **Button Component**: `/app/frontend/src/components/ui/button.jsx` (ripple logic)
- **Page Transition**: `/app/frontend/src/components/PageTransition.js`
- **Ripple Component**: `/app/frontend/src/components/Ripple.js` (standalone)

### CSS Custom Properties Used
- Transition timings: cubic-bezier(0.4, 0, 0.2, 1)
- Shadow levels: Multiple elevation shadows
- Z-index layers: Proper stacking contexts

---

## 🎯 Best Practices Applied

1. **Subtle Not Distracting**: Animations enhance UX without overwhelming
2. **Consistent Timing**: 300ms standard for most transitions
3. **Feedback on Interaction**: Every click/hover provides visual feedback
4. **Performance First**: Hardware-accelerated animations only
5. **Accessibility**: Respects user's motion preferences
6. **Progressive Enhancement**: App works without animations

---

**Last Updated**: 2026-07-27
**Version**: 1.0
