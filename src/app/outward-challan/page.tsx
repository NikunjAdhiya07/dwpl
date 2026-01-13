'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ItemSelector from '@/components/ItemSelector';
import { Plus, X, Send, AlertCircle, Edit, Trash2, Minus, Download } from 'lucide-react';
import { exportMultiPageToPDF, generatePDFFilename } from '@/lib/pdfExport';
import { numberToIndianWords, formatIndianCurrency } from '@/lib/numberToWords';

interface Party {
  _id: string;
  partyName: string;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  annealingMax: number;
  drawMax: number;
}

interface Item {
  _id: string;
  itemCode: string;
  size: string;
  grade: string;
  category: 'FG' | 'RM';
}

interface Transport {
  _id: string;
  vehicleNumber: string;
  transporterName: string;
  ownerName: string;
}

interface BOM {
  _id: string;
  fgSize: string;
  rmSize: string;
  grade: string;
  annealingMin: number;
  annealingMax: number;
  drawPassMin: number;
  drawPassMax: number;
  status?: 'Active' | 'Inactive';
}

interface Stock {
  _id: string;
  category: 'RM' | 'FG';
  size: string; // Item ID
  quantity: number;
}

interface ChallanItem {
  finishSize: string;
  originalSize: string;
  annealingCount: number;
  drawPassCount: number;
  quantity: number;
  rate: number;
  annealingCharge: number;
  drawCharge: number;
  itemTotal: number;
}

interface OutwardChallan {
  _id: string;
  challanNumber: string;
  party: {
    _id: string;
    partyName: string;
    address: string;
    gstNumber: string;
    contactNumber: string;
    rate: number;
    annealingCharge: number;
    drawCharge: number;
    annealingMax: number;
    drawMax: number;
  };
  items: {
    finishSize: {
      _id: string;
      itemCode: string;
      size: string;
      grade: string;
      hsnCode: string;
      category: string;
    };
    originalSize: {
      _id: string;
      itemCode: string;
      size: string;
      grade: string;
      hsnCode: string;
      category: string;
    };
    annealingCount: number;
    drawPassCount: number;
    quantity: number;
    rate: number;
    annealingCharge: number;
    drawCharge: number;
    itemTotal: number;
  }[];
  totalAmount: number;
  challanDate: string;
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string;
  createdAt: string;
}

interface ChallanForm {
  party: string;
  items: ChallanItem[];
  challanDate: string;
  vehicleNumber?: string;
  transportName?: string;
  ownerName?: string;
  dispatchedThrough?: string;
}

