'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Home, 
  Users, 
  Package, 
  FileText, 
  TruckIcon, 
  Settings,
  ClipboardList,
  FileInput,
  Warehouse,
  Send,
  Receipt,
  ChevronDown
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { 
    name: 'Masters', 
    icon: Settings,
    children: [
      { name: 'Party Master', href: '/masters/party', icon: Users },
      { name: 'Item Master', href: '/masters/item', icon: Package },
      { name: 'BOM & Routing', href: '/masters/bom', icon: ClipboardList },
      { name: 'GST Master', href: '/masters/gst', icon: FileText },
      { name: 'Transport Master', href: '/masters/transport', icon: TruckIcon },
    ]
  },
  { name: 'GRN', href: '/grn', icon: FileInput },
  // { name: 'Stock', href: '/stock', icon: Warehouse }, // Hidden - can be re-enabled later
  { name: 'Outward Challan', href: '/outward-challan', icon: Send },
  { name: 'Tax Invoice', href: '/tax-invoice', icon: Receipt },
];

export default function Navbar() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
                <img 
                  src="/icon.png" 
                  alt="DWPL Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent leading-none">
                  DWPL
                </h1>
                <span className="text-[10px] text-slate-500 hidden md:block mt-1 font-medium tracking-wide">Manufacturing System</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                if (item.children) {
                  const isActive = item.children.some(child => pathname === child.href);
                  const isOpen = openDropdown === item.name;
                  
                  return (
                    <div key={item.name} className="relative">
                      <button
                        onClick={() => setOpenDropdown(isOpen ? null : item.name)}
                        onMouseEnter={() => setOpenDropdown(item.name)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown */}
                      {isOpen && (
                        <div 
                          className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2"
                          onMouseLeave={() => setOpenDropdown(null)}
                        >
                          {item.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  isChildActive
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                                }`}
                                onClick={() => setOpenDropdown(null)}
                              >
                                <child.icon className="w-4 h-4" />
                                {child.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side - could add user menu, notifications, etc. */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden lg:block">
              {new Date().toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
