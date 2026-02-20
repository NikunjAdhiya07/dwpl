'use client';

import React from 'react';

interface CoilNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function CoilNumberInput({ value, onChange, required }: CoilNumberInputProps) {
  return (
    <input
      type="text"
      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded uppercase font-mono font-bold bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      required={required}
      placeholder="Enter Coil No"
      autoComplete="off"
    />
  );
}
