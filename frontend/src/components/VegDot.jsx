import React from 'react'

/**
 * VegDot — Indian FSSAI-standard veg/non-veg indicator
 * Green square with inner circle = veg
 * Red square with inner circle = non-veg
 */
export function VegDot({ isVeg, size = 16 }) {
  const color = isVeg ? '#00A651' : '#E63C32'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      role="img"
    >
      <rect
        x="1" y="1" width="14" height="14"
        rx="2" ry="2"
        stroke={color}
        strokeWidth="2"
        fill="transparent"
      />
      <circle cx="8" cy="8" r="4" fill={color} />
    </svg>
  )
}
