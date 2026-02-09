/**
 * Shared detail view layout for Sales Invoice / Quotation / Sales Order.
 * Same UI as SalesModule detail: header (name, status, date), party/customer info, items table, totals.
 */
import * as React from 'react';
import SARSymbol from './SARSymbol';

export function TransactionDetailLayout({
  title = 'Details',
  docName,
  status,
  dateLabel = 'Date',
  dateValue,
  dueDateLabel,
  dueDateValue,
  backLabel = 'Back to List',
  onBack,
  partyLabel = 'Customer Information',
  partyName,
  partySubtitle,
  partyMobile,
  partyEmail,
  items = [],
  subtotal,
  discount,
  tax,
  total,
  formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—'),
  extraActions,
  pdfUrl,
}) {
  return (
    <div className="sales-detail fade-in">
      <div className="flex-between mb-6">
        <div>
          <button type="button" className="btn btn-secondary mb-4" onClick={onBack}>
            ← {backLabel}
          </button>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="card">
        <div className="mb-6" style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '20px' }}>
          <div className="flex-between mb-4">
            <div>
              <h2 style={{ margin: 0, color: 'var(--primary)' }}>{docName}</h2>
              <div className="text-sm text-gray-600 mt-1">
                Status: <span className="badge badge-primary">{status || 'Draft'}</span>
              </div>
            </div>
            <div className="text-right">
              {pdfUrl && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => window.open(pdfUrl, '_blank')}
                    title="Open PDF"
                  >
                    🖨️ Print
                  </button>
                </div>
              )}
              {extraActions}
              <div className="text-sm text-gray-600">{dateLabel}</div>
              <div className="font-semibold">{formatDate(dateValue)}</div>
              {dueDateLabel && dueDateValue != null && (
                <>
                  <div className="text-sm text-gray-600 mt-2">{dueDateLabel}</div>
                  <div className="font-semibold">{formatDate(dueDateValue)}</div>
                </>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-2" style={{ fontSize: '1rem', color: 'var(--gray-700)' }}>{partyLabel}</h3>
            <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: 'var(--radius)' }}>
              <div className="font-semibold">{partyName}</div>
              {partySubtitle && <div className="text-sm text-gray-500 mt-1">{partySubtitle}</div>}
              {partyMobile && <div className="text-sm text-gray-600 mt-1">📱 {partyMobile}</div>}
              {partyEmail && <div className="text-sm text-gray-600 mt-1">✉️ {partyEmail}</div>}
            </div>
          </div>
        </div>

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
                {(items || []).map((item, index) => {
                  const rate = item.price ?? item.rate ?? 0;
                  const qty = item.quantity ?? item.qty ?? 1;
                  const disc = item.discount ?? 0;
                  const itemTotal = rate * qty - disc;
                  return (
                    <tr key={item.code || item.item_code || index}>
                      <td className="font-semibold">{item.code || item.item_code}</td>
                      <td>{item.name || item.item_name}</td>
                      <td>{qty}</td>
                      <td>{item.uom || 'Nos'}</td>
                      <td><SARSymbol size={16} /> {Number(rate).toFixed(2)}</td>
                      <td><SARSymbol size={16} /> {Number(disc).toFixed(2)}</td>
                      <td className="font-semibold"><SARSymbol size={16} /> {itemTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" className="text-right font-semibold">Subtotal:</td>
                  <td colSpan="2" className="font-semibold">
                    <SARSymbol size={16} /> {Number(subtotal ?? 0).toFixed(2)}
                  </td>
                </tr>
                {(discount ?? 0) > 0 && (
                  <tr>
                    <td colSpan="5" className="text-right">Discount:</td>
                    <td colSpan="2"><SARSymbol size={16} /> {Number(discount).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan="5" className="text-right">Tax (15%):</td>
                  <td colSpan="2"><SARSymbol size={16} /> {Number(tax ?? 0).toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--primary)' }}>
                  <td colSpan="5" className="text-right font-bold" style={{ fontSize: '1.125rem' }}>TOTAL:</td>
                  <td colSpan="2" className="font-bold" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                    <SARSymbol size={16} /> {Number(total ?? 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailLayout;
