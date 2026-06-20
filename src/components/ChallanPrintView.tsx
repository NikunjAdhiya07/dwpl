'use client';

import React from 'react';
import { formatIndianCurrency, numberToIndianWords } from '@/lib/numberToWords';
import { getCoilTotalFromEntries } from '@/lib/challanBomUtils';

interface CoilEntry {
  coilNumber?: string;
  coilWeight?: number;
}

interface ChallanItem {
  finishSize: {
    itemCode: string;
    size: string;
    grade: string;
    hsnCode: string;
  };
  originalSize: {
    itemCode: string;
    size: string;
    grade: string;
  };
  processDetails?: string;
  processType?: string;
  issuedChallanNo?: string;
  coilNumber?: string;
  coilReference?: string;
  coilEntries?: CoilEntry[];
  quantity: number;
  rate: number;
  itemTotal: number;
  annealingCount?: number;
  drawPassCount?: number;
}

interface OutwardChallan {
  challanNumber: string;
  challanDate: string;
  party: {
    partyName: string;
    address: string;
    gstNumber: string;
  };
  billTo?: {
    partyName: string;
    address: string;
    gstNumber: string;
  };
  shipTo?: {
    partyName: string;
    address: string;
    gstNumber: string;
  };
  items: ChallanItem[];
  totalAmount: number;
  vehicleNumber?: string;
  vehicles?: { vehicleNumber: string }[];
  transportName?: string;
  eWayBillNo?: string;
}

interface Company {
  companyName: string;
  address: string;
  registeredOffice: string;
  cin: string;
  gstin: string;
  pan?: string;
  state: string;
  stateCode: string;
}

interface ChallanPrintViewProps {
  challan: OutwardChallan;
  company?: Company;
  copyType?: string;
  preparedBy?: string;
  isLastCopy?: boolean;
}

/** Quantity and amount derived from coil entries so print matches the COIL column. */
function getItemQuantity(item: ChallanItem): number {
  const fromCoils = getCoilTotalFromEntries(item.coilEntries);
  if (fromCoils > 0 || item.coilEntries?.length) return fromCoils;
  return item.quantity || 0;
}

function getItemAmount(item: ChallanItem): number {
  return getItemQuantity(item) * (item.rate || 0);
}

/** Row slots consumed by an item (taller rows when many coil entries). */
function getItemSlotCount(item: ChallanItem): number {
  const coilCount =
    item.coilEntries?.filter((c) => c.coilNumber).length ?? (item.coilNumber ? 1 : 0);
  if (coilCount <= 3) return 1;
  return Math.ceil(coilCount / 3);
}

/** Max row slots per page type (accounts for header, party block, totals). */
const FIRST_PAGE_SLOTS = 6;
const CONTINUATION_PAGE_SLOTS = 8;
const LAST_PAGE_SLOTS = 5;
const SINGLE_PAGE_MIN_ROWS = 8;

function paginateItems(items: ChallanItem[]): ChallanItem[][] {
  if (items.length === 0) return [[]];

  const totalSlots = items.reduce((sum, item) => sum + getItemSlotCount(item), 0);
  if (totalSlots <= SINGLE_PAGE_MIN_ROWS && items.length <= SINGLE_PAGE_MIN_ROWS) {
    return [items];
  }

  const pages: ChallanItem[][] = [];
  let idx = 0;

  while (idx < items.length) {
    const remaining = items.slice(idx);
    const remainingSlots = remaining.reduce((sum, item) => sum + getItemSlotCount(item), 0);
    const isFirst = pages.length === 0;

    if (remainingSlots <= LAST_PAGE_SLOTS) {
      pages.push(remaining);
      break;
    }

    const capacity = isFirst ? FIRST_PAGE_SLOTS : CONTINUATION_PAGE_SLOTS;
    const page: ChallanItem[] = [];
    let used = 0;

    for (let i = 0; i < remaining.length; i++) {
      const need = getItemSlotCount(remaining[i]);
      if (used + need > capacity && page.length > 0) break;

      page.push(remaining[i]);
      used += need;

      const leftSlots = remaining
        .slice(i + 1)
        .reduce((sum, item) => sum + getItemSlotCount(item), 0);
      if (leftSlots > 0 && leftSlots <= LAST_PAGE_SLOTS) break;
    }

    pages.push(page);
    idx += page.length;
  }

  return pages;
}

