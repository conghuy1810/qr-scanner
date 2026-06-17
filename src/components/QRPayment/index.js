import React, { useState, useEffect } from "react";
import "./QRPayment.css";

export default function QRPayment({ orderData = null, onBack = null }) {
  const getInitialOrderData = () => {
    // Priority: use orderData prop > URL parameters > defaults
    if (orderData) {
      return {
        code: orderData.code || orderData.billCode ,
        amount: parseInt(orderData.amount) || 100000,
        usernameOrEmail: orderData.usernameOrEmail || "",
        bank: orderData.bank,
        accountNumber: orderData.accountNumber ,
        qrUrl: orderData.qrUrl || null,
        orderId: orderData.orderId || null,
      };
    }
  };

  const [orderData_, setOrderData] = useState(getInitialOrderData());
  const [status, setStatus] = useState("waiting");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [formData, setFormData] = useState(getInitialOrderData());
  const [showForm, setShowForm] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [pollError, setPollError] = useState(null);

  const vnd = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });

  // Copy to clipboard function
  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000); // Reset after 2 seconds
    });
  };

  // Generate QR URL
  const generateQRUrl = (data) => {
    if (data.qrUrl) {
      return data.qrUrl;
    }
    const params = new URLSearchParams({
      acc: data.accountNumber,
      bank: data.bank,
      amount: data.amount,
      des: data.code,
    });
    return `${process.env.REACT_APP_QR_API_URL}?${params.toString()}`;
  };

  // Timer effect
  useEffect(() => {
    if (status !== "waiting" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // Poll order status every 10 seconds while waiting
  useEffect(() => {
    if (!orderData_?.orderId || status !== "waiting") return;

    const fetchOrderStatus = async () => {
      try {
        setPollError(null);
        const response = await fetch(`api/v1/orders/${orderData_.orderId}/status`);
        if (!response.ok) {
          throw new Error(`Lỗi khi kiểm tra trạng thái: ${response.status}`);
        }

        const data = await response.json();
        const newStatus = data?.status;

        if (newStatus === "paid" || newStatus === "completed") {
          setStatus("paid");
        } else if (newStatus === "expired") {
          setStatus("expired");
        }
      } catch (error) {
        setPollError(error.message || "Lỗi khi kiểm tra trạng thái đơn hàng.");
      }
    };

    fetchOrderStatus();
    const pollInterval = setInterval(fetchOrderStatus, 10000);

    return () => clearInterval(pollInterval);
  }, [orderData_, status]);

  // Format time display
  const formatTime = (seconds) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const handleUpdateOrder = (e) => {
    e.preventDefault();
    setOrderData(formData);
    setStatus("waiting");
    setTimeLeft(15 * 60);
    setShowForm(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "amount" ? parseInt(value) || 0 : value,
    });
  };

  const getStatusStyles = () => {
    switch (status) {
      case "paid":
        return { state: "paid", text: "✓ Thanh toán thành công", icon: "✓" };
      case "expired":
        return { state: "expired", text: "✗ Đơn hàng đã hết hạn", icon: "✗" };
      default:
        return {
          state: "waiting",
          text: `⏱ Chờ thanh toán: ${formatTime(timeLeft)}`,
          icon: "⏱",
        };
    }
  };

  const statusInfo = getStatusStyles();

  return (
    <div className="qr-payment-container">
      <article className="payment-card">
        <header>
          <div className="header-content">
            <div>Thanh toán đơn hàng</div>
            <strong>{vnd.format(orderData_.amount)}</strong>
          </div>
          {onBack && (
            <button className="btn-back" onClick={onBack} title="Quay lại">
              ← Quay lại
            </button>
          )}
        </header>

        <main>
          {/* QR Code Display */}
          {status === "paid" ? (
            <div className="payment-success">
              <div className="success-icon">✓</div>
              <p className="success-text">
                Thanh toán đã hoàn tất thành công.
              </p>
              <p className="success-subtext">
                Đơn hàng của bạn đã được xử lý. Cảm ơn bạn đã sử dụng dịch vụ.
              </p>
            </div>
          ) : (
            <div className="qr-section">
              <img
                src={generateQRUrl(orderData_)}
                alt="QR code thanh toán"
                className="qr-code"
              />
              <p className="qr-instruction">
                Mở app ngân hàng → Quét QR → Xác nhận
              </p>
            </div>
          )}

          {/* Order Details */}
          <dl className="order-details">
            <dt>Ngân hàng</dt>
            <dd>
              <span>{orderData_.bank}</span>
              <button
                className={`btn-copy ${copiedField === "bank" ? "copied" : ""}`}
                onClick={() => copyToClipboard(orderData_.bank, "bank")}
                title="Copy"
              >
                <span className="material-icons">
                  {copiedField === "bank" ? "check_circle" : "content_copy"}
                </span>
              </button>
            </dd>

            <dt>Số tài khoản</dt>
            <dd>
              <span>{orderData_.accountNumber}</span>
              <button
                className={`btn-copy ${copiedField === "accountNumber" ? "copied" : ""}`}
                onClick={() =>
                  copyToClipboard(orderData_.accountNumber, "accountNumber")
                }
                title="Copy"
              >
                <span className="material-icons">
                  {copiedField === "accountNumber"
                    ? "check_circle"
                    : "content_copy"}
                </span>
              </button>
            </dd>

            <dt>Nội dung</dt>
            <dd>
              <span>{orderData_.code}</span>
              <button
                className={`btn-copy ${copiedField === "code" ? "copied" : ""}`}
                onClick={() => copyToClipboard(orderData_.code, "code")}
                title="Copy"
              >
                <span className="material-icons">
                  {copiedField === "code" ? "check_circle" : "content_copy"}
                </span>
              </button>
            </dd>

            <dt>Username / Gmail</dt>
            <dd>
              <span>{orderData_.usernameOrEmail || "Chưa có"}</span>
              {orderData_.usernameOrEmail && (
                <button
                  className={`btn-copy ${copiedField === "usernameOrEmail" ? "copied" : ""}`}
                  onClick={() =>
                    copyToClipboard(
                      orderData_.usernameOrEmail,
                      "usernameOrEmail",
                    )
                  }
                  title="Copy"
                >
                  <span className="material-icons">
                    {copiedField === "usernameOrEmail"
                      ? "check_circle"
                      : "content_copy"}
                  </span>
                </button>
              )}
            </dd>

            <dt>Số tiền</dt>
            <dd>
              <span>{vnd.format(orderData_.amount)}</span>
              <button
                className={`btn-copy ${copiedField === "amount" ? "copied" : ""}`}
                onClick={() =>
                  copyToClipboard(orderData_.amount.toString(), "amount")
                }
                title="Copy"
              >
                <span className="material-icons">
                  {copiedField === "amount" ? "check_circle" : "content_copy"}
                </span>
              </button>
            </dd>
          </dl>

          {/* Status */}
          <div
            className={`status status-${statusInfo.state}`}
            data-state={statusInfo.state}
          >
            {statusInfo.text}
          </div>

          {pollError && (
            <div className="error-message" style={{ marginTop: "0.75rem" }}>
              ⚠️ {pollError}
            </div>
          )}

          {status === "expired" && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setStatus("waiting");
                setTimeLeft(15 * 60);
              }}
            >
              Tạo đơn mới
            </button>
          )}

          {/* Edit Button */}
          <button
            className="btn btn-outline"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Huỷ" : "Chỉnh sửa thông tin"}
          </button>

          {/* Edit Form */}
          {showForm && (
            <form className="edit-form" onSubmit={handleUpdateOrder}>
              <div className="form-group">
                <label htmlFor="code">Mã đơn hàng:</label>
                <input
                  id="code"
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="amount">Số tiền (VND):</label>
                <input
                  id="amount"
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="usernameOrEmail">Username / Gmail:</label>
                <input
                  id="usernameOrEmail"
                  type="text"
                  name="usernameOrEmail"
                  value={formData.usernameOrEmail}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bank">Ngân hàng:</label>
                <input
                  id="bank"
                  type="text"
                  name="bank"
                  value={formData.bank}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="accountNumber">Số tài khoản:</label>
                <input
                  id="accountNumber"
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleFormChange}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                Cập nhật
              </button>
            </form>
          )}
        </main>
      </article>
    </div>
  );
}
