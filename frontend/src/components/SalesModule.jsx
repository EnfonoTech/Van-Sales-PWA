import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Trash2, Save, Loader2, Check } from 'lucide-react';
import { getItemPrice, searchItems, createSalesInvoice, updateSalesInvoice, getInvoiceDetails, getItemDetails, submitSalesInvoice, createCustomer, getSalesInvoiceList } from '../services/api';
import SARSymbol from './SARSymbol';

function SalesModule({ customers, items, sales, onAddSale, onAddCustomer, loadingCustomers, loadingItems, loadingSales }) {
  const location = useLocation();
  const [view, setView] = useState('list'); // 'list', 'create', or 'detail'
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingItem, setLoadingItem] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceSearchResults, setInvoiceSearchResults] = useState([]);
  const [loadingInvoiceSearch, setLoadingInvoiceSearch] = useState(false);
  const invoiceSearchDebounceRef = useRef(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState(false);
  const [quickCustomerFormData, setQuickCustomerFormData] = useState({
    customer_name_arabic: '',
    custom_vat_registration_number: ''
  });
  const [quickCustomerVatError, setQuickCustomerVatError] = useState('');
  const [submittingQuickCustomer, setSubmittingQuickCustomer] = useState(false);
  const itemDropdownRef = useRef(null);
  const sanitizeDecimalInput = (value = '') => value.replace(/[^0-9.]/g, '');
  const sanitizeIntegerInput = (value = '') => value.replace(/[^0-9]/g, '');
  const cleanErrorMessage = (error) => {
    const stripHtml = (s) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');
    const stripStatusPrefix = (s) => {
      if (typeof s !== 'string') return '';
      const statusCodePattern = /^(API Error:\s*\d+\s+[A-Za-z\s]+:\s*|^\d+\s+[A-Za-z\s]+:\s*)/i;
      return s.replace(statusCodePattern, '').trim();
    };

    // Strings
    if (typeof error === 'string') {
      const cleaned = stripStatusPrefix(stripHtml(error));
      return cleaned && cleaned.length >= 3 ? cleaned : 'An error occurred. Please try again.';
    }

    // Objects
    if (error && typeof error === 'object') {
      // Priority 1: error.response.data.message.message (nested)
      if (error.response?.data?.message?.status === 'error' && error.response.data.message.message) {
        return stripHtml(String(error.response.data.message.message));
      }
      // Priority 2: error.response.data.message.message (alternative)
      if (error.response?.data?.message?.message && typeof error.response.data.message.message === 'string') {
        return stripHtml(error.response.data.message.message);
      }
      // Priority 3: error.response.message.message (alternative structure)
      if (error.response?.message?.status === 'error' && error.response.message.message) {
        return stripHtml(String(error.response.message.message));
      }
      // Priority 4: error.message
      if (typeof error.message === 'string' && error.message.trim()) {
        const cleaned = stripStatusPrefix(stripHtml(error.message));
        if (cleaned && cleaned.length >= 3) return cleaned;
      }
      // Priority 5: error.response.data.message (string or object)
      if (error.response?.data?.message) {
        if (typeof error.response.data.message === 'string') {
          const cleaned = stripStatusPrefix(stripHtml(error.response.data.message));
          if (cleaned && cleaned.length >= 3) return cleaned;
        }
        if (typeof error.response.data.message === 'object' && error.response.data.message.message) {
          const cleaned = stripStatusPrefix(stripHtml(String(error.response.data.message.message)));
          if (cleaned && cleaned.length >= 3) return cleaned;
        }
      }
      // Priority 6: parse _server_messages
      const serverMessagesStr = error.response?._server_messages || error.response?.data?._server_messages;
      if (serverMessagesStr) {
        try {
          const serverMessages = JSON.parse(serverMessagesStr);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const first = serverMessages[0];
            const parsedFirst = typeof first === 'string' ? JSON.parse(first) : first;
            const candidate = parsedFirst?.message || parsedFirst?.title;
            const cleaned = stripStatusPrefix(stripHtml(candidate));
            if (cleaned && cleaned.length >= 3) return cleaned;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return 'An error occurred. Please try again.';
  };
  const getPriceValue = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };
  const getQuantityValue = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) && num > 0 ? num : 1;
  };
  const getDiscountValue = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  // Format date as DD/MM/YY
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Handle navigation from Dashboard - open detail view if saleId is in route state
  useEffect(() => {
    if (location.state?.saleId) {
      const sale = sales.find(s => s.id === location.state.saleId);
      if (sale) {
        handleViewDetails(sale);
      }
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sales]);

  // Handle name query parameter to show detail view
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nameParam = params.get('name');
    if (nameParam && nameParam !== selectedInvoice?.name && nameParam !== selectedInvoice?.id) {
      setLoadingDetails(true);
      getInvoiceDetails(nameParam)
        .then((details) => {
          const saleObj = {
            id: nameParam,
            name: nameParam,
            invoice_name: nameParam,
            ...details
          };
          setSelectedInvoice(saleObj);
          setInvoiceDetails(details);
          setView('detail');
        })
        .catch(() => {
          // If error, stay on list view
        })
        .finally(() => setLoadingDetails(false));
    }
  }, [location.search]);

  // Filter customers based on search query
  useEffect(() => {
    if (customerSearch.trim()) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.custom_customer_name_english?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.mobile?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerResults(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerResults(false);
    }
  }, [customerSearch, customers]);

  // When user searches invoices, fetch from server (so any invoice can be found, not just the first 20)
  useEffect(() => {
    const term = invoiceSearch.trim();
    if (!term) {
      setInvoiceSearchResults([]);
      setLoadingInvoiceSearch(false);
      if (invoiceSearchDebounceRef.current) {
        clearTimeout(invoiceSearchDebounceRef.current);
        invoiceSearchDebounceRef.current = null;
      }
      return;
    }
    if (invoiceSearchDebounceRef.current) clearTimeout(invoiceSearchDebounceRef.current);
    invoiceSearchDebounceRef.current = setTimeout(() => {
      invoiceSearchDebounceRef.current = null;
      setLoadingInvoiceSearch(true);
      getSalesInvoiceList({ limit: 100, offset: 0, search: term })
        .then(({ invoices }) => {
          setInvoiceSearchResults(Array.isArray(invoices) ? invoices : []);
        })
        .catch(() => setInvoiceSearchResults([]))
        .finally(() => setLoadingInvoiceSearch(false));
    }, 350);
    return () => {
      if (invoiceSearchDebounceRef.current) {
        clearTimeout(invoiceSearchDebounceRef.current);
      }
    };
  }, [invoiceSearch]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerResults && !event.target.closest('.customer-search-container')) {
        setShowCustomerResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomerResults]);

  // Item search logic - fetch on every keystroke (with debounce)
  useEffect(() => {
    if (!selectedCustomer) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const query = itemSearch.trim().toLowerCase();

    // Sort results to prioritize item code matches
    const sortByCodePriority = (results, searchTerm) => {
      if (!searchTerm) return results;
      
      const term = searchTerm.toLowerCase();
      return results.sort((a, b) => {
        const aCode = (a.code || '').toLowerCase();
        const bCode = (b.code || '').toLowerCase();
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        
        // Get priority score for item (lower number = higher priority)
        const getPriority = (code, name) => {
          // Priority 1: Exact code match
          if (code === term) return 1;
          // Priority 2: Code starts with search term
          if (code.startsWith(term)) return 2;
          // Priority 3: Code contains search term
          if (code.includes(term)) return 3;
          // Priority 4: Name starts with search term
          if (name.startsWith(term)) return 4;
          // Priority 5: Name contains search term
          if (name.includes(term)) return 5;
          // No match
          return 99;
        };
        
        const aPriority = getPriority(aCode, aName);
        const bPriority = getPriority(bCode, bName);
        
        // Sort by priority first
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same priority and both are code matches, sort by code length (shorter first) then alphabetically
        if (aPriority <= 3 && bPriority <= 3) {
          if (aCode.length !== bCode.length) {
            return aCode.length - bCode.length;
          }
          return aCode.localeCompare(bCode);
        }
        
        // If same priority and both are name matches, sort alphabetically by name
        if (aPriority >= 4 && bPriority >= 4) {
          return aName.localeCompare(bName);
        }
        
        return 0; // Maintain original order if priority is the same
      });
    };

    const getLocalMatches = (term) => {
      if (!term) {
        return items.slice(0, 20);
      }
      const filtered = items.filter(item =>
          item.code?.toLowerCase().includes(term) ||
          item.name?.toLowerCase().includes(term)
      );
      return sortByCodePriority(filtered, term).slice(0, 20);
    };

    const timeoutId = setTimeout(() => {
      if (!query) {
        setLoadingSearch(false);
        setSearchResults(getLocalMatches(''));
        return;
      }

      setLoadingSearch(true);
      searchItems(itemSearch)
        .then(results => {
          if (results && results.length > 0) {
            // Sort API results to prioritize code matches
            const sortedResults = sortByCodePriority(results, query);
            setSearchResults(sortedResults);
            setShowResults(true);
          } else {
            const fallback = getLocalMatches(query);
            setSearchResults(fallback);
            setShowResults(fallback.length > 0);
          }
        })
        .catch(() => {
          const fallback = getLocalMatches(query);
          setSearchResults(fallback);
          setShowResults(fallback.length > 0);
        })
        .finally(() => setLoadingSearch(false));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [itemSearch, items, selectedCustomer]);

  // Close item dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showResults && itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showResults]);

  const handleAddItem = async (item) => {
    const existing = invoiceItems.find(i => i.code === item.code);
    if (existing) {
      setInvoiceItems(invoiceItems.map(i =>
        i.code === item.code
          ? { ...i, quantity: ((parseFloat(i.quantity) || 1) + 1).toString() }
          : i
      ));
    } else {
      // Use item data directly (from dummy data or API)
      setLoadingItem(true);
      try {
        // Get customer name for the API call
        const customer = customers.find(c => c.id === selectedCustomer);
        const customerName = customer?.name || null;
        
        // Fetch full item details from API with customer parameter
        const itemDetails = await getItemDetails(item.code || item.item_code, customerName).catch(() => null);
        
        // Extract price_list_rate from first item in item_prices array
        // If price_list_rate is not present, use 0 instead of standard_rate
        let priceListRate = 0;
        if (itemDetails?.item_prices && itemDetails.item_prices.length > 0) {
          priceListRate = itemDetails.item_prices[0].price_list_rate || 0;
        } else if (itemDetails?.price_list_rate) {
          priceListRate = itemDetails.price_list_rate;
        } else {
          priceListRate = 0; // Use 0 instead of falling back to price or standard_rate
        }
        
        const baseQuantity = item.quantity ?? 1;
        const actualQty = itemDetails?.actual_qty ?? item.stock ?? 0;
        
        // Default UOM is sales_uom from API
        const defaultUOM = itemDetails?.sales_uom || itemDetails?.stock_uom || 'Nos';
        const uomConversions = itemDetails?.uom_conversions || [];
        
        // Price is per Nos (stock_uom), so convert if default UOM is Carton
        let initialPrice = priceListRate;
        if (defaultUOM === 'Carton') {
          const cartonConversion = uomConversions.find(conv => conv.uom === 'Carton');
          if (cartonConversion && cartonConversion.conversion_factor) {
            initialPrice = priceListRate * cartonConversion.conversion_factor;
          }
        }
        
        const newItem = {
          code: itemDetails?.code || item.code,
          name: itemDetails?.name || item.name,
          price: initialPrice.toString(), // Converted price based on default UOM
          price_list_rate: priceListRate, // Store original price_list_rate (per Nos/stock_uom)
          uom: defaultUOM, // Default to sales_uom
          stock_uom: itemDetails?.stock_uom || 'Nos', // Store original stock_uom from API
          sales_uom: itemDetails?.sales_uom || itemDetails?.stock_uom || 'Nos', // Store original sales_uom from API
          uom_conversions: uomConversions, // Store conversion factors
          stock: actualQty,
          quantity: baseQuantity.toString(),
          originalPrice: priceListRate // Store original for reference
        };
        setInvoiceItems([...invoiceItems, newItem]);
      } catch (error) {
        console.error('Error fetching item details:', error);
        // If API fails, use item data directly
        // Default UOM is sales_uom
        const defaultUOM = item.sales_uom || item.stock_uom || 'Nos';
        const basePrice = item.price || 0;
        const uomConversions = item.uom_conversions || [];
        
        // Convert price if default UOM is Carton
        let initialPrice = basePrice;
        if (defaultUOM === 'Carton') {
          const cartonConversion = uomConversions.find(conv => conv.uom === 'Carton');
          if (cartonConversion && cartonConversion.conversion_factor) {
            initialPrice = basePrice * cartonConversion.conversion_factor;
          }
        }
        
        const newItem = {
          code: item.code,
          name: item.name,
          price: initialPrice.toString(), // Converted price based on default UOM
          price_list_rate: basePrice,
          uom: defaultUOM, // Default to sales_uom
          stock_uom: item.stock_uom || 'Nos',
          sales_uom: item.sales_uom || item.stock_uom || 'Nos',
          uom_conversions: uomConversions,
          stock: item.stock || 0,
          quantity: (item.quantity || 1).toString(),
          originalPrice: basePrice
        };
        setInvoiceItems([...invoiceItems, newItem]);
      } finally {
        setLoadingItem(false);
      }
    }
    // Close dropdown after item selection
    setItemSearch('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleUpdatePrice = (code, value) => {
    const sanitized = sanitizeDecimalInput(value);
    setInvoiceItems(invoiceItems.map(item =>
      item.code === code ? { ...item, price: sanitized } : item
    ));
  };

  const handleUpdateQuantity = (code, value) => {
    const sanitized = sanitizeIntegerInput(value);
    setInvoiceItems(invoiceItems.map(item =>
      item.code === code ? { ...item, quantity: sanitized } : item
    ));
  };

  const handleUpdateUOM = (code, value) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.code === code) {
        const priceListRate = item.price_list_rate || parseFloat(item.originalPrice) || parseFloat(item.price) || 0;
        const currentPrice = parseFloat(item.price) || priceListRate;
        const currentUOM = item.uom || item.stock_uom || 'Nos';
        const uomConversions = item.uom_conversions || [];
        
        let newPrice = priceListRate; // Default: base price per Nos (stock_uom)
        
        // Find Carton conversion factor
        const cartonConversion = uomConversions.find(conv => conv.uom === 'Carton');
        const cartonFactor = cartonConversion?.conversion_factor || 1;
        
        // Convert FROM current UOM TO target UOM
        if (currentUOM === 'Nos' && value === 'Carton') {
          // Converting FROM Nos TO Carton: multiply base price by Carton's conversion_factor
          newPrice = priceListRate * cartonFactor;
        } else if (currentUOM === 'Carton' && value === 'Nos') {
          // Converting FROM Carton TO Nos: divide current Carton price by Carton's conversion_factor
          newPrice = currentPrice / cartonFactor;
        } else {
          // If already at target UOM or unknown conversion, keep current price
          newPrice = currentPrice;
        }
        
        return { ...item, uom: value, price: newPrice.toString() };
      }
      return item;
    }));
  };

  const handleUpdateDiscountAmount = (value) => {
    const sanitized = sanitizeDecimalInput(value);
    setDiscountAmount(sanitized);
  };

  const handleRemoveItem = (code) => {
    setInvoiceItems(invoiceItems.filter(item => item.code !== code));
  };

  const handleQuickCustomerChange = (e) => {
    const { name, value } = e.target;
    
    // VAT number validation - only allow digits and enforce 15 digits
    if (name === 'custom_vat_registration_number') {
      // Only allow digits
      const digitsOnly = value.replace(/[^0-9]/g, '');
      // Limit to 15 digits
      const limitedValue = digitsOnly.slice(0, 15);
      setQuickCustomerFormData({ ...quickCustomerFormData, [name]: limitedValue });
      
      // Validate length
      if (limitedValue.length > 0 && limitedValue.length !== 15) {
        setQuickCustomerVatError('VAT number must be exactly 15 digits');
      } else {
        setQuickCustomerVatError('');
      }
    } else {
      setQuickCustomerFormData({ ...quickCustomerFormData, [name]: value });
    }
  };

  const handleCreateQuickCustomer = async (e) => {
    if (e && e.preventDefault) {
    e.preventDefault();
      e.stopPropagation(); // Prevent parent form submission
    }
    
    // Validate VAT number if provided
    if (quickCustomerFormData.custom_vat_registration_number && quickCustomerFormData.custom_vat_registration_number.length !== 15) {
      setQuickCustomerVatError('VAT number must be exactly 15 digits');
      alert('VAT number must be exactly 15 digits');
      return;
    }
    
    if (!quickCustomerFormData.customer_name_arabic) {
      alert('Please fill in Customer Name');
      return;
    }
    
    setSubmittingQuickCustomer(true);
    try {
      const customerData = {
        customer_name: quickCustomerFormData.customer_name_arabic,
        custom_vat_registration_number: quickCustomerFormData.custom_vat_registration_number || ''
      };
      
      // Make sure we're actually calling the API
      if (!customerData.customer_name) {
        alert('Please fill in Customer Name');
        setSubmittingQuickCustomer(false);
        return;
      }
      
      const result = await createCustomer(customerData);
      
      // Get customer name from result - try multiple possible fields
      const customerName = result.name || 
                          result.customer_name || 
                          result.custom_customer_name_english ||
                          customerData.customer_name;
      
      if (!customerName) {
        throw new Error('Customer created but name not returned from API');
      }
      
      // Add to local state via callback
      const newCustomer = {
        id: result.name || result.id || result.customer_name || `CUST${String(customers.length + 1).padStart(3, '0')}`,
        name: result.customer_name || customerName,
        custom_customer_name_english: customerData.customer_name || customerData.custom_customer_name_english,
        custom_customer_name_arabic: customerData.customer_name_arabic || '',
        customer_name: customerData.customer_name || customerData.customer_name_arabic,
        custom_vat_registration_number: customerData.custom_vat_registration_number,
        balance: 0
      };
      
      // Add customer to state via callback if available
      if (onAddCustomer) {
        onAddCustomer(newCustomer);
      }
      
      // Reset form
      setQuickCustomerFormData({
        customer_name_arabic: '',
        custom_vat_registration_number: ''
      });
      setQuickCustomerVatError('');
      setShowQuickCustomerForm(false);
      
      // Auto-select the new customer
      // Try to find the customer in the updated list
      const foundCustomer = customers.find(c => 
        c.name === customerName || 
        c.id === customerName
      ) || newCustomer;
      
      setSelectedCustomer(foundCustomer.id || newCustomer.id);
      setCustomerSearch(customerName);
      setShowCustomerResults(false);
      
      alert(`Customer "${customerName}" created and selected successfully!`);
    } catch (error) {
      console.error('Error creating customer:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Error creating customer: ${errorMessage}`);
    } finally {
      setSubmittingQuickCustomer(false);
    }
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => {
      const price = getPriceValue(item.price);
      const quantity = getQuantityValue(item.quantity);
      return sum + price * quantity;
    }, 0);
  };

  const calculateDiscount = () => {
    return getDiscountValue(discountAmount);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.15; // 15% VAT on subtotal (before discount)
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = calculateDiscount();
    return Math.max(subtotal + tax - discount, 0); // Discount applied to total (after tax)
  };

  const handleEditInvoice = async () => {
    const invoice = invoiceDetails || selectedInvoice;
    if (!invoice) {
      alert('No invoice selected');
      return;
    }

    const invoiceName = invoice.id || invoice.invoice_name || invoice.name;
    if (!invoiceName) {
      alert('Invoice name not found. Cannot edit invoice.');
      return;
    }

    setLoadingDetails(true);
    try {
      const details = await getInvoiceDetails(invoiceName);

      // Map items into create-form structure
      const itemsForForm = (details.items || []).map(item => ({
        code: item.code || item.item_code,
        name: item.name || item.item_name,
        price: (item.price ?? item.rate ?? 0).toString(),
        uom: item.uom || item.sales_uom || item.stock_uom || 'Nos',
        stock_uom: item.stock_uom || item.uom || 'Nos',
        sales_uom: item.sales_uom || item.uom || 'Nos',
        uom_conversions: item.uom_conversions || [],
        stock: item.stock ?? 0,
        quantity: (item.quantity ?? item.qty ?? 1).toString(),
        originalPrice: item.price_list_rate ?? item.price ?? item.rate ?? 0
      }));

      // Set customer (SalesModule expects selectedCustomer as customer.id)
      const foundCustomer = customers.find(c => c.name === details.customerName || c.name === details.customer || c.id === details.customerId);
      if (foundCustomer) {
        setSelectedCustomer(foundCustomer.id);
        setCustomerSearch(foundCustomer.custom_customer_name_english || foundCustomer.name);
      } else {
        // Fallback: keep selection empty, but allow user to re-select
        setSelectedCustomer('');
        setCustomerSearch(details.customerEnglishName || details.customerName || details.customer || '');
      }

      setInvoiceItems(itemsForForm);
      setDiscountAmount((details.discount ?? details.discount_amount ?? 0).toString());

      setEditingInvoice(invoiceName);
      setView('create');
    } catch (error) {
      console.error('Error loading invoice for editing:', error);
      alert(`Error loading invoice for editing: ${cleanErrorMessage(error)}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (sale) => {
    setSelectedInvoice(sale);
    setLoadingDetails(true);
    setView('detail');
    
    try {
      // Get invoice name from sale object - check multiple possible fields
      const invoiceName = sale.id || sale.invoice_name || sale.name || sale.invoiceName;
      
      if (!invoiceName) {
        console.warn('No invoice name found in sale object:', sale);
        // Fallback to local sale data if no invoice name
        setInvoiceDetails(sale);
        alert('Invoice name not found. Showing available information.');
        return;
      }
      
      // Fetch full invoice details from API using invoice name
      const details = await getInvoiceDetails(invoiceName);
      setInvoiceDetails(details);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      // Fallback to local sale data if API fails
      setInvoiceDetails(sale);
      alert('Could not fetch full invoice details. Showing available information.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSubmitInvoice = async () => {
    const invoice = invoiceDetails || selectedInvoice;
    if (!invoice) {
      alert('No invoice selected');
      return;
    }

    // Get invoice name from invoice object
    const invoiceName = invoice.id || invoice.invoice_name || invoice.name;
    if (!invoiceName) {
      alert('Invoice name not found. Cannot submit invoice.');
      return;
    }

    // Check if already submitted
    if (invoice.status === 'Submitted' || invoice.status === 'submitted') {
      alert('This invoice is already submitted.');
      return;
    }

    if (!confirm('Are you sure you want to submit this invoice? This action cannot be undone.')) {
      return;
    }

    setSubmittingInvoice(true);
    try {
      await submitSalesInvoice(invoiceName);
      
      // Refresh invoice details after submission
      const updatedDetails = await getInvoiceDetails(invoiceName);
      setInvoiceDetails(updatedDetails);
      
      // Update the status in the local invoice object
      if (selectedInvoice) {
        setSelectedInvoice({ ...selectedInvoice, status: 'Submitted' });
      }
      
      alert('Invoice submitted successfully!');
      
      // Note: Sales list will be refreshed when user navigates back to it
    } catch (error) {
      console.error('Error submitting invoice:', error);
      alert(`Error submitting invoice: ${cleanErrorMessage(error)}`);
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === selectedCustomer);
    
    if (!customer || invoiceItems.length === 0) {
      alert('Please select a customer and add items');
      return;
    }

    // Validate that all items have a valid price
    const itemsWithInvalidPrice = invoiceItems.filter(item => {
      const price = getPriceValue(item.price);
      return price <= 0 || !item.price || item.price.trim() === '';
    });

    if (itemsWithInvalidPrice.length > 0) {
      const itemNames = itemsWithInvalidPrice.map(item => item.name || item.code).join(', ');
      alert(`Please enter a valid price for all items. Missing or invalid price for: ${itemNames}`);
      return;
    }

    setSubmitting(true);

    const today = new Date().toISOString().split('T')[0];
    
    // Prepare invoice data in UI format (will be transformed by API service)
    const formattedItems = invoiceItems.map(item => {
      const price = getPriceValue(item.price);
      const quantity = getQuantityValue(item.quantity);
      const selectedUOM = item.uom || item.stock_uom || 'Nos';
      return {
        code: item.code,
        name: item.name,
        quantity,
        price,
        total: price * quantity,
        uom: selectedUOM,
        sales_uom: selectedUOM, // Set to selected UOM
        stock_uom: selectedUOM // Set to selected UOM
      };
    });

    const invoiceData = {
      customer: customer.name, // Use customer name for API
      customerName: customer.name,
      customerId: customer.id,
      date: today,
      dueDate: today, // Can be calculated later
      items: formattedItems,
      subtotal: calculateSubtotal(),
      discount: calculateDiscount(),
      discount_amount: calculateDiscount(),
      tax: calculateTax(),
      total: calculateTotal()
    };

    try {
      let result;
      let invoiceName;

      if (editingInvoice) {
        // Update existing invoice
        const minimalUpdate = {
          invoice_name: editingInvoice,
          discount_amount: invoiceData.discount_amount,
          items: formattedItems
        };
        result = await updateSalesInvoice(minimalUpdate);
        invoiceName = editingInvoice;
      } else {
        // Create new invoice
        result = await createSalesInvoice(invoiceData);
        // Extract invoice_name from response - API returns "invoice_name" in various possible locations
        invoiceName = result.invoice_name 
          || result.message?.invoice_name 
          || result.message?.data?.invoice_name
          || result.data?.invoice_name
          || result.name 
          || result.message?.name
          || result.message?.data?.name;
      }
      
      // Add to local state in UI format
      const createdSale = {
        customerId: customer.id,
        customerName: customer.name,
        date: today,
        items: formattedItems,
        subtotal: calculateSubtotal(),
        discount: calculateDiscount(),
        tax: calculateTax(),
        total: calculateTotal(),
        id: invoiceName || `INV-${String(sales.length + 1).padStart(3, '0')}`,
        invoice_name: invoiceName, // Store invoice_name from API
        name: invoiceName, // Also store as name for compatibility
        status: result?.docstatus === 1 ? 'Submitted' : 'Draft'
      };

      onAddSale(createdSale);

      // Fetch full invoice details when possible; fall back to createdSale
      let detailData = createdSale;
      if (invoiceName) {
        try {
          const fetchedDetails = await getInvoiceDetails(invoiceName);
          detailData = fetchedDetails || createdSale;
        } catch (err) {
          console.warn('Could not fetch invoice details after create:', err);
        }
      }

      setSelectedInvoice(detailData);
      setInvoiceDetails(detailData);

      // Reset form inputs but stay on detail view
        setSelectedCustomer('');
        setInvoiceItems([]);
        setDiscountAmount('0');
        setEditingInvoice(null);
        setView('detail');
    } catch (error) {
      console.error('Error creating sale:', error);
      if (error.message === 'OFFLINE') {
        // Queue for background sync
        const queuedSale = {
          customerId: customer.id,
          customerName: customer.name,
          date: today,
          items: formattedItems,
          subtotal: calculateSubtotal(),
          discount: calculateDiscount(),
          tax: calculateTax(),
          total: calculateTotal(),
          id: `INV-${String(sales.length + 1).padStart(3, '0')}`,
          status: 'Draft (Offline)',
          _queued: true
        };
        onAddSale(queuedSale);
        setSelectedInvoice(queuedSale);
        setInvoiceDetails(queuedSale);
        alert('Sale saved offline. It will be synced when connection is restored.');
        setSelectedCustomer('');
        setInvoiceItems([]);
        setDiscountAmount('0');
        setView('detail');
      } else {
        console.error('Error creating sale:', error);
        alert(`Error creating sale: ${cleanErrorMessage(error)}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'create') {
    return (
      <div className="sales-create fade-in">
        <div className="flex-between mb-6">
          <h1>New Sale</h1>
          <button className="btn btn-secondary" onClick={() => {
            setView('list');
            setInvoiceItems([]);
            setSelectedCustomer('');
            setDiscountAmount('0');
          }}>
            Back to List
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card mb-4">
            <div className="flex-between mb-4">
              <h3 className="mb-0">Customer Selection</h3>
              {!showQuickCustomerForm && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowQuickCustomerForm(true)}
                >
                  <Plus size={16} />
                  Create New Customer
                </button>
              )}
            </div>
            
            {showQuickCustomerForm && (
              <div className="card mb-4" style={{ backgroundColor: 'var(--gray-50)', border: '1px solid var(--primary)' }}>
                <div className="flex-between mb-4">
                  <h4 style={{ margin: 0, color: 'var(--primary)' }}>Quick Customer Creation</h4>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setShowQuickCustomerForm(false);
                      setQuickCustomerFormData({ customer_name_arabic: '', custom_vat_registration_number: '' });
                      setQuickCustomerVatError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <div className="grid grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Customer Name *</label>
                      <input
                        type="text"
                        name="customer_name_arabic"
                        className="form-input"
                        value={quickCustomerFormData.customer_name_arabic}
                        onChange={handleQuickCustomerChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">VAT Number</label>
                      <input
                        type="text"
                        name="custom_vat_registration_number"
                        className="form-input"
                        value={quickCustomerFormData.custom_vat_registration_number}
                        onChange={handleQuickCustomerChange}
                        placeholder="Enter 15-digit VAT number"
                        maxLength={15}
                        pattern="[0-9]{15}"
                        inputMode="numeric"
                      />
                      {quickCustomerVatError && (
                        <div className="text-sm" style={{ color: 'var(--danger)', marginTop: '0.25rem' }}>
                          {quickCustomerVatError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleCreateQuickCustomer}
                      disabled={submittingQuickCustomer}
                    >
                      {submittingQuickCustomer ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Create Customer
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowQuickCustomerForm(false);
                        setQuickCustomerFormData({ customer_name_arabic: '', custom_vat_registration_number: '' });
                        setQuickCustomerVatError('');
                      }}
                      disabled={submittingQuickCustomer}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="form-group customer-search-container" style={{ position: 'relative' }}>
              <label className="form-label">Select Customer *</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--gray-400)',
                      pointerEvents: 'none'
                    }} 
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search customer by English name, mobile, or email..."
                    value={customerSearch}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setCustomerSearch(newValue);
                      // Clear selected customer when user starts typing/editing
                      if (selectedCustomer) {
                        setSelectedCustomer('');
                      }
                    }}
                    onFocus={() => {
                      if (customerSearch || customers.length > 0) {
                        setShowCustomerResults(true);
                      }
                    }}
                    style={{ paddingLeft: '40px' }}
                    required={!selectedCustomer}
                    autoComplete="off"
                  />
                </div>
                
                {showCustomerResults && (customerSearch || filteredCustomers.length > 0 || customers.length > 0) && (
                  <div 
                    className="card" 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: 'var(--shadow-lg)',
                      padding: 0
                    }}
                  >
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            const customerName = customer.custom_customer_name_english || customer.name;
                            setSelectedCustomer(customer.id);
                            setCustomerSearch(customerName);
                            setShowCustomerResults(false);
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-100)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--gray-50)'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                            {customer.custom_customer_name_english || customer.name}
                          </div>
                          {customer.custom_customer_name_arabic && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '2px' }}>
                              {customer.custom_customer_name_arabic}
                            </div>
                          )}
                          {customer.email && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                              ✉️ {customer.email}
                            </div>
                          )}
                        </div>
                      ))
                    ) : customerSearch ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--gray-500)' }}>
                        No customers found matching "{customerSearch}"
                      </div>
                    ) : !customerSearch && customers.length > 0 ? (
                      customers.slice(0, 10).map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            const customerName = customer.custom_customer_name_english || customer.name;
                            setSelectedCustomer(customer.id);
                            setCustomerSearch(customerName);
                            setShowCustomerResults(false);
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-100)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--gray-50)'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                            {customer.custom_customer_name_english || customer.name}
                          </div>
                          {customer.custom_customer_name_arabic && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '2px' }}>
                              {customer.custom_customer_name_arabic}
                            </div>
                          )}
                        {customer.email && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                            ✉️ {customer.email}
                          </div>
                        )}
                        </div>
                      ))
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {selectedCustomer && (() => {
              const customer = customers.find(c => c.id === selectedCustomer);
              return (
                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}>
                  <div className="grid grid-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Customer Name</div>
                      <div className="font-semibold">{customer.custom_customer_name_english || customer.name}</div>
                      {customer.custom_customer_name_arabic && (
                        <div className="text-xs text-gray-500 mt-1">{customer.custom_customer_name_arabic}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Customer Group</div>
                      <div className="font-semibold">{customer.customer_group || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">VAT Number</div>
                      <div className="font-semibold">{customer.custom_vat_registration_number || '—'}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {selectedCustomer && (
            <>
              <div className="card mb-4">
                <h3 className="mb-4">Add Items</h3>
                <div className="form-group" style={{ position: 'relative' }} ref={itemDropdownRef}>
                  <label className="form-label">Search Item by Code or Name</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        if (!showResults) {
                          setShowResults(true);
                        }
                      }}
                      onFocus={() => {
                        if (!showResults) {
                          setShowResults(true);
                        }
                        if (!itemSearch.trim()) {
                          setSearchResults(items.slice(0, 20));
                        }
                      }}
                      placeholder="Type item code or name..."
                      style={{ paddingRight: '3rem' }}
                    />
                    <Search size={20} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  </div>

                  {loadingSearch && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '2px solid var(--primary)',
                      borderRadius: 'var(--radius-lg)',
                      marginTop: '0.5rem',
                      padding: '1rem',
                      zIndex: 1000,
                      boxShadow: 'var(--shadow-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  )}
                  {showResults && !loadingSearch && (
                    <div
                      className="card"
                      style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '2px solid var(--primary)',
                      borderRadius: 'var(--radius-lg)',
                      marginTop: '0.5rem',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: 'var(--shadow-lg)'
                    }}>
                      {searchResults.length > 0 ? searchResults.map(item => (
                        <div
                          key={item.code || item.item_code}
                          onClick={() => handleAddItem(item)}
                          style={{
                            padding: '1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-200)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <div>
                              <div className="font-semibold">{item.name || item.item_name}</div>
                              <div className="text-sm text-gray-600">
                              Code: {item.code || item.item_code} | UOM: {item.uom || 'Unit'}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                          No items found{itemSearch ? ` for "${itemSearch}"` : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {invoiceItems.length > 0 && (
                <div className="card mb-4">
                  <h3 className="mb-4">Invoice Items</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Item Name</th>
                          <th>Price</th>
                          <th>Qty</th>
                          <th>UOM</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceItems.map(item => {
                          const priceValue = getPriceValue(item.price);
                          const quantityValue = getQuantityValue(item.quantity);
                          const itemTotal = priceValue * quantityValue;
                          return (
                            <tr key={item.code}>
                              <td className="font-semibold">{item.code}</td>
                              <td>{item.name}</td>
                              <td>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="form-input"
                                  value={item.price}
                                  onChange={(e) => handleUpdatePrice(item.code, e.target.value)}
                                  placeholder="0.00"
                                  style={{ width: '110px' }}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="form-input"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.code, e.target.value)}
                                  placeholder="1"
                                  style={{ width: '80px' }}
                                />
                              </td>
                              <td>
                                <select
                                  className="form-select"
                                  value={item.uom || item.stock_uom || 'Nos'}
                                  onChange={(e) => handleUpdateUOM(item.code, e.target.value)}
                                  style={{ width: '100px', padding: '6px 8px' }}
                                >
                                  <option value="Nos">Nos</option>
                                  <option value="Carton">Carton</option>
                                </select>
                              </td>
                              <td className="font-bold"><SARSymbol size={16} /> {itemTotal.toFixed(2)}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.code)}
                                  className="btn btn-danger btn-sm"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="5" className="text-right font-bold">Subtotal:</td>
                          <td colSpan="2" className="font-bold"><SARSymbol size={16} /> {calculateSubtotal().toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="text-right font-bold">Discount:</td>
                          <td colSpan="2" style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-start' }}>
                              <span style={{ color: 'var(--gray-600)' }}>-</span>
                              <SARSymbol size={16} />
                              <input
                                type="text"
                                inputMode="decimal"
                                className="form-input"
                                value={discountAmount}
                                onChange={(e) => handleUpdateDiscountAmount(e.target.value)}
                                placeholder="0.00"
                                style={{ 
                                  width: '100px', 
                                  textAlign: 'left',
                                  fontWeight: 'bold',
                                  padding: '4px 8px'
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="text-right font-bold">Tax (15%):</td>
                          <td colSpan="2" className="font-bold"><SARSymbol size={16} /> {calculateTax().toFixed(2)}</td>
                        </tr>
                        <tr style={{ borderTop: '2px solid var(--primary)' }}>
                          <td colSpan="5" className="text-right font-bold" style={{ fontSize: '1.125rem' }}>TOTAL:</td>
                          <td colSpan="2" className="font-bold" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                            <SARSymbol size={16} /> {calculateTotal().toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button type="submit" className="btn btn-success" disabled={submitting || loadingItem}>
                      {submitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={20} />
                          Save Sale
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </form>
      </div>
    );
  }

  // Detail View
  if (view === 'detail') {
    const invoice = invoiceDetails || selectedInvoice;
    
    return (
      <div className="sales-detail fade-in">
        <div className="flex-between mb-6">
          <div>
            <button 
              className="btn btn-secondary mb-4"
              onClick={() => setView('list')}
            >
              ← Back to Sales
            </button>
            <h1>Invoice Details</h1>
          </div>
        </div>

        {loadingDetails ? (
          <div className="card">
            <div className="empty-state">
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
              <div className="empty-state-title mt-4">Loading invoice details...</div>
            </div>
          </div>
        ) : invoice ? (
          <div className="card">
            {/* Invoice Header */}
            <div className="mb-6" style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '20px' }}>
              <div className="flex-between mb-4">
                <div>
                  <h2 style={{ margin: 0, color: 'var(--primary)' }}>{invoice.invoice_name || invoice.id || invoice.name}</h2>
                  <div className="text-sm text-gray-600 mt-1">
                    Status: <span className="badge badge-primary">{invoice.status || 'Draft'}</span>
                  </div>
                </div>
                <div className="text-right">
                  {invoice.docstatus === 1 && invoice.pdf_url && (
                    <div style={{ marginBottom: '12px' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          // Use pdf_url from API if available, otherwise fallback to window.print()
                          const pdfUrl = invoice.pdf_url ?? invoice.data?.pdf_url;
                          if (pdfUrl) {
                            // Open PDF in new tab for download/viewing
                            window.open(pdfUrl, '_blank');
                          } else {
                            // Fallback to printing current page
                            window.print();
                          }
                        }}
                        title="Open PDF invoice"
                      >
                        🖨️ Print Invoice
                      </button>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="font-semibold">{formatDate(invoice.date || invoice.posting_date)}</div>
                  {invoice.dueDate && (
                    <>
                      <div className="text-sm text-gray-600 mt-2">Due Date</div>
                      <div className="font-semibold">{formatDate(invoice.dueDate || invoice.due_date)}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-4">
                <h3 className="mb-2" style={{ fontSize: '1rem', color: 'var(--gray-700)' }}>Customer Information</h3>
                <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: 'var(--radius)' }}>
                  <div className="font-semibold">
                    {invoice.customerEnglishName || invoice.customerName || invoice.customer}
                  </div>
                  {invoice.customerArabicName && (
                    <div className="text-sm text-gray-500 mt-1">{invoice.customerArabicName}</div>
                  )}
                  {invoice.customerMobile && (
                    <div className="text-sm text-gray-600 mt-1">📱 {invoice.customerMobile}</div>
                  )}
                  {invoice.customerEmail && (
                    <div className="text-sm text-gray-600 mt-1">✉️ {invoice.customerEmail}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-6">
              <h3 className="mb-4" style={{ fontSize: '1rem', color: 'var(--gray-700)' }}>Items</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Item Name</th>
                      <th>Qty</th>
                      <th>UOM</th>
                      <th>Rate</th>
                      <th>Discount</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item, index) => {
                      const itemTotal = ((item.price || item.rate || 0) * (item.quantity || item.qty || 1)) - (item.discount || 0);
                      return (
                        <tr key={item.code || item.item_code || index}>
                          <td className="font-semibold">{item.code || item.item_code}</td>
                          <td>{item.name || item.item_name}</td>
                          <td>{item.quantity || item.qty || 1}</td>
                          <td>{item.uom || 'Nos'}</td>
                          <td><SARSymbol size={16} /> {(item.price || item.rate || 0).toFixed(2)}</td>
                          <td><SARSymbol size={16} /> {(item.discount || 0).toFixed(2)}</td>
                          <td className="font-semibold"><SARSymbol size={16} /> {itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="text-right font-semibold">Subtotal:</td>
                      <td colSpan="2" className="font-semibold">
                        <SARSymbol size={16} /> {(invoice.subtotal || invoice.net_total || 0).toFixed(2)}
                      </td>
                    </tr>
                    {invoice.discount > 0 && (
                      <tr>
                        <td colSpan="5" className="text-right">Discount:</td>
                        <td colSpan="2"><SARSymbol size={16} /> {(invoice.discount || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="5" className="text-right">Tax (15%):</td>
                      <td colSpan="2"><SARSymbol size={16} /> {(invoice.tax || invoice.total_taxes_and_charges || 0).toFixed(2)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid var(--primary)' }}>
                      <td colSpan="5" className="text-right font-bold" style={{ fontSize: '1.125rem' }}>TOTAL:</td>
                      <td colSpan="2" className="font-bold" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                        <SARSymbol size={16} /> {(invoice.total || invoice.grand_total || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {(invoice.status === 'Draft' || invoice.status === 'draft' || !invoice.status || (invoice.docstatus !== undefined && invoice.docstatus === 0)) && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={handleEditInvoice}
                    disabled={submittingInvoice || loadingDetails}
                  >
                    Edit Invoice
                  </button>
                <button 
                  className="btn btn-success"
                  onClick={handleSubmitInvoice}
                  disabled={submittingInvoice}
                >
                  {submittingInvoice ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Submit Invoice
                    </>
                  )}
                </button>
                </>
              )}
              <button 
                className="btn btn-secondary"
                onClick={() => setView('list')}
              >
                Back to List
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">❌</div>
              <div className="empty-state-title">Invoice not found</div>
              <button 
                className="btn btn-primary mt-4"
                onClick={() => setView('list')}
              >
                Back to Sales
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sales-list fade-in">
      <div className="flex-between mb-6">
        <h1>Sales Invoices</h1>
        <button className="btn btn-primary" onClick={() => setView('create')}>
          <Plus size={20} />
          New Sale
        </button>
      </div>

      {loadingSales || loadingCustomers || loadingItems ? (
        <div className="card">
          <div className="empty-state">
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
            <div className="empty-state-title mt-4">Loading sales data...</div>
          </div>
        </div>
      ) : sales.length > 0 || invoiceSearch.trim() ? (
        <div className="card">
          <div className="mb-4">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Search Invoices</label>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--gray-400)',
                    pointerEvents: 'none'
                  }} 
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by customer English name or invoice ID (searches all your invoices)..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingInvoiceSearch ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', display: 'block' }} />
                      <span className="text-muted">Searching invoices...</span>
                    </td>
                  </tr>
                ) : (() => {
                  const isSearching = !!invoiceSearch.trim();
                  const list = isSearching ? invoiceSearchResults : sales;
                  const sorted = list.slice().sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateB - dateA;
                  });
                  if (isSearching && sorted.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                          No matching invoices
                        </td>
                      </tr>
                    );
                  }
                  return sorted.map(sale => (
                    <tr 
                      key={sale.id}
                      onClick={() => handleViewDetails(sale)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="font-semibold">{sale.id}</td>
                      <td>{formatDate(sale.date)}</td>
                      <td>
                        {(() => {
                          let customerEnglishName = sale.customerEnglishName;
                          if (!customerEnglishName && sale.customerId) {
                            const customer = customers.find(c => c.id === sale.customerId);
                            customerEnglishName = customer?.custom_customer_name_english || '';
                          }
                          if (!customerEnglishName && sale.customerName) {
                            const customer = customers.find(c => c.name === sale.customerName);
                            customerEnglishName = customer?.custom_customer_name_english || '';
                          }
                          return customerEnglishName || sale.customerName || '-';
                        })()}
                      </td>
                      <td className="font-semibold"><SARSymbol size={16} /> {sale.total.toFixed(2)}</td>
                      <td>
                        <span className="badge badge-primary">{sale.status}</span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <div className="empty-state-title">No sales yet</div>
            <p>Create your first sale to get started</p>
            <button className="btn btn-primary mt-4" onClick={() => setView('create')}>
              <Plus size={20} />
              Create First Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesModule;