function CoilCell({ item }: { item: ChallanItem }) {
  const entries = item.coilEntries?.filter((c) => c.coilNumber);
  if (entries && entries.length > 0) {
    return (
      <div className="text-[9px] leading-snug">
        {entries.map((c, ci) => (
          <p key={ci} className="font-medium">
            {c.coilNumber}
            {c.coilWeight ? `–${(c.coilWeight || 0).toFixed(0)} kg` : ''}
          </p>
        ))}
      </div>
    );
  }
  if (item.coilNumber || item.coilReference) {
    return (
      <>
        {item.coilNumber && <p className="font-medium text-[9px]">{item.coilNumber}</p>}
        {item.coilReference && <p className="text-[8px] text-gray-500">{item.coilReference}</p>}
      </>
    );
  }
  return <>-</>;
}

function ItemRow({ item, serialNo }: { item: ChallanItem; serialNo: number }) {
  return (
    <tr className="border-b border-black" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <td className="border-r border-black px-1 py-3 text-center align-top">{serialNo}</td>
      <td className="border-r border-black px-2 py-3 align-top">
        <p className="font-bold text-[11px]">{item.finishSize.size || item.finishSize.itemCode || '—'}</p>
        {item.finishSize.itemCode && (
          <p className="text-[9px] text-gray-500 mt-0.5">{item.finishSize.itemCode}</p>
        )}
      </td>
      <td className="border-r border-black px-2 py-3 align-top">
        <p className="text-[10px] font-semibold">{item.originalSize.size || item.originalSize.itemCode || '—'}</p>
        {item.originalSize.itemCode && (
          <p className="text-[9px] text-gray-500 mt-0.5">{item.originalSize.itemCode}</p>
        )}
      </td>
      <td className="border-r border-black px-2 py-3 text-center align-top">
        <p className="font-semibold">{item.finishSize.grade}</p>
      </td>
      <td className="border-r border-black px-2 py-3 text-center align-top">
        <CoilCell item={item} />
      </td>
      <td className="border-r border-black px-2 py-3 text-center align-top uppercase">
        <div className="text-[10px] font-semibold leading-tight">
          {item.processType || item.processDetails || '-'}
          {item.annealingCount ? ` + ${item.annealingCount}A` : ''}
          {item.drawPassCount ? ` + ${item.drawPassCount}D` : ''}
        </div>
      </td>
      <td className="border-r border-black px-2 py-3 text-center align-top">{item.issuedChallanNo || '-'}</td>
      <td className="border-r border-black px-2 py-3 text-center align-top font-bold">{getItemQuantity(item).toFixed(2)}</td>
      <td className="border-r border-black px-2 py-3 text-center align-top">{item.rate.toFixed(2)}</td>
      <td className="px-2 py-3 text-right align-top font-bold">{formatIndianCurrency(getItemAmount(item))}</td>
    </tr>
  );
}

function EmptyRow() {
  return (
    <tr className="border-b border-black h-[32px]">
      <td className="border-r border-black px-1 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="border-r border-black px-2 py-2" />
      <td className="px-2 py-2" />
    </tr>
  );
}

function TableHeader() {
  return (
    <thead>
      <tr className="border-b border-black font-bold bg-gray-50">
        <th className="border-r border-black px-1 py-2 w-[40px] text-center">Sr. No.</th>
        <th className="border-r border-black px-2 py-2 text-left">Description (Finish Size)</th>
        <th className="border-r border-black px-2 py-2 text-left w-[50px]">RM</th>
        <th className="border-r border-black px-2 py-2 text-center w-[70px]">Wire Grade</th>
        <th className="border-r border-black px-2 py-2 text-center w-[120px]">COIL</th>
        <th className="border-r border-black px-2 py-2 text-center w-[80px]">Process</th>
        <th className="border-r border-black px-2 py-2 text-center w-[90px]">Issued Challan No.</th>
        <th className="border-r border-black px-2 py-2 text-center w-[60px]">Qty</th>
        <th className="border-r border-black px-2 py-2 text-center w-[60px]">Rate</th>
        <th className="px-2 py-2 text-right w-[90px]">Amount</th>
      </tr>
    </thead>
  );
}

