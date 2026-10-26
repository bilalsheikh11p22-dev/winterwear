import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { checkoutApi, resolveCartItems } from '../services/api';
import { BrandLoader } from '../components/common/Loader';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Truck,
  CreditCard,
  Banknote,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Contact' },
  { id: 2, title: 'Shipping' },
  { id: 3, title: 'Delivery' },
  { id: 4, title: 'Payment' },
  { id: 5, title: 'Review' },
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, clearCart, couponCode, currency, subtotal } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  // Synchronous lock + stable idempotency key so double clicks / retries can never create two orders
  const submitLockRef = useRef(false);
  const idempotencyKeyRef = useRef(null);
  const [validating, setValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [contactInfo, setContactInfo] = useState({
    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    phone: user?.phone || '',
    street: '',
    apartment: '',
    city: 'Lahore',
    state: 'Punjab',
    postalCode: '',
    country: 'Pakistan',
  });

  const [deliveryMethod, setDeliveryMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Server-calculated pricing & validation state
  const [validationData, setValidationData] = useState(null);

  // Sync user info when auth loads
  useEffect(() => {
    if (user) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setContactInfo((prev) => ({
        fullName: prev.fullName || name,
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
      setShippingAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || name,
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Orders require an account: send guests to sign in / register, then bring them back here
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/checkout', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!user) return;
    if (cartItems.length === 0 && !validationData) {
      navigate('/cart');
    }
  }, [cartItems, navigate, validationData, user]);

  // Server-side validation trigger before reaching Step 5
  const validateWithServer = async () => {
    setValidating(true);
    setErrorMessage('');
    try {
      const resolvedItems = await resolveCartItems(cartItems);
      const payload = {
        items: resolvedItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
          name: i.name,
        })),
        couponCode: couponCode || undefined,
        shippingAddress,
      };

      const res = await checkoutApi.validate(payload);
      if (res.data?.success) {
        setValidationData(res.data.data);
        return true;
      } else {
        setErrorMessage(res.data?.message || 'Server validation failed.');
        return false;
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.data?.errors?.join(', ') ||
          err.message || 'Failed to validate cart with atelier inventory server.'
      );
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleNextStep = async () => {
    setErrorMessage('');

    // Step 1 Validation
    if (currentStep === 1) {
      if (!contactInfo.fullName.trim() || !contactInfo.email.trim() || !contactInfo.phone.trim()) {
        setErrorMessage('Please fill in your full name, email, and phone number.');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(contactInfo.email)) {
        setErrorMessage('Please provide a valid email address.');
        return;
      }
    }

    // Step 2 Validation
    if (currentStep === 2) {
      if (
        !shippingAddress.street.trim() ||
        !shippingAddress.city.trim() ||
        !shippingAddress.postalCode.trim()
      ) {
        setErrorMessage('Please provide street address, city, and postal code.');
        return;
      }
    }

    // Entering Step 5: trigger server validation
    if (currentStep === 4) {
      const valid = await validateWithServer();
      if (!valid) return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Place Order Execution
  const handlePlaceOrder = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setErrorMessage('');

    try {
      const resolvedItems = await resolveCartItems(cartItems);
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `ww-ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      const idempotencyKey = idempotencyKeyRef.current;

      const orderPayload = {
        items: resolvedItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
          name: i.name,
        })),
        shippingAddress: {
          fullName: contactInfo.fullName,
          phone: contactInfo.phone,
          street: shippingAddress.street,
          apartment: shippingAddress.apartment,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        paymentMethod,
        couponCode: couponCode || undefined,
        deliveryNotes: deliveryNotes || undefined,
        idempotencyKey,
      };

      const orderRes = await checkoutApi.createOrder(orderPayload);
      const createdOrder = orderRes.data?.data;

      if (!createdOrder) {
        throw new Error('Order creation response did not contain order details.');
      }

      // Handle Cash On Delivery
      if (paymentMethod === 'COD') {
        await clearCart();
        navigate(`/order-success/${createdOrder._id}`, { replace: true });
        return;
      }

      // Handle Stripe Online Payment
      if (paymentMethod === 'Stripe') {
        try {
          const sessionRes = await checkoutApi.createPaymentSession({
            orderId: createdOrder._id,
            provider: 'stripe',
            idempotencyKey,
          });

          const checkoutUrl = sessionRes.data?.data?.checkoutUrl;
          if (checkoutUrl) {
            // Redirect to Stripe Checkout
            window.location.href = checkoutUrl;
          } else {
            // No hosted payment URL means the payment cannot be confirmed: never show success here
            setErrorMessage(
              'The payment page could not be opened. Your order is saved but unpaid. Please retry, or switch to Cash on Delivery.'
            );
          }
        } catch (paymentErr) {
          console.error('[Payment Session Error]', paymentErr);
          setErrorMessage(
            paymentErr.response?.data?.message ||
              'Payment gateway could not be reached. Order saved in your account. You may retry payment or switch to Cash on Delivery.'
          );
        }
      }
    } catch (err) {
      console.error('[Order Placement Error]', err);
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.data?.errors?.join(', ') ||
          err.message ||
          'Failed to place order. Please review your information and try again.'
      );
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const currentSummary = validationData || {
    subtotal,
    discountAmount: 0,
    shippingFee: subtotal >= 5000 ? 0 : 250,
    totalAmount: subtotal >= 5000 ? subtotal : subtotal + 250,
    currency: currency || 'PKR',
  };

  if (authLoading || !user) {
    return <BrandLoader fullScreen label="Checking your account" />;
  }

  return (
    <div className="min-h-screen bg-charcoal text-snow py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
          <div>
            <span className="text-xs uppercase tracking-editorial text-ice font-bold">
              Secure Checkout
            </span>
            <h1 className="font-editorial-serif text-2xl sm:text-4xl text-snow font-light mt-1">
              Atelier Final Order Confirmation
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-silver">
            <Lock className="w-3.5 h-3.5 text-ice" />
            <span>256-Bit TLS Security</span>
          </div>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-ice transition-all duration-300 z-0"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
            {STEPS.map((s) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    currentStep > s.id
                      ? 'bg-ice text-charcoal'
                      : currentStep === s.id
                      ? 'bg-cream text-charcoal ring-4 ring-white/10'
                      : 'bg-charcoal-dark border border-white/20 text-silver'
                  }`}
                >
                  {currentStep > s.id ? <Check className="w-4 h-4 stroke-[3]" /> : s.id}
                </div>
                <span
                  className={`text-[11px] mt-1.5 uppercase tracking-wider font-medium ${
                    currentStep === s.id ? 'text-cream' : 'text-silver-dark'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-950/40 border border-red-500/30 rounded flex items-start gap-3 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Two-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Form Steps */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel p-6 sm:p-8 rounded border border-white/10">
              {/* Step 1: Contact Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-snow border-b border-white/10 pb-3">
                    1. Contact Information
                  </h3>
                  <div>
                    <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={contactInfo.fullName}
                      onChange={(e) =>
                        setContactInfo({ ...contactInfo, fullName: e.target.value })
                      }
                      className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice"
                      placeholder="e.g. Zainab Malik"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, email: e.target.value })
                        }
                        className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice"
                        placeholder="you@domain.pk"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={contactInfo.phone}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, phone: e.target.value })
                        }
                        className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice font-mono"
                        placeholder="+92 300 1234567"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Shipping Address */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-snow border-b border-white/10 pb-3">
                    2. Atelier Shipping Address
                  </h3>
                  <div>
                    <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                      Street Address / House No. *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.street}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, street: e.target.value })
                      }
                      className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice"
                      placeholder="e.g. House 42-B, Sector Z, Phase 6 DHA"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                      Apartment / Suite / Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.apartment}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, apartment: e.target.value })
                      }
                      className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice"
                      placeholder="e.g. Near Bedian Road"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                        City *
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, city: e.target.value })
                        }
                        className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice"
                        placeholder="Lahore"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                        State / Province
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, state: e.target.value })
                        }
                        className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice"
                        placeholder="Punjab"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                        }
                        className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice font-mono"
                        placeholder="54000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      disabled
                      value={shippingAddress.country}
                      className="w-full bg-white/5 text-silver text-xs px-3.5 py-3 rounded border border-white/10 cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Delivery Method */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-snow border-b border-white/10 pb-3">
                    3. Delivery Speed & Handling
                  </h3>
                  <div
                    onClick={() => setDeliveryMethod('standard')}
                    className={`p-4 rounded border transition-colors cursor-pointer flex items-center justify-between ${
                      deliveryMethod === 'standard'
                        ? 'bg-cream/10 border-cream text-snow'
                        : 'bg-charcoal border-white/10 text-silver'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-ice" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-snow">
                          Atelier Insured Courier Delivery
                        </h4>
                        <p className="text-[11px] text-silver mt-0.5">
                          Estimated 3 to 5 business days across Pakistan
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-ice">
                      {subtotal >= 5000 ? 'Complimentary' : `${currency} 250`}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-silver tracking-wider mb-1.5">
                      Delivery Instructions for Rider (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Ring bell twice, deliver after 2 PM"
                      className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-ice"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Payment Method */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-snow border-b border-white/10 pb-3">
                    4. Select Payment Method
                  </h3>

                  {/* Cash On Delivery Option */}
                  <div
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-4 rounded border transition-colors cursor-pointer flex items-center justify-between ${
                      paymentMethod === 'COD'
                        ? 'bg-cream/10 border-cream text-snow'
                        : 'bg-charcoal border-white/10 text-silver'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Banknote className="w-5 h-5 text-ice" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-snow">
                          Cash on Delivery (COD)
                        </h4>
                        <p className="text-[11px] text-silver mt-0.5">
                          Pay cash to rider upon physical delivery at your doorstep
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-cream">
                      Available
                    </span>
                  </div>

                  {/* Stripe Card Option */}
                  <div
                    onClick={() => setPaymentMethod('Stripe')}
                    className={`p-4 rounded border transition-colors cursor-pointer flex items-center justify-between ${
                      paymentMethod === 'Stripe'
                        ? 'bg-cream/10 border-cream text-snow'
                        : 'bg-charcoal border-white/10 text-silver'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-ice" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-snow">
                          Credit / Debit Card (Stripe Gateway)
                        </h4>
                        <p className="text-[11px] text-silver mt-0.5">
                          Visa, Mastercard, American Express with 3D Secure authentication
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-ice">
                      Hosted Checkout
                    </span>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Confirm */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-snow border-b border-white/10 pb-3">
                    5. Review Order & Confirm
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-silver">
                    <div className="p-3 bg-charcoal rounded border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-ice block">Recipient</span>
                      <p className="text-snow font-medium">{contactInfo.fullName}</p>
                      <p>{contactInfo.email}</p>
                      <p className="font-mono">{contactInfo.phone}</p>
                    </div>

                    <div className="p-3 bg-charcoal rounded border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-ice block">
                        Delivery Destination
                      </span>
                      <p className="text-snow font-medium">{shippingAddress.street}</p>
                      {shippingAddress.apartment && <p>{shippingAddress.apartment}</p>}
                      <p>
                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-charcoal rounded border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ice block">
                        Payment Selection
                      </span>
                      <p className="text-snow font-medium mt-0.5">
                        {paymentMethod === 'COD'
                          ? 'Cash on Delivery (Pay upon arrival)'
                          : 'Online Card (Stripe Checkout Session)'}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="text-xs text-cream underline hover:text-white"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    onClick={handlePrevStep}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-silver hover:text-snow border border-white/10 rounded transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <Link
                    to="/cart"
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-silver hover:text-snow border border-white/10 rounded transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Bag</span>
                  </Link>
                )}

                {currentStep < 5 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={validating}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Stock...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    className="flex items-center gap-2 px-8 py-3.5 bg-burgundy hover:bg-burgundy-hover text-snow font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 shadow-xl shadow-burgundy/20 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Reserving &amp; Placing Order...</span>
                      </>
                    ) : (
                      <>
                        <span>Place Atelier Order</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Sticky Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel p-6 rounded border border-white/10 space-y-5 sticky top-24">
              <h3 className="font-editorial-serif text-lg text-snow font-medium border-b border-white/10 pb-3">
                Order Review ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items)
              </h3>

              {/* Item Snapshot List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-white/5 pr-1 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.key || item._id} className="pt-3 first:pt-0 flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-16 object-cover rounded bg-charcoal border border-white/5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <h4 className="font-medium text-snow truncate">{item.name}</h4>
                      <p className="text-[11px] text-silver mt-0.5">
                        Qty: {item.quantity} · Size: {item.size} · {item.color?.name}
                      </p>
                    </div>
                    <div className="text-right text-xs font-semibold text-snow shrink-0 font-mono">
                      {currentSummary.currency}{' '}
                      {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-silver">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-snow">
                    {currentSummary.currency} {currentSummary.subtotal?.toLocaleString()}
                  </span>
                </div>
                {currentSummary.discountAmount > 0 && (
                  <div className="flex justify-between text-cream">
                    <span>Discount Applied</span>
                    <span>
                      - {currentSummary.currency}{' '}
                      {Math.round(currentSummary.discountAmount).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Insured Delivery</span>
                  <span>
                    {currentSummary.shippingFee === 0 ? (
                      <span className="text-ice font-bold">Complimentary</span>
                    ) : (
                      `${currentSummary.currency} ${currentSummary.shippingFee?.toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between text-sm font-bold text-snow">
                  <span>Total Amount</span>
                  <span className="font-editorial-serif text-xl text-cream font-mono">
                    {currentSummary.currency}{' '}
                    {Math.round(currentSummary.totalAmount)?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-charcoal-dark/50 rounded text-[11px] text-silver-dark flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-ice shrink-0" />
                <span>
                  Inventory is reserved atomically upon final order placement.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
