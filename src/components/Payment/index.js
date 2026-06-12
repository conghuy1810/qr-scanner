import React, { useState } from 'react';
import './Payment.css';

export default function Payment({ onNavigateToQRPayment }) {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Predefined denominations
  const denominations = [20000, 50000, 100000, 200000, 500000, 1000000, 5000000, 10000000];

  const MIN_AMOUNT = 20000;
  const MAX_AMOUNT = 10000000;

  const vnd = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });

  const handleSelectAmount = async (amount) => {
    setSelectedAmount(amount);
    setLoading(true);
    setError(null);

    try {
      // Default order data
      const orderCode = `DH${Date.now()}`;
      const accountNumber = '0010000000355';
      const bank = 'Vietcombank';

      // Build API URL with all required parameters
      const params = new URLSearchParams({
        acc: accountNumber,
        bank: bank,
        amount: amount,
        des: orderCode,
      });

      const response = await fetch(`/api/orders?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const orderData = await response.json();
      
      // Navigate to QRPayment with the order data
      onNavigateToQRPayment(orderData);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      setSelectedAmount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomAmount(value);
    setError(null);
  };

  const handleCustomAmountSubmit = (e) => {
    e.preventDefault();
    const amount = parseInt(customAmount);

    if (!customAmount) {
      setError('Vui lòng nhập số tiền');
      return;
    }

    if (amount < MIN_AMOUNT) {
      setError(`Số tiền tối thiểu là ${vnd.format(MIN_AMOUNT)}`);
      return;
    }

    if (amount > MAX_AMOUNT) {
      setError(`Số tiền tối đa là ${vnd.format(MAX_AMOUNT)}`);
      return;
    }

    handleSelectAmount(amount);
  };

  return (
    <div className="payment-container">
      <article className="payment-card">
        <header>
          <div>💳 Nạp Tiền</div>
          <p className="subtitle">Chọn hoặc nhập mệnh giá nạp tiền</p>
        </header>

        <main>
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* Predefined Denominations */}
          <div className="denomination-section">
            <h3 className="section-title">Mệnh giá thường dùng</h3>
            <div className="denomination-grid">
              {denominations.map((amount) => (
                <button
                  key={amount}
                  className={`denomination-btn ${selectedAmount === amount ? 'selected' : ''} ${
                    loading && selectedAmount === amount ? 'loading' : ''
                  }`}
                  onClick={() => handleSelectAmount(amount)}
                  disabled={loading}
                >
                  <span className="amount">{vnd.format(amount)}</span>
                  {selectedAmount === amount && loading && (
                    <span className="loader">⏳</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="custom-amount-section">
            <h3 className="section-title">Nhập số tiền khác</h3>
            <form onSubmit={handleCustomAmountSubmit} className="custom-form">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Nhập số tiền (20.000 - 10.000.000 VND)"
                  value={customAmount ? vnd.format(parseInt(customAmount)).replace(/[₫\s]/g, '') : ''}
                  onChange={handleCustomAmountChange}
                  disabled={loading}
                  className="amount-input"
                />
                <span className="currency">VND</span>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                disabled={loading || !customAmount}
              >
                {loading ? 'Đang tạo đơn...' : 'Xác nhận'}
              </button>
            </form>
            <p className="amount-range">
              Min: <strong>{vnd.format(MIN_AMOUNT)}</strong> • Max: <strong>{vnd.format(MAX_AMOUNT)}</strong>
            </p>
          </div>

          <p className="info-text">
            💡 Quét mã QR từ ứng dụng ngân hàng của bạn để thanh toán
          </p>
        </main>
      </article>
    </div>
  );
}