const ChallanPrintView: React.FC<ChallanPrintViewProps> = ({
  challan,
  company,
  copyType = 'Original',
  preparedBy = '',
  isLastCopy = true,
}) => {
  const printedVehicle =
    challan.vehicleNumber ||
    (challan.vehicles && challan.vehicles.length > 0
      ? challan.vehicles.map((v) => v.vehicleNumber).filter(Boolean).join(', ')
      : '');

  const companyData: Company = company || {
    companyName: 'Drawell Wires Pvt. Ltd.',
    address: "S'nagar–Lakhtar Highway, At. Zamar\nDist. Surendranagar",
    registeredOffice: 'Plot No. 1005/B1, Phase-III, GIDC, Wadhwan',
    cin: 'U27100GJ2020PTC118828',
    gstin: '24AAECL4523G1ZT',
    pan: '',
    state: 'Gujarat',
    stateCode: '24',
  };

  const pages = paginateItems(challan.items);
  const totalQty = challan.items.reduce((sum, item) => sum + getItemQuantity(item), 0);
  const computedTotalAmount = challan.items.reduce((sum, item) => sum + getItemAmount(item), 0);

  return (
    <>
      {pages.map((pageItems, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;
        const isOnlyPage = pages.length === 1;
        const globalStartIdx = pages.slice(0, pageIdx).reduce((sum, p) => sum + p.length, 0);
        const needsPageBreak = !(isLastPage && isLastCopy);

        const emptyRowsCount =
          isLastPage && isOnlyPage
            ? Math.max(0, SINGLE_PAGE_MIN_ROWS - pageItems.length)
            : isLastPage
              ? Math.max(0, SINGLE_PAGE_MIN_ROWS - pageItems.length)
              : 0;

        return (
          <div
            key={`${copyType}-page-${pageIdx}`}
            className="print-page bg-white text-black font-sans p-[10mm] w-[210mm] box-border mx-auto border border-gray-200 flex flex-col"
            style={{
              minHeight: '297mm',
              boxSizing: 'border-box',
              pageBreakAfter: needsPageBreak ? 'always' : 'auto',
              breakAfter: needsPageBreak ? 'page' : 'auto',
            }}
          >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6">
              <div className="w-[45%] text-[11px] leading-snug">
                <p className="font-bold text-[16px] mb-1">{companyData.companyName}</p>
                <p className="whitespace-pre-line text-gray-700">{companyData.address}</p>
                <div className="mt-2 space-y-0.5">
                  <p>
                    <span className="font-semibold text-gray-600">Reg. Off.:</span>{' '}
                    {companyData.registeredOffice}
                  </p>
                  <p className="text-[10px]">
                    <span className="font-semibold text-gray-600">CIN:</span> {companyData.cin}
                  </p>
                  <p className="text-[10px]">
                    <span className="font-semibold text-gray-600">GSTIN/UIN:</span> {companyData.gstin}
                  </p>
                  <p className="text-[10px]">
                    <span className="font-semibold text-gray-600">State Name:</span> {companyData.state}, Code:{' '}
                    {companyData.stateCode}
                  </p>
                </div>
              </div>
              <div className="w-[30%] text-center pt-2">
                <p className="text-[14px] font-bold uppercase tracking-[0.2em] mb-1">Delivery</p>
                <h1 className="text-[24px] font-bold underline uppercase tracking-wider leading-none">Challan</h1>
                {pages.length > 1 && (
                  <p className="text-[9px] text-gray-500 mt-1">
                    Page {pageIdx + 1} of {pages.length}
                  </p>
                )}
              </div>
              <div className="w-[25%] text-right text-[12px] pt-1">
                <p className="font-bold text-gray-600">({copyType})</p>
              </div>
            </div>

            <div className="border border-black flex-1 flex flex-col">
              {/* Party & Transport Details Section */}
              <div className="flex border-b border-black">
                <div className="flex-1 border-r border-black p-2 min-h-[120px]">
                  <div className="mb-3">
                    <p className="font-bold underline text-[10px] mb-1 uppercase">Bill To:</p>
                    <p className="font-bold text-[12px]">
                      {challan.billTo?.partyName || challan.party?.partyName || ''}
                    </p>
                    <p className="text-[11px] whitespace-pre-line">
                      {challan.billTo?.address || challan.party?.address || ''}
                    </p>
                    <p className="text-[11px] font-bold mt-1">
                      GSTIN: {challan.billTo?.gstNumber || challan.party?.gstNumber || ''}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold underline text-[10px] mb-1 uppercase">Ship To:</p>
                    <p className="font-bold text-[12px]">
                      {challan.shipTo?.partyName || challan.party?.partyName || ''}
                    </p>
                    <p className="text-[11px] whitespace-pre-line">
                      {challan.shipTo?.address || challan.party?.address || ''}
                    </p>
                    <p className="text-[11px] font-bold mt-1">
                      GSTIN: {challan.shipTo?.gstNumber || challan.party?.gstNumber || ''}
                    </p>
                  </div>
                </div>

                <div className="w-[40%] p-2">
                  <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                    <div className="font-bold">Challan No:</div>
                    <div>{challan.challanNumber}</div>

                    <div className="font-bold">Challan Date:</div>
                    <div>{new Date(challan.challanDate).toLocaleDateString('en-IN')}</div>

                    <div className="font-bold">Vehicle No:</div>
                    <div>{printedVehicle || '-'}</div>

                    <div className="font-bold">Transporter:</div>
                    <div>{challan.transportName || '-'}</div>

                    <div className="font-bold">E-Way Bill No:</div>
                    <div>{challan.eWayBillNo || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Item Details Table */}
              <table className="w-full border-collapse text-[10px]">
                <TableHeader />
                <tbody>
                  {pageItems.map((item, index) => (
                    <ItemRow key={`${globalStartIdx + index}`} item={item} serialNo={globalStartIdx + index + 1} />
                  ))}

                  {isLastPage &&
                    Array.from({ length: emptyRowsCount }).map((_, i) => (
                      <EmptyRow key={`empty-${i}`} />
                    ))}

                  {isLastPage && (
                    <tr className="border-b-0 bg-gray-50 font-bold">
                      <td colSpan={7} className="border-r border-black px-2 py-2 text-right">
                        Total Qty :
                      </td>
                      <td className="border-r border-black px-2 py-2 text-center text-[11px] text-black">
                        {totalQty.toFixed(2)}
                      </td>
                      <td className="border-r border-black px-2 py-2" />
                      <td className="px-2 py-2 text-right" />
                    </tr>
                  )}
                </tbody>
              </table>

              {isLastPage && (
                <>
                  {/* Summary Section */}
                  <div className="flex border-t border-black">
                    <div className="w-[60%] border-r border-black flex flex-col">
                      <div className="p-3 border-b border-black flex-1 flex flex-col justify-center">
                        <p className="italic text-[9px] leading-tight text-gray-600 mb-1">Rupees in words:</p>
                        <p className="italic font-semibold text-[10px] leading-tight uppercase">
                          Rs. {numberToIndianWords(computedTotalAmount)} ONLY
                        </p>
                      </div>
                    </div>
                    <div className="w-[40%] text-[9px]">
                      <div className="grid grid-cols-[1fr_90px] divide-x divide-black border-collapse h-full">
                        <div className="p-2 border-b border-black flex items-center font-bold">Total Items :</div>
                        <div className="p-2 border-b border-black text-right flex items-center justify-end font-bold">
                          {challan.items.length}
                        </div>

                        <div className="p-2 border-b border-black flex items-center">Taxable Value :</div>
                        <div className="p-2 border-b border-black text-right flex items-center justify-end">
                          {formatIndianCurrency(computedTotalAmount)}
                        </div>

                        <div className="p-2 font-bold bg-slate-50 flex items-center text-[11px]">Total Amount :</div>
                        <div className="p-2 text-right font-bold bg-slate-50 flex items-center justify-end text-[11px]">
                          {formatIndianCurrency(computedTotalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {isLastPage && (
              <div
                className="mt-3"
                style={{ breakInside: 'avoid', pageBreakInside: 'avoid', breakBefore: 'avoid' }}
              >
                <div className="flex justify-between items-end">
                  <div className="w-1/3">
                    <div className="border-t border-black pt-1 w-2/3 text-center text-[11px]">
                      <p className="font-bold">Prepared By:</p>
                      {preparedBy && <p className="text-[10px] text-gray-700 mt-0.5">{preparedBy}</p>}
                    </div>
                  </div>
                  <div className="w-1/3">
                    <div className="border-t border-black pt-1 w-2/3 mx-auto text-center text-[11px]">
                      <p className="font-bold">Verified By:</p>
                    </div>
                  </div>
                  <div className="w-1/3 text-right">
                    <div className="inline-block text-center text-[11px]">
                      <p className="mb-6 font-bold">Authorized Signature</p>
                      <div className="border-t border-black pt-1">
                        <p className="font-bold">(For {companyData.companyName})</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[9px] italic text-gray-500 text-center">
                  <p>This is a computer generated delivery challan and does not require a physical signature.</p>
                  <p>Subject to Surendranagar Jurisdiction.</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default ChallanPrintView;
