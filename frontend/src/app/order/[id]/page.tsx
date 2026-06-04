import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getOrderById } from '@/lib/api';
import Link from 'next/link';
import OrderConfirmationClient from './OrderConfirmationClient';

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  let order = null;

  try {
    order = await getOrderById(resolvedParams.id);
  } catch (error) {
    console.error('Failed to load order:', error);
  }

  if (!order || order.message) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--surface)]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-[var(--border)]">
            <h1 className="text-2xl font-bold font-playfair mb-4">Order Not Found</h1>
            <p className="text-[var(--text-secondary)] mb-6">
              We couldn&apos;t find the order details. Please contact support if you need help.
            </p>
            <Link href="/" className="btn-gold-outline rounded">
              Return Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="minimal" />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-16 w-full">
        <OrderConfirmationClient order={order} />
      </main>

      <Footer />
    </div>
  );
}
