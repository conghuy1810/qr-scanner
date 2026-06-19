import React, { useEffect, useRef, useState } from "react";
import "./Payment.css";

export default function Payment({ onNavigateToQRPayment }) {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOptions, setUserOptions] = useState([]);
  const [checkingUser, setCheckingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileLoading, setTurnstileLoading] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [error, setError] = useState(null);
  const turnstileWidgetRef = useRef(null);
  const turnstileWidgetId = useRef(null);
  const turnstileResolveRef = useRef(null);
  const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      setError("Turnstile site key chưa được cấu hình.");
      return;
    }

    if (window.turnstile && !turnstileWidgetId.current && turnstileWidgetRef.current) {
      turnstileWidgetId.current = window.turnstile.render(turnstileWidgetRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: "invisible",
        callback: (token) => {
          if (turnstileResolveRef.current) {
            turnstileResolveRef.current(token);
            turnstileResolveRef.current = null;
          }
        },
        "error-callback": () => {
          if (turnstileResolveRef.current) {
            turnstileResolveRef.current("");
            turnstileResolveRef.current = null;
          }
        },
        "expired-callback": () => {
          if (turnstileResolveRef.current) {
            turnstileResolveRef.current("");
            turnstileResolveRef.current = null;
          }
        },
      });
      setTurnstileReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile && turnstileWidgetRef.current && !turnstileWidgetId.current) {
        turnstileWidgetId.current = window.turnstile.render(turnstileWidgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          size: "invisible",
          callback: (token) => {
            if (turnstileResolveRef.current) {
              turnstileResolveRef.current(token);
              turnstileResolveRef.current = null;
            }
          },
          "error-callback": () => {
            if (turnstileResolveRef.current) {
              turnstileResolveRef.current("");
              turnstileResolveRef.current = null;
            }
          },
          "expired-callback": () => {
            if (turnstileResolveRef.current) {
              turnstileResolveRef.current("");
              turnstileResolveRef.current = null;
            }
          },
        });
        setTurnstileReady(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [TURNSTILE_SITE_KEY]);

  const executeTurnstile = () => {
    if (!window.turnstile) {
      throw new Error("Turnstile chưa sẵn sàng.");
    }
    if (!turnstileWidgetId.current) {
      throw new Error("Widget Turnstile chưa được render.");
    }

    return new Promise((resolve, reject) => {
      turnstileResolveRef.current = (token) => {
        if (!token) {
          reject(new Error("Xác thực Turnstile không thành công."));
          return;
        }
        resolve(token);
      };

      window.turnstile.execute(turnstileWidgetId.current);
      setTimeout(() => {
        if (turnstileResolveRef.current) {
          turnstileResolveRef.current = null;
          reject(new Error("Xác thực Turnstile hết thời gian."));
        }
      }, 15000);
    });
  };

  // Predefined denominations
  const denominations = [
    2000, 20000, 50000, 100000, 200000, 500000, 1000000, 5000000, 10000000,
  ];

  const MIN_AMOUNT = 20000;
  const MAX_AMOUNT = 10000000;

  const vnd = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });

  const normalizeUsers = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.users && Array.isArray(data.users)) return data.users;
    if (data?.results && Array.isArray(data.results)) return data.results;
    if (data?.id) return [data];
    return [];
  };

  const getUserLabel = (user) => {
    return user.username || user.email || user.name || user.id || "Người dùng";
  };

  const fetchUsers = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setCheckingUser(true);
    setError(null);
    setUserOptions([]);
    setSelectedUser(null);

    try {
      const response = await fetch("/api/v1/get-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: trimmed }),
      });

      if (!response.ok) {
        throw new Error(`Lỗi khi tìm người dùng: ${response.statusText}`);
      }

      const data = await response.json();
      const users = normalizeUsers(data);

      if (!users.length) {
        throw new Error(
          "Không tìm thấy người dùng với username hoặc gmail này.",
        );
      }

      setUserOptions(users);
      if (users.length === 1) {
        setSelectedUser(users[0]);
        setRecipient(getUserLabel(users[0]));
      }
    } catch (err) {
      setError(err.message || "Không tìm thấy người dùng. Vui lòng thử lại.");
    } finally {
      setCheckingUser(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setRecipient(getUserLabel(user));
    setError(null);
  };

  const handleSelectAmount = async (amount) => {
    if (!selectedUser) {
      setError("Vui lòng chọn người dùng trước khi tạo đơn.");
      return;
    }

    setSelectedAmount(amount);
    setLoading(true);
    setError(null);

    try {
      const accountId =
        selectedUser.id || selectedUser.accountId || selectedUser.userId;
      if (!accountId) {
        throw new Error(
          "Dữ liệu người dùng không hợp lệ. Vui lòng chọn lại người dùng.",
        );
      }

      const token = await executeTurnstile();
      const payload = {
        amount,
        accountId,
        turnstileToken: token,
      };

      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const orderData = await response.json();

      onNavigateToQRPayment({
        ...orderData,
        usernameOrEmail: getUserLabel(selectedUser),
      });
    } catch (err) {
      setError(err.message || "Không thể tạo đơn hàng. Vui lòng thử lại.");
      setSelectedAmount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setCustomAmount(value);
    setError(null);
  };

  const handleCustomAmountSubmit = (e) => {
    e.preventDefault();

    if (!selectedUser) {
      setError("Vui lòng chọn người dùng trước khi tạo đơn.");
      return;
    }

    if (!customAmount) {
      setError("Vui lòng nhập số tiền");
      return;
    }

    const amount = parseInt(customAmount, 10);

    if (isNaN(amount)) {
      setError("Số tiền không hợp lệ.");
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
          {error && <div className="error-message">⚠️ {error}</div>}

          <div className="recipient-section">
            <h3 className="section-title">Account/Gmail</h3>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 20px 0",
                textTransform: "uppercase",
                letterSpacing: "0.5px,",
              }}
            >
              Nhập tên account hoặc gmail sau đó ấn kiểm tra để chọn tài khoản
              cần nạp tiền
            </span>
            <div className="recipient-input-row">
              <input
                type="text"
                placeholder="Nhập account hoặc gmail"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setSelectedUser(null);
                  setUserOptions([]);
                  setError(null);
                }}
                onBlur={() => fetchUsers(recipient)}
                disabled={loading || checkingUser}
                className="amount-input"
              />
              <button
                type="button"
                className="btn btn-secondary user-check-btn"
                onClick={() => fetchUsers(recipient)}
                disabled={loading || checkingUser || !recipient.trim()}
              >
                {checkingUser ? "Đang kiểm tra..." : "Kiểm tra"}
              </button>
            </div>
            <div ref={turnstileWidgetRef} style={{ display: "none" }} />
            {userOptions.length > 0 && (
              <div className="user-options-list">
                <div className="user-options-title">Chọn người dùng</div>
                {userOptions.map((user) => (
                  <button
                    key={user.id || getUserLabel(user)}
                    type="button"
                    className={`user-option ${selectedUser?.id === user.id || selectedUser?.username === user.username || selectedUser?.email === user.email ? "selected" : ""}`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <span>{getUserLabel(user)}</span>
                    {user.email && <small>{user.email}</small>}
                    {user.phone && <small>{user.phone}</small>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Predefined Denominations */}
          <div className="denomination-section">
            <h3 className="section-title">Mệnh giá thường dùng</h3>
            <div className="denomination-grid">
              {denominations.map((amount) => (
                <button
                  key={amount}
                  className={`denomination-btn ${selectedAmount === amount ? "selected" : ""} ${
                    loading && selectedAmount === amount ? "loading" : ""
                  }`}
                  onClick={() => handleSelectAmount(amount)}
                  disabled={loading || !selectedUser}
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
                  value={
                    customAmount
                      ? vnd
                          .format(parseInt(customAmount, 10))
                          .replace(/[₫\s]/g, "")
                      : ""
                  }
                  onChange={handleCustomAmountChange}
                  disabled={loading || !selectedUser}
                  className="amount-input"
                />
                <span className="currency">VND</span>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || !customAmount || !selectedUser}
              >
                {loading ? "Đang tạo đơn..." : "Xác nhận"}
              </button>
            </form>
            <p className="amount-range">
              Min: <strong>{vnd.format(MIN_AMOUNT)}</strong> • Max:{" "}
              <strong>{vnd.format(MAX_AMOUNT)}</strong>
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
