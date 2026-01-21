'use client';

import React, { useRef, useEffect } from 'react';

interface CoilNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function CoilNumberInput({ value, onChange, required }: CoilNumberInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Ensure value is 8 chars, padding with spaces if needed
  const displayValue = value.padEnd(8, ' ').split('');

  const handleChange = (index: number, char: string) => {
    // Only allow alphanumeric
    if (char !== '' && !/^[a-zA-Z0-9]$/.test(char)) return;

    const newValue = displayValue.map((c, i) => (i === index ? char || ' ' : c)).join('');
    onChange(newValue.trimEnd());

    // Auto-focus move logic
    if (char && index < 7) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !displayValue[index].trim() && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          maxLength={1}
          className="w-8 h-10 text-center border rounded-md uppercase font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          value={displayValue[i].trim()}
          onChange={(e) => handleChange(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          required={required && i === 0} // Only first box needs required for browser validation if needed
          placeholder="-"
          autoComplete="off"
        />
      ))}
    </div>
  );
}
