import React, { useState } from 'react';
import Payment from './components/Payment';
import QRPayment from './components/QRPayment';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('payment'); // 'payment' or 'qrpayment'
  const [orderData, setOrderData] = useState(null);

  const handleNavigateToQRPayment = (data) => {
    setOrderData(data);
    setCurrentScreen('qrpayment');
  };

  const handleBackToPayment = () => {
    setCurrentScreen('payment');
    setOrderData(null);
  };

  return (
    <>
      {currentScreen === 'payment' ? (
        <Payment onNavigateToQRPayment={handleNavigateToQRPayment} />
      ) : (
        <QRPayment orderData={orderData} onBack={handleBackToPayment} />
      )}
    </>
  );
}

export default App;
