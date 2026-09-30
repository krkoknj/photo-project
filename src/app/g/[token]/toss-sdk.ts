"use client";

// 토스페이먼츠 결제창 SDK v2를 필요할 때만 불러온다 (결제 버튼을 누른 고객만).
// https://docs.tosspayments.com/sdk/v2/js

const SDK_URL = "https://js.tosspayments.com/v2/standard";

type RequestPaymentParams = {
  method: "CARD";
  amount: { currency: "KRW"; value: number };
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerName?: string;
};

type TossPaymentsFactory = (clientKey: string) => {
  payment: (options: { customerKey: string }) => { requestPayment: (params: RequestPaymentParams) => Promise<void> };
};

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

let loading: Promise<TossPaymentsFactory> | null = null;

export function loadTossPayments() {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("SDK not found")));
    script.onerror = () => {
      loading = null;
      reject(new Error("SDK load failed"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