export default function OutwardChallanPage() {
  const [challans, setChallans] = useState<OutwardChallan[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [fgItems, setFgItems] = useState<Item[]>([]);
  const [rmItems, setRmItems] = useState<Item[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [editingChallan, setEditingChallan] = useState<OutwardChallan | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState<OutwardChallan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<ChallanForm>({
    party: '',
    items: [],
    challanDate: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    transportName: '',
    ownerName: '',
    dispatchedThrough: 'By Road',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.party) {
      const party = parties.find((p) => p._id === formData.party);
      setSelectedParty(party || null);
    }
  }, [formData.party, parties]);

  const fetchData = async () => {
    try {
      const [challansRes, partiesRes, fgRes, rmRes, bomsRes, transportsRes, stocksRes] = await Promise.all([
        fetch('/api/outward-challan'),
        fetch('/api/party-master'),
        fetch('/api/item-master?category=FG'),
        fetch('/api/item-master?category=RM'),
        fetch('/api/bom'),
        fetch('/api/transport-master'),
        fetch('/api/stock?category=RM'),
      ]);

      const [challansData, partiesData, fgData, rmData, bomsData, transportsData, stocksData] = await Promise.all([
        challansRes.json(),
        partiesRes.json(),
        fgRes.json(),
        rmRes.json(),
        bomsRes.json(),
        transportsRes.json(),
        stocksRes.json(),
      ]);

      if (challansData.success) setChallans(challansData.data);
      if (partiesData.success) setParties(partiesData.data);
      if (fgData.success) setFgItems(fgData.data);
      if (rmData.success) setRmItems(rmData.data);
      if (bomsData.success) setBoms(bomsData.data);
      if (transportsData.success) setTransports(transportsData.data);
      if (stocksData.success) setStocks(stocksData.data);
      
      if (!partiesData.success || partiesData.data.length === 0) {
        console.warn('No parties found. Please add parties first.');
      }
      if (!fgData.success || fgData.data.length === 0) {
        console.warn('No FG items found. Please add FG items first.');
      }
      if (!rmData.success || rmData.data.length === 0) {
        console.warn('No RM items found. Please add RM items first.');
      }
      if (!bomsData.success || bomsData.data.length === 0) {
        console.warn('No BOMs found. Please add BOM entries first.');
      }
      if (!stocksData.success || stocksData.data.length === 0) {
        console.warn('No stock data found.');
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(`Failed to load data: ${err.message}. Please refresh the page.`);
    } finally {
      setLoading(false);
    }
  };

  const getStockForItem = (itemId: string) => {
    const stock = stocks.find((s) => s.size === itemId);
    return stock ? stock.quantity : 0;
  };

  const addItem = () => {
    if (!selectedParty) {
      setError('Please select a party first');
      return;
    }

    const newItem: ChallanItem = {
      finishSize: '',
      originalSize: '',
      annealingCount: 0,
      drawPassCount: 0,
      quantity: 0,
      rate: selectedParty.rate,
      annealingCharge: selectedParty.annealingCharge,
      drawCharge: selectedParty.drawCharge,
      itemTotal: 0,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof ChallanItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If finishSize (FG) is selected, automatically fetch originalSize (RM) from BOM
    if (field === 'finishSize' && value) {
      // Find the FG item object to get its size string
      const fgItem = fgItems.find(item => item._id === value);
      if (fgItem) {
        // Find BOM entry where fgSize matches FG item's size
        const bom = boms.find((b) => b.fgSize === fgItem.size);
        if (bom) {
          // Find RM item object where size matches BOM's rmSize
          const rmItem = rmItems.find(item => item.size === bom.rmSize);
          if (rmItem) {
            newItems[index].originalSize = rmItem._id;
            console.log(`✅ Auto-filled RM: ${rmItem.size} based on FG: ${fgItem.size}`);
          }
        }
      }
    }

    // If originalSize (RM) is selected, automatically fetch finishSize (FG) from BOM
    if (field === 'originalSize' && value) {
      // Find the RM item object to get its size string
      const rmItem = rmItems.find(item => item._id === value);
      if (rmItem) {
        // Find FIRST BOM entry where rmSize matches RM item's size
        const bom = boms.find((b) => b.rmSize === rmItem.size);
        if (bom) {
          // Find FG item object where size matches BOM's fgSize
          const fgItem = fgItems.find(item => item.size === bom.fgSize);
          if (fgItem) {
            newItems[index].finishSize = fgItem._id;
            console.log(`✅ Auto-filled FG: ${fgItem.size} based on RM: ${rmItem.size}`);
          }
        }
      }
    }
    
    // Recalculate item total
    const item = newItems[index];
    const baseAmount = item.quantity * item.rate;
    const annealingTotal = item.annealingCharge * item.quantity * item.annealingCount;
    const drawTotal = item.drawCharge * item.quantity * item.drawPassCount;
    item.itemTotal = baseAmount + annealingTotal + drawTotal;
    
    setFormData({ ...formData, items: newItems });
  };

  const handleTransportSelect = (transportId: string) => {
    const transport = transports.find((t) => t._id === transportId);
    if (transport) {
      setFormData({
        ...formData,
        vehicleNumber: transport.vehicleNumber,
        transportName: transport.transporterName,
        ownerName: transport.ownerName,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.party) {
      setError('Please select a party');
      return;
    }
    
    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    // Validate each item
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.finishSize) {
        setError(`Item ${i + 1}: Please select a finish size (FG)`);
        return;
      }
      if (!item.originalSize) {
        setError(`Item ${i + 1}: Please select an original size (RM)`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Item ${i + 1}: Please enter a valid quantity greater than 0`);
        return;
      }
      if (item.rate < 0) {
        setError(`Item ${i + 1}: Please enter a valid rate (cannot be negative)`);
        return;
      }
    }

    try {
      const challanData = {
        ...formData,
      };
      
      console.log('Submitting challan data:', challanData);

      let response;
      
      if (editingChallan) {
        response = await fetch(`/api/outward-challan/${editingChallan._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(challanData),
        });
      } else {
        response = await fetch('/api/outward-challan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(challanData),
        });
      }

      const data = await response.json();
      
      console.log('API Response:', data);

      if (data.success) {
        await fetchData();
        resetForm();
        alert(editingChallan 
          ? 'Outward Challan updated successfully!' 
          : 'Outward Challan created successfully! Stock has been updated.'
        );
      } else {
        const errorMsg = data.error || 'Failed to create/update challan';
        console.error('API Error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      party: '',
      items: [],
      challanDate: new Date().toISOString().split('T')[0],
      vehicleNumber: '',
      transportName: '',
      ownerName: '',
      dispatchedThrough: 'By Road',
    });
    setSelectedParty(null);
    setShowForm(false);
    setEditingChallan(null);
  };

  const handleEdit = (challan: OutwardChallan) => {
    setEditingChallan(challan);
    setFormData({
      party: challan.party._id,
      items: challan.items.map(item => ({
        finishSize: item.finishSize._id,
        originalSize: item.originalSize._id,
        annealingCount: item.annealingCount,
        drawPassCount: item.drawPassCount,
        quantity: item.quantity,
        rate: item.rate,
        annealingCharge: item.annealingCharge,
        drawCharge: item.drawCharge,
        itemTotal: item.itemTotal,
      })),
      challanDate: new Date(challan.challanDate).toISOString().split('T')[0],
      vehicleNumber: challan.vehicleNumber || '',
      transportName: challan.transportName || '',
      ownerName: challan.ownerName || '',
      dispatchedThrough: challan.dispatchedThrough || 'By Road',
    });
    setSelectedParty(parties.find(p => p._id === challan.party._id) || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (challan: OutwardChallan) => {
    setChallanToDelete(challan);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!challanToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/outward-challan/${challanToDelete._id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchData();
        setShowDeleteConfirm(false);
        setChallanToDelete(null);
        alert('Challan deleted successfully!');
      } else {
        setError(data.error || 'Failed to delete challan');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePDFExport = async (challan: OutwardChallan) => {
    try {
      // Create temporary hidden container
      const tempContainer = document.createElement('div');
      tempContainer.id = 'temp-challan-print';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.background = 'white';
      document.body.appendChild(tempContainer);

      // Create a React root and render
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempContainer);

      // Render all three copies
      await new Promise<void>((resolve) => {
        root.render(
          <div style={{ background: 'white' }}>
            {['Original For Recipient', 'Duplicate', 'Triplicate'].map((copyType, copyIndex) => (
              <div 
                key={copyType} 
                className="print-page"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '7mm',
                  margin: 0,
                  background: 'white',
                  boxSizing: 'border-box',
                  pageBreakAfter: copyIndex < 2 ? 'always' : 'auto',
                  position: 'relative'
                }}
              >
                <div className="bg-white text-black font-sans w-full" style={{ fontSize: '9px' }}>
                  {/* Top Header Labels */}
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex-1 text-center font-bold text-sm translate-x-10">
                      Delivery Challan
                    </div>
                    <div className="text-[10px] font-bold italic">
                      ({copyType})
                    </div>
                  </div>

                  {/* Main Invoice Border Box */}
                  <div className="border border-black">
                    {/* Company and Meta Info Row */}
                    <div className="flex border-b border-black">
                      {/* Left: Supplier Details */}
                      <div className="w-[55%] p-2 border-r border-black flex flex-col min-h-[110px]">
                        <p className="font-bold text-[11px] mb-1 leading-none uppercase">PINNACLE FASTENER</p>
                        <p className="leading-tight">Plot No. 1005/B1, Phase-III, G.I.D.C.,</p>
                        <p className="leading-tight">Wadhwancity, Surendranagar, Gujarat, India - 363035</p>
                        <p className="mt-2"><strong>GSTIN :</strong> 24AAQCP2416F1ZD</p>
                        <p><strong>PAN No :</strong> AAQCP2416F</p>
                        <div className="flex gap-4">
                          <span>State : Gujarat</span>
                          <span>State Code : 24</span>
                        </div>
                      </div>

                      {/* Right: Challan Meta */}
                      <div className="w-[45%] p-2 flex flex-col space-y-0.5">
                        <div className="grid grid-cols-[100px_1fr] leading-none">
                          <span className="font-bold">CHALLAN No :</span>
                          <span className="font-bold">{challan.challanNumber}</span>
                          
                          <span className="font-bold">Date :</span>
                          <span className="font-bold">{new Date(challan.challanDate).toLocaleDateString('en-IN')}</span>
                          
                          {challan.transportName && (
                            <>
                              <span>Transport Name:</span>
                              <span className="break-all">{challan.transportName}</span>
                            </>
                          )}
                          
                          {challan.vehicleNumber && (
                            <>
                              <span>Vehicle No :</span>
                              <span>{challan.vehicleNumber}</span>
                            </>
                          )}
                          
                          {challan.ownerName && (
                            <>
                              <span>Owner Name :</span>
                              <span>{challan.ownerName}</span>
                            </>
                          )}
                          
                          <span>Dispatched Through:</span>
                          <span>
                            {challan.dispatchedThrough || 'By Road'}
                            {(challan.transportName || challan.ownerName) && 
                              ` / ${challan.transportName || challan.ownerName}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Parties Section */}
                    <div className="flex border-b border-black">
                      <div className="w-1/2 p-2 border-r border-black min-h-[85px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Receiver (Billed To)</p>
                        <p className="font-bold text-[10px] uppercase">{challan.party.partyName}</p>
                        <p className="leading-tight">{challan.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {challan.party.gstNumber}</p>
                        <p>State Code : 24 Gujarat</p>
                      </div>
                      <div className="w-1/2 p-2 min-h-[85px] flex flex-col">
                        <p className="font-bold underline mb-1 text-[8px]">Details of Consignee (Shipped To)</p>
                        <p className="font-bold text-[10px] uppercase">{challan.party.partyName}</p>
                        <p className="leading-tight">{challan.party.address}</p>
                        <p className="mt-auto font-bold pt-1">GSTIN : {challan.party.gstNumber}</p>
                        <p>State Code: 24 Gujarat</p>
                      </div>
                    </div>

                    {/* Table Section */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-black text-center font-bold">
                          <td className="border-r border-black w-[35px] py-1">Sr.<br/>No.</td>
                          <td className="border-r border-black px-1">Description</td>
                          <td className="border-r border-black w-[60px]">Process<br/>Details</td>
                          <td className="border-r border-black w-[70px] py-1">Quantity<br/>Kgs</td>
                          <td className="border-r border-black w-[70px] py-1">Rate Per<br/>Unit</td>
                          <td className="w-[85px] py-1">Amount<br/>Rs.</td>
                        </tr>
                      </thead>
                      <tbody>
                        {challan.items.map((item, index) => (
                          <tr key={index} className="border-b border-black align-top">
                            <td className="border-r border-black py-2 text-center font-bold">{index + 1}</td>
                            <td className="border-r border-black p-2">
                              <p className="font-bold text-[10px] mb-1">
                                FG: {item.finishSize.itemCode} - {item.finishSize.size} - {item.finishSize.grade}
                              </p>
                              <p className="text-[9px] mb-1">
                                RM: {item.originalSize.itemCode} - {item.originalSize.size} - {item.originalSize.grade}
                              </p>
                              <p className="text-[8px] text-slate-600">
                                HSN: {item.finishSize.hsnCode}
                              </p>
                            </td>
                            <td className="border-r border-black py-2 px-1 text-[8px]">
                              <p>Annealing: {item.annealingCount}</p>
                              <p>Draw: {item.drawPassCount}</p>
                              <p className="mt-1 text-[7px] text-slate-600">
                                Ann Chg: ₹{item.annealingCharge}
                              </p>
                              <p className="text-[7px] text-slate-600">
                                Draw Chg: ₹{item.drawCharge}
                              </p>
                            </td>
                            <td className="border-r border-black py-2 text-center font-bold">
                              {item.quantity.toFixed(2)}
                            </td>
                            <td className="border-r border-black py-2 text-center">
                              {item.rate.toFixed(2)}
                            </td>
                            <td className="py-2 px-1 text-right font-bold">{item.itemTotal.toFixed(2)}</td>
                          </tr>
                        ))}
                        {/* Empty rows to fill space if needed */}
                        {challan.items.length < 5 && Array.from({ length: 5 - challan.items.length }).map((_, i) => (
                          <tr key={`empty-${i}`} className="border-b border-black" style={{ height: '40px' }}>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Summary Row */}
                    <div className="flex border-b border-black">
                      <div className="w-[60%] border-r border-black">
                        <div className="p-2 border-b border-black min-h-[35px] flex items-center">
                          <p className="italic text-[8px] leading-tight">Rs. {numberToIndianWords(challan.totalAmount)}</p>
                        </div>
                        <div className="p-2 border-b border-black">
                          <p className="font-bold text-[8px] leading-tight">Net Total Rs {numberToIndianWords(challan.totalAmount)}</p>
                        </div>
                        <div className="p-2 font-bold text-[9px] flex items-center">
                          Net Payable : {formatIndianCurrency(challan.totalAmount)}
                        </div>
                      </div>
                      <div className="w-[40%] text-[8.5px]">
                        <div className="grid grid-cols-[1fr_80px] divide-x divide-black border-collapse">
                          <span className="p-1 px-2 border-b border-black font-bold">Total Items:</span>
                          <span className="p-1 px-2 border-b border-black text-right font-bold">{challan.items.length}</span>
                          
                          <span className="p-1 px-2 border-b border-black font-bold">Total Qty:</span>
                          <span className="p-1 px-2 border-b border-black text-right font-bold">
                            {challan.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)} Kgs
                          </span>
                          
                          <span className="p-1 px-2 font-bold" style={{ backgroundColor: '#f8fafc' }}>Net Payable :</span>
                          <span className="p-1 px-2 text-right font-bold" style={{ backgroundColor: '#f8fafc' }}>{formatIndianCurrency(challan.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Declaration */}
                    <div className="p-2 border-b border-black text-[7.5px] leading-tight text-justify">
                      <p>This is a job work invoice for processing services provided. The materials mentioned above have been processed as per the specifications and returned to the party. This document serves as proof of job work completion and should be retained for record purposes.</p>
                      <p className="mt-1 font-bold">Date & time of Issue : {(() => {
                        const date = new Date();
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        let hours = date.getHours();
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12 || 12;
                        const hoursStr = String(hours).padStart(2, '0');
                        return `${day}/${month}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
                      })()}</p>
                    </div>

                    {/* Signature Block */}
                    <div className="flex min-h-[70px] divide-x divide-black">
                      <div className="w-[35%] p-2">
                        <p className="text-[7.5px] font-bold">(Customer's Seal and Signature)</p>
                      </div>
                      <div className="w-[65%] flex flex-col justify-between">
                        <div className="text-right p-2 font-bold text-[10px]">
                          For PINNACLE FASTENER
                        </div>
                        <div className="flex border-t border-black text-[8px] font-bold divide-x divide-black h-[25px] items-center">
                          <span className="px-2 flex-1">Prepared By : Himesh Trivedi</span>
                          <span className="px-2 flex-1">Verified By :</span>
                          <span className="px-2 flex-1 text-right">Authorised Signatory</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Footer */}
                  <div className="text-center font-bold text-[8px] mt-1 italic">
                    <p>(SUBJECT TO SURENDRANAGAR JURISDICTION)</p>
                    <p>(This is Computer Generated Invoice)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
        
        // Wait for render to complete
        setTimeout(() => {
          try {
            // Pre-sanitize the temp container
            const colorFnRegex = /(lab|oklch|oklab|color)\s*\([^)]*\)/gi;
            const styleTags = tempContainer.getElementsByTagName('style');
            for (let i = 0; i < styleTags.length; i++) {
              const tag = styleTags[i];
              if (tag.textContent && (tag.textContent.includes('lab(') || tag.textContent.includes('oklch(') || tag.textContent.includes('oklab(') || tag.textContent.includes('color('))) {
                tag.textContent = tag.textContent.replace(colorFnRegex, 'white');
              }
            }

            const allElements = tempContainer.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              const styleStr = el.getAttribute('style');
              if (styleStr && colorFnRegex.test(styleStr)) {
                el.setAttribute('style', styleStr.replace(colorFnRegex, 'white'));
              }
            }
            resolve();
          } catch (e) {
            console.error('Error during pre-sanitization:', e);
            resolve();
          }
        }, 500);
      });

      // Generate PDF
      const filename = generatePDFFilename('Challan', challan.challanNumber, challan.challanDate);
      await exportMultiPageToPDF('temp-challan-print', filename, { scale: 2 });

      // Clean up
      root.unmount();
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    } catch (error: any) {
      console.error('Failed to export PDF:', error);
      alert(`Failed to export PDF: ${error.message || 'Unknown error'}. Please check console for details.`);
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.itemTotal, 0);
  };

  if (loading) {
    return <Loading message="Loading outward challan data..." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Outward Challan"
        description="Create production challans with multiple items"
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Create Challan
            </button>
          )
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {editingChallan ? `Edit Challan - ${editingChallan.challanNumber}` : 'Create Outward Challan'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Party and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ItemSelector
                label="Party"
                value={formData.party}
                onChange={(value) => setFormData({ ...formData, party: value })}
                items={parties}
                placeholder="Select Party"
                required
                helperText={
                  selectedParty
                    ? `Annealing Max: ${selectedParty.annealingMax} | Draw Max: ${selectedParty.drawMax}`
                    : undefined
                }
                renderSelected={(party) => (
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {party.partyName}
                  </span>
                )}
                renderOption={(party) => (
                  <div>
                    <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {party.partyName}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Annealing: ₹{party.annealingCharge}/unit | Draw: ₹{party.drawCharge}/pass
                    </div>
                  </div>
                )}
                getSearchableText={(party) => party.partyName}
              />

              <div>
                <label className="label">Challan Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.challanDate}
                  onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Transport Details */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-purple-900">Transport Details (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Select Transport</label>
                  <select
                    className="input"
                    onChange={(e) => handleTransportSelect(e.target.value)}
                    value=""
                  >
                    <option value="">-- Select Transport --</option>
                    {transports.map((transport) => (
                      <option key={transport._id} value={transport._id}>
                        {transport.vehicleNumber} - {transport.transporterName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Vehicle Number</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.vehicleNumber || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleNumber: e.target.value })
                    }
                    placeholder="e.g., GJ01AB1234"
                  />
                </div>

                <div>
                  <label className="label">Transporter Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.transportName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, transportName: e.target.value })
                    }
                    placeholder="e.g., ABC Transport"
                  />
                </div>

                <div>
                  <label className="label">Owner Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.ownerName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerName: e.target.value })
                    }
                    placeholder="e.g., John Doe"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-sm btn-primary"
                  disabled={!selectedParty}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No items added yet. Click "Add Item" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-700">Item {index + 1}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Annealing: ₹{item.annealingCharge}/unit | Draw: ₹{item.drawCharge}/pass
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FG Selection */}
                        <div className="space-y-1">
                          <ItemSelector
                            label="Finish Size (FG)"
                            value={item.finishSize}
                            onChange={(value) => updateItem(index, 'finishSize', value)}
                            items={fgItems}
                            placeholder="Select FG Size"
                            required
                          renderSelected={(fgItem) => (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {fgItem.itemCode}
                              </span>
                              <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                {fgItem.size}
                              </span>
                              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {fgItem.grade}
                              </span>
                            </div>
                          )}
                          renderOption={(fgItem) => (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  {fgItem.itemCode}
                                </span>
                                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                  {fgItem.size} - {fgItem.grade}
                                </span>
                              </div>
                            </div>
                          )}
                          getSearchableText={(fgItem) => 
                            `${fgItem.itemCode} ${fgItem.size} ${fgItem.grade}`
                          }
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Select finish size – Original size will be auto-filled from BOM
                        </p>
                      </div>

                        {/* RM Selection */}
                        <div className="space-y-1">
                          <ItemSelector
                            label="Original Size (RM)"
                            value={item.originalSize}
                            onChange={(value) => updateItem(index, 'originalSize', value)}
                            items={rmItems}
                            placeholder="Select RM Size"
                            required
                          renderSelected={(rmItem) => (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                {rmItem.itemCode}
                              </span>
                              <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                {rmItem.size}
                              </span>
                              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {rmItem.grade}
                              </span>
                            </div>
                          )}
                          renderOption={(rmItem) => (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                  {rmItem.itemCode}
                                </span>
                                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                  {rmItem.size} - {rmItem.grade}
                                </span>
                              </div>
                            </div>
                          )}
                          getSearchableText={(rmItem) => 
                            `${rmItem.itemCode} ${rmItem.size} ${rmItem.grade}`
                          }
                        />
                        <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
                          <span>Select original size – Finish size will be auto-filled from BOM</span>
                          {item.originalSize && (
                            <span className={getStockForItem(item.originalSize) > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                              Stock: {getStockForItem(item.originalSize).toFixed(2)} Kgs
                            </span>
                          )}
                        </p>
                      </div>

                        {/* Annealing Count */}
                        <div>
                          <label className="label">
                            Annealing Count (0-{selectedParty?.annealingMax || 8}) *
                          </label>
                          <select
                            className="input"
                            value={item.annealingCount}
                            onChange={(e) =>
                              updateItem(index, 'annealingCount', parseInt(e.target.value))
                            }
                            required
                          >
                            {Array.from(
                              { length: (selectedParty?.annealingMax || 8) + 1 },
                              (_, i) => i
                            ).map((count) => (
                              <option key={count} value={count}>
                                {count}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Draw Pass Count */}
                        <div>
                          <label className="label">
                            Draw Pass Count (0-{selectedParty?.drawMax || 10}) *
                          </label>
                          <select
                            className="input"
                            value={item.drawPassCount}
                            onChange={(e) =>
                              updateItem(index, 'drawPassCount', parseInt(e.target.value))
                            }
                            required
                          >
                            {Array.from(
                              { length: (selectedParty?.drawMax || 10) + 1 },
                              (_, i) => i
                            ).map((count) => (
                              <option key={count} value={count}>
                                {count}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="label">Quantity *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            min="0.01"
                            required
                          />
                        </div>

                        {/* Rate */}
                        <div>
                          <label className="label">Rate (per unit) *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(index, 'rate', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            required
                          />
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="bg-slate-50 border border-slate-200 rounded p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600">Item Total:</span>
                          <span className="text-lg font-bold text-blue-600">
                            ₹{item.itemTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grand Total */}
            {formData.items.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-900">Grand Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={formData.items.length === 0}
              >
                <Send className="w-5 h-5" />
                {editingChallan ? 'Update Challan' : 'Create Challan'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Challans List */}
      <Card>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Outward Challans
        </h2>

        {challans.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No outward challans found</p>
            <p className="text-sm">Create your first challan to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Challan No.</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((challan) => (
                  <tr key={challan._id}>
                    <td className="font-semibold">{challan.challanNumber}</td>
                    <td>{new Date(challan.challanDate).toLocaleDateString()}</td>
                    <td>{challan.party.partyName}</td>
                    <td>
                      <span className="badge badge-blue">
                        {challan.items.length} item{challan.items.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="font-semibold text-green-600">
                      ₹{challan.totalAmount.toFixed(2)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePDFExport(challan)}
                          className="btn btn-sm btn-primary"
                          title="Export PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(challan)}
                          className="btn btn-sm btn-secondary"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(challan)}
                          className="btn btn-sm btn-danger"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && challanToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete challan <strong>{challanToDelete.challanNumber}</strong>?
              This will reverse all stock changes for {challanToDelete.items.length} item(s).
            </p>
            <div className="flex gap-4">
              <button
                onClick={confirmDelete}
                className="btn btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setChallanToDelete(null);
                }}
                className="btn btn-secondary flex-1"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
