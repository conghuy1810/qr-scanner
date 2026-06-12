module.exports = function(app) {
  app.get('/api/orders', (req, res) => {
    const { acc, bank, amount, des } = req.query;

    // Xác thực thông số
    if (!acc || !bank || !amount || !des) {
      return res.status(400).json({
        error: 'Thiếu thông số: acc, bank, amount, des',
      });
    }

    // Tạo URL QR code từ các params
    const qrParams = new URLSearchParams({
      acc: acc,
      bank: bank,
      amount: amount,
      des: des,
    });

    // Trả về dữ liệu order giả lập
    res.json({
      code: des,
      amount: parseInt(amount),
      bank: bank,
      accountNumber: acc,
      qrUrl: `https://qr.sepay.vn/img?${qrParams.toString()}`,
      orderCode: des,
      status: 'created',
      createdAt: new Date().toISOString(),
      expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  });
};
