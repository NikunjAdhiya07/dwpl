import { Document } from 'mongoose';

// ============= MASTER TYPES =============

export interface IPartyMaster extends Document {
  partyName: string;
  address: string;
  gstNumber: string;
  contactNumber: string;
  rate: number; // base rate per unit
  annealingCharge: number; // per unit
  drawCharge: number; // per pass/unit
  annealingMax: number; // max annealing count (0-8)
  drawMax: number; // max draw count (0-10)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IItemMaster extends Document {
  itemCode: string; // Unique identifier for the item (auto-generated)
  category: 'RM' | 'FG';
  size: string; // diameter
  grade: string;
  hsnCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransportMaster extends Document {
  vehicleNumber: string;
  transporterName: string;
  ownerName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBOM extends Document {
  fgSize: string; // Finish Size
  rmSize: string; // Original/Raw Material Size
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface IGSTMaster extends Document {
  hsnCode: string;
  gstPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============= TRANSACTION TYPES =============

export interface IGRNItem {
  rmSize: string; // Item ID
  quantity: number;
  rate: number;
}

export interface IGRN extends Document {
  sendingParty: string; // Party ID
  partyChallanNumber: string;
  items: IGRNItem[]; // Array of items
  totalValue: number;
  grnDate: Date;
  createdAt: Date;
  updatedAt: Date;
}


export interface IStock extends Document {
  category: 'RM' | 'FG';
  size: string; // Item ID reference
  quantity: number;
  lastUpdated: Date;
}

export interface IOutwardChallanItem {
  finishSize: string; // FG Item ID
  originalSize: string; // RM Item ID (from BOM)
  annealingCount: number; // 1-10 (from party master)
  drawPassCount: number; // 1-8 (from party master)
  quantity: number;
  rate: number;
  annealingCharge: number; // auto-calculated from Party Master
  drawCharge: number; // auto-calculated from Party Master
  itemTotal: number; // total for this item
}

export interface IOutwardChallan extends Document {
  challanNumber: string;
  party: string; // Party ID
  items: IOutwardChallanItem[]; // Array of items
  totalAmount: number; // sum of all item totals
  challanDate: Date;
  
  // Transport Details
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string; // e.g., "By Road"
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaxInvoice extends Document {
  invoiceNumber: string;
  irnNumber?: string; // IRN number (optional)
  outwardChallan: string; // Outward Challan ID
  party: string; // Party ID
  finishSize: string;
  originalSize: string;
  annealingCount: number;
  drawPassCount: number;
  quantity: number;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  
  // Additional Invoice Details
  poNumber?: string; // Purchase Order Number
  paymentTerm?: string; // e.g., "0 Days"
  supplierCode?: string; // Supplier Code
  vehicleNumber?: string; // Vehicle No
  transportName?: string; // Transport Name (replaces LR No)
  ownerName?: string; // Owner Name
  eWayBillNo?: string; // E-Way Bill No
  dispatchedThrough?: string; // e.g., "By Road"
  
  // Packing Details
  packingType?: string; // e.g., "KGS", "NOS"
  
  // Amount Breakdown
  baseAmount: number; // Material + Processing charges
  transportCharges?: number; // Transport charges (default: 0)
  assessableValue?: number; // Base + Transport (for GST calculation)
  
  // GST Breakdown
  gstPercentage: number; // Total GST percentage
  cgstPercentage?: number; // CGST percentage (e.g., 9%)
  sgstPercentage?: number; // SGST percentage (e.g., 9%)
  igstPercentage?: number; // IGST percentage (e.g., 0%)
  cgstAmount?: number; // CGST amount
  sgstAmount?: number; // SGST amount
  igstAmount?: number; // IGST amount
  gstAmount: number; // Total GST amount
  
  // TCS (Tax Collected at Source)
  tcsPercentage?: number; // TCS percentage (default: 0%)
  tcsAmount?: number; // TCS amount
  
  totalAmount: number; // Final amount including all taxes
  invoiceDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============= FORM TYPES =============

export type PartyMasterForm = Omit<IPartyMaster, keyof Document | 'createdAt' | 'updatedAt'>;
export type ItemMasterForm = Omit<IItemMaster, keyof Document | 'createdAt' | 'updatedAt'>;
export type TransportMasterForm = Omit<ITransportMaster, keyof Document | 'createdAt' | 'updatedAt'>;
export type BOMForm = Omit<IBOM, keyof Document | 'createdAt' | 'updatedAt'>;
export type GSTMasterForm = Omit<IGSTMaster, keyof Document | 'createdAt' | 'updatedAt'>;
export type GRNForm = Omit<IGRN, keyof Document | 'createdAt' | 'updatedAt' | 'totalValue'>;
export type OutwardChallanForm = Omit<IOutwardChallan, keyof Document | 'createdAt' | 'updatedAt' | 'totalAmount' | 'challanNumber'>;
export type TaxInvoiceForm = Omit<ITaxInvoice, keyof Document | 'createdAt' | 'updatedAt' | 'baseAmount' | 'gstAmount' | 'totalAmount' | 'invoiceNumber'>;
