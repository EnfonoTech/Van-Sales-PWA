import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Loader2, Check } from 'lucide-react';
import {
  getSalesOrderList,
  getSalesOrderDetails,
  createSalesOrder,
  submitSalesOrder,
  getItemDetails,
  searchItems,
} from '../services/api';
import SARSymbol from './SARSymbol';
import TransactionFormLayout from './TransactionFormLayout';
import TransactionDetailLayout from './TransactionDetailLayout';

const sanitizeDecimalInput = (value = '') => value.replace(/[^0-9.]/g, '');
const sanitizeIntegerInput = (value = '') => value.replace(/[^0-9]/g, '');

function SalesOrderModule({ customers = [], items = [] }) {
  const [view, setView] = useState('list');
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [listSearchResults, setListSearchResults] = useState([]);
  const [loadingListSearch, setLoadingListSearch] = useState(false);
  const listSearchRef = useRef(null);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [lineItems, setLineItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('0');
  const itemDropdownRef = useRef(null);

  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingSalesOrder, setSubmittingSalesOrder] = useState(false);

  const getPriceValue = (v) => (Number.isFinite(parseFloat(v)) && parseFloat(v) >= 0 ? parseFloat(v) : 0);
  const getQuantityValue = (v) => (Number.isFinite(parseFloat(v)) && parseFloat(v) > 0 ? parseFloat(v) : 1);
  const getDiscountValue = (v) => (Number.isFinite(parseFloat(v)) && parseFloat(v) >= 0 ? parseFloat(v) : 0);
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

  const calculateSubtotal = () =>
    lineItems.reduce((sum, item) => sum + getPriceValue(item.price) * getQuantityValue(item.quantity), 0);
  const calculateDiscount = () => getDiscountValue(discountAmount);
  const calculateTax = () => calculateSubtotal() * 0.15;
  const calculateTotal = () => Math.max(calculateSubtotal() + calculateTax() - calculateDiscount(), 0);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { sales_orders: list } = await getSalesOrderList({ limit: 100, offset: 0 });
      setSalesOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      setSalesOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    const term = listSearch.trim();
    if (!term) {
      setListSearchResults([]);
      setLoadingListSearch(false);
      if (listSearchRef.current) clearTimeout(listSearchRef.current);
      return;
    }
    if (listSearchRef.current) clearTimeout(listSearchRef.current);
    listSearchRef.current = setTimeout(() => {
      listSearchRef.current = null;
      setLoadingListSearch(true);
      getSalesOrderList({ limit: 100, offset: 0, search: term })
        .then(({ sales_orders: list }) => setListSearchResults(Array.isArray(list) ? list : []))
        .catch(() => setListSearchResults([]))
        .finally(() => setLoadingListSearch(false));
    }, 350);
    return () => { if (listSearchRef.current) clearTimeout(listSearchRef.current); };
  }, [listSearch]);

  useEffect(() => {
    if (customerSearch.trim()) {
      const filtered = (customers || []).filter(
        (c) =>
          (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.custom_customer_name_english || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.mobile || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerResults(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerResults(false);
    }
  }, [customerSearch, customers]);

  useEffect(() => {
    if (!selectedCustomer) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const query = itemSearch.trim().toLowerCase();
    const sortByCode = (results, term) => {
      if (!term) return results;
      return [...results].sort((a, b) => {
        const aCode = (a.code || a.item_code || '').toLowerCase();
        const bCode = (b.code || b.item_code || '').toLowerCase();
        const aName = (a.name || a.item_name || '').toLowerCase();
        const bName = (b.name || b.item_name || '').toLowerCase();
        const pri = (code, name) => {
          if (code === term) return 1;
          if (code.startsWith(term)) return 2;
          if (code.includes(term)) return 3;
          if (name.startsWith(term)) return 4;
          if (name.includes(term)) return 5;
          return 99;
        };
        return pri(aCode, aName) - pri(bCode, bName);
      });
    };
    if (!query) {
      setLoadingSearch(false);
      setSearchResults(sortByCode((items || []).slice(0, 20), ''));
      return;
    }
    setLoadingSearch(true);
    const t = setTimeout(() => {
      searchItems(itemSearch)
        .then((results) => {
          if (results?.length) setSearchResults(sortByCode(results, query));
          else setSearchResults(sortByCode((items || []).filter((i) => (i.code || '').toLowerCase().includes(query) || (i.name || '').toLowerCase().includes(query)), query));
        })
        .catch(() => setSearchResults(sortByCode((items || []).filter((i) => (i.code || '').toLowerCase().includes(query) || (i.name || '').toLowerCase().includes(query)), query)))
        .finally(() => setLoadingSearch(false));
    }, 500);
    return () => clearTimeout(t);
  }, [itemSearch, items, selectedCustomer]);

  useEffect(() => {
    const handleClick = (e) => {
      if (showResults && itemDropdownRef.current && !itemDropdownRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showResults]);

  useEffect(() => {
    const handleClick = (e) => {
      if (showCustomerResults && !e.target.closest('.customer-search-container')) setShowCustomerResults(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCustomerResults]);

  const handleAddItem = async (item) => {
    const code = item.code || item.item_code;
    const existing = lineItems.find((i) => i.code === code);
    if (existing) {
      setLineItems((prev) =>
        prev.map((i) => (i.code === code ? { ...i, quantity: String((parseFloat(i.quantity) || 1) + 1) } : i))
      );
    } else {
      setLoadingItem(true);
      try {
        const customer = customers.find((c) => c.id === selectedCustomer);
        const customerName = customer?.name || null;
        const itemDetails = await getItemDetails(code, customerName).catch(() => null);
        let priceListRate = 0;
        if (itemDetails?.item_prices?.length) priceListRate = itemDetails.item_prices[0].price_list_rate || 0;
        else if (itemDetails?.price_list_rate) priceListRate = itemDetails.price_list_rate;
        const defaultUOM = itemDetails?.sales_uom || itemDetails?.stock_uom || 'Nos';
        const uomConversions = itemDetails?.uom_conversions || [];
        let initialPrice = priceListRate;
        if (defaultUOM === 'Carton') {
          const conv = uomConversions.find((c) => c.uom === 'Carton');
          if (conv?.conversion_factor) initialPrice = priceListRate * conv.conversion_factor;
        }
        const newItem = {
          code: itemDetails?.code || code,
          name: itemDetails?.name || item.name,
          price: String(initialPrice),
          price_list_rate: priceListRate,
          uom: defaultUOM,
          stock_uom: itemDetails?.stock_uom || 'Nos',
          sales_uom: itemDetails?.sales_uom || itemDetails?.stock_uom || 'Nos',
          uom_conversions: uomConversions,
          quantity: '1',
          originalPrice: priceListRate,
        };
        setLineItems((prev) => [...prev, newItem]);
      } catch {
        const defaultUOM = item.sales_uom || item.stock_uom || 'Nos';
        const basePrice = item.price || 0;
        const uomConversions = item.uom_conversions || [];
        let initialPrice = basePrice;
        if (defaultUOM === 'Carton') {
          const conv = uomConversions.find((c) => c.uom === 'Carton');
          if (conv?.conversion_factor) initialPrice = basePrice * conv.conversion_factor;
        }
        setLineItems((prev) => [
          ...prev,
          {
            code: item.code || item.item_code,
            name: item.name || item.item_name,
            price: String(initialPrice),
            price_list_rate: basePrice,
            uom: defaultUOM,
            stock_uom: item.stock_uom || 'Nos',
            sales_uom: item.sales_uom || item.stock_uom || 'Nos',
            uom_conversions: uomConversions,
            quantity: '1',
            originalPrice: basePrice,
          },
        ]);
      } finally {
        setLoadingItem(false);
      }
    }
    setItemSearch('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleUpdatePrice = (code, value) => {
    setLineItems((prev) => prev.map((i) => (i.code === code ? { ...i, price: sanitizeDecimalInput(value) } : i)));
  };
  const handleUpdateQuantity = (code, value) => {
    setLineItems((prev) => prev.map((i) => (i.code === code ? { ...i, quantity: sanitizeIntegerInput(value) } : i)));
  };
  const handleUpdateUOM = (code, value) => {
    setLineItems((prev) =>
      prev.map((i) => {
        if (i.code !== code) return i;
        const priceListRate = i.price_list_rate ?? parseFloat(i.originalPrice) ?? parseFloat(i.price) ?? 0;
        const currentPrice = parseFloat(i.price) || priceListRate;
        const currentUOM = i.uom || 'Nos';
        const uomConversions = i.uom_conversions || [];
        const cartonConv = uomConversions.find((c) => c.uom === 'Carton');
        const factor = cartonConv?.conversion_factor || 1;
        let newPrice = priceListRate;
        if (currentUOM === 'Nos' && value === 'Carton') newPrice = priceListRate * factor;
        else if (currentUOM === 'Carton' && value === 'Nos') newPrice = currentPrice / factor;
        else newPrice = currentPrice;
        return { ...i, uom: value, price: String(newPrice) };
      })
    );
  };
  const handleRemoveItem = (code) => setLineItems((prev) => prev.filter((i) => i.code !== code));
  const handleUpdateDiscountAmount = (value) => setDiscountAmount(sanitizeDecimalInput(value));

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setView('detail');
    setLoadingDetail(true);
    setOrderDetail(null);
    try {
      const detail = await getSalesOrderDetails(order.name);
      setOrderDetail(detail);
    } catch {
      setOrderDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmitSalesOrder = async () => {
    const doc = orderDetail || selectedOrder;
    if (!doc?.name) return;
    if (doc.docstatus === 1) return;
    setSubmittingSalesOrder(true);
    try {
      await submitSalesOrder(doc.name);
      const updated = await getSalesOrderDetails(doc.name);
      setOrderDetail(updated);
      setSelectedOrder(updated);
    } catch (err) {
      alert(err.message || 'Failed to submit sales order');
    } finally {
      setSubmittingSalesOrder(false);
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer || lineItems.length === 0) {
      alert('Please select a customer and add items');
      return;
    }
    const invalidPrice = lineItems.filter((i) => getPriceValue(i.price) <= 0 || !i.price?.trim());
    if (invalidPrice.length) {
      alert(`Please enter a valid price for: ${invalidPrice.map((i) => i.name || i.code).join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      const formattedItems = lineItems.map((i) => ({
        item_code: i.code,
        qty: getQuantityValue(i.quantity),
        rate: getPriceValue(i.price),
        uom: i.uom || i.stock_uom || 'Nos',
      }));
      const result = await createSalesOrder({
        customer: customer.name,
        items: formattedItems,
        delivery_date: deliveryDate || undefined,
      });
      const orderName = result.name || result.message?.name;
      if (orderName) {
        // Fetch details and show detail view so user can submit and print
        const detail = await getSalesOrderDetails(orderName);
        setSelectedOrder({ name: orderName });
        setOrderDetail(detail);
        setView('detail');
      } else {
        // Fallback to list if name not returned
        setView('list');
        fetchList();
      }
      // Clear form after successful create
      setSelectedCustomer('');
      setCustomerSearch('');
      setLineItems([]);
      setDiscountAmount('0');
      setDeliveryDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      alert(err.message || 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const listToShow = listSearch.trim() ? listSearchResults : salesOrders;
  const isSearchingList = !!listSearch.trim();

  if (view === 'detail') {
    const doc = orderDetail || selectedOrder;
    const isDraft = doc?.docstatus === 0 || doc?.status === 'Draft' || !doc?.docstatus;
    const extraActions = isDraft ? (
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={handleSubmitSalesOrder}
          disabled={submittingSalesOrder}
        >
          {submittingSalesOrder ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check size={16} />
              Submit Order
            </>
          )}
        </button>
      </div>
    ) : null;
    return (
      <TransactionDetailLayout
        title="Sales Order Details"
        docName={doc?.name}
        status={doc?.status || (doc?.docstatus === 1 ? 'Submitted' : 'Draft')}
        dateLabel="Order Date"
        dateValue={doc?.transaction_date}
        dueDateLabel="Delivery Date"
        dueDateValue={doc?.delivery_date}
        backLabel="Back to Sales Orders"
        onBack={() => setView('list')}
        partyLabel="Customer Information"
        partyName={doc?.customer_name || doc?.customer}
        items={doc?.items || []}
        subtotal={doc?.net_total}
        discount={doc?.discount_amount}
        tax={doc?.total_taxes_and_charges}
        total={doc?.grand_total}
        formatDate={formatDate}
        extraActions={extraActions}
        pdfUrl={doc?.pdf_url}
      />
    );
  }

  if (view === 'create') {
    const customer = customers.find((c) => c.id === selectedCustomer);
    const partySelection = (
      <div className="form-group customer-search-container" style={{ position: 'relative' }}>
        <label className="form-label">Select Customer *</label>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search customer by English name, mobile, or email..."
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              if (selectedCustomer) setSelectedCustomer('');
            }}
            onFocus={() => (customerSearch || customers.length) && setShowCustomerResults(true)}
            style={{ paddingLeft: 40 }}
            autoComplete="off"
          />
        </div>
        {showCustomerResults && (customerSearch || filteredCustomers.length || customers.length) && (
          <div
            className="card"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 300, overflowY: 'auto', zIndex: 1000, boxShadow: 'var(--shadow-lg)', padding: 0 }}
          >
            {(filteredCustomers.length ? filteredCustomers : customers.slice(0, 10)).map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c.id);
                  setCustomerSearch(c.custom_customer_name_english || c.name);
                  setShowCustomerResults(false);
                }}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-50)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontWeight: 600 }}>{c.custom_customer_name_english || c.name}</div>
                {c.custom_customer_name_arabic && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{c.custom_customer_name_arabic}</div>}
              </div>
            ))}
          </div>
        )}
        {selectedCustomer && customer && (
          <>
            <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}>
              <div className="font-semibold">{customer.custom_customer_name_english || customer.name}</div>
              {customer.custom_customer_name_arabic && <div className="text-xs text-gray-500 mt-1">{customer.custom_customer_name_arabic}</div>}
            </div>
            <div className="form-group mt-4">
              <label className="form-label">Delivery Date *</label>
              <input
                type="date"
                className="form-input"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>
          </>
        )}
      </div>
    );

    const addItemsSection = selectedCustomer && (
      <div style={{ position: 'relative' }} ref={itemDropdownRef}>
        <label className="form-label">Search Item by Code or Name</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            value={itemSearch}
            onChange={(e) => {
              setItemSearch(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => {
              setShowResults(true);
              if (!itemSearch.trim()) setSearchResults((items || []).slice(0, 20));
            }}
            placeholder="Type item code or name..."
            style={{ paddingRight: '3rem' }}
          />
          <Search size={20} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        </div>
        {loadingSearch && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid var(--primary)', borderRadius: 'var(--radius-lg)', marginTop: 8, padding: 16, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Searching...</span>
          </div>
        )}
        {showResults && !loadingSearch && (
          <div
            className="card"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, maxHeight: 300, overflowY: 'auto', zIndex: 1000, boxShadow: 'var(--shadow-lg)' }}
          >
            {searchResults.length ? (
              searchResults.map((item) => (
                <div
                  key={item.code || item.item_code}
                  onClick={() => handleAddItem(item)}
                  style={{ padding: '1rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-200)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <div className="font-semibold">{item.name || item.item_name}</div>
                  <div className="text-sm text-gray-600">Code: {item.code || item.item_code} | UOM: {item.uom || 'Unit'}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-500)' }}>No items found</div>
            )}
          </div>
        )}
      </div>
    );

    return (
      <TransactionFormLayout
        title="New Sales Order"
        backLabel="Back to Sales Orders"
        onBack={() => { setView('list'); setLineItems([]); setSelectedCustomer(''); setCustomerSearch(''); setDiscountAmount('0'); setDeliveryDate(new Date().toISOString().split('T')[0]); }}
        partySelection={partySelection}
        addItemsSection={addItemsSection}
        lineItems={lineItems}
        getPriceValue={getPriceValue}
        getQuantityValue={getQuantityValue}
        onUpdatePrice={handleUpdatePrice}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateUOM={handleUpdateUOM}
        onRemoveItem={handleRemoveItem}
        discountAmount={discountAmount}
        onDiscountChange={handleUpdateDiscountAmount}
        calculateSubtotal={calculateSubtotal}
        calculateDiscount={calculateDiscount}
        calculateTax={calculateTax}
        calculateTotal={calculateTotal}
        onSubmit={handleSubmitCreate}
        submitting={submitting}
        submitLabel="Save Sales Order"
        disabledSubmit={loadingItem}
      />
    );
  }

  return (
    <div className="sales-list fade-in">
      <div className="flex-between mb-6">
        <h1>Sales Orders</h1>
        <button className="btn btn-primary" onClick={() => setView('create')}>
          <Plus size={20} /> New Sales Order
        </button>
      </div>
      {loading ? (
        <div className="card">
          <div className="empty-state">
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
            <div className="empty-state-title mt-4">Loading...</div>
          </div>
        </div>
      ) : salesOrders.length > 0 || listSearch.trim() ? (
        <div className="card">
          <div className="mb-4">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Search Sales Orders</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name or customer..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingListSearch ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', display: 'block' }} />
                      <span className="text-muted">Searching...</span>
                    </td>
                  </tr>
                ) : listToShow.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                      {isSearchingList ? 'No matching orders' : 'No sales orders yet'}
                    </td>
                  </tr>
                ) : (
                  listToShow
                    .slice()
                    .sort((a, b) => new Date(b.transaction_date || 0) - new Date(a.transaction_date || 0))
                    .map((so) => (
                      <tr
                        key={so.name}
                        onClick={() => handleViewDetails(so)}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--gray-50)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="font-semibold">{so.name}</td>
                        <td>{formatDate(so.transaction_date)}</td>
                        <td>{so.customer_name || so.customer || '—'}</td>
                        <td className="font-semibold">
                          <SARSymbol size={16} /> {(so.grand_total || 0).toFixed(2)}
                        </td>
                        <td>
                          <span className="badge badge-primary">{so.status || (so.docstatus === 1 ? 'Submitted' : 'Draft')}</span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No sales orders yet</div>
            <p>Create your first sales order</p>
            <button className="btn btn-primary mt-4" onClick={() => setView('create')}>
              <Plus size={20} /> New Sales Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesOrderModule;
