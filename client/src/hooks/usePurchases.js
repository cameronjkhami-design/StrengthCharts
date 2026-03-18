import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { api } from '../utils/api';

const isNative = !!window.Capacitor?.isNativePlatform();

// RevenueCat API key — replace with your actual key
const REVENUECAT_API_KEY = 'your_revenuecat_api_key';
const ENTITLEMENT_ID = 'pro';

export function usePurchases() {
  const [product, setProduct] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { user, updateUser } = useAuth();
  const { setPremiumStatus } = usePremium();

  // Activate premium in backend + context
  const activatePremium = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.updatePremiumStatus(user.id, true);
      updateUser(data.user);
      setPremiumStatus(true);
    } catch (err) {
      console.error('Failed to save premium status:', err);
    }
  }, [user, updateUser, setPremiumStatus]);

  useEffect(() => {
    if (!isNative) return;

    const init = async () => {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');

        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
          appUserID: user?.id?.toString(),
        });

        // Check existing entitlements
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
          await activatePremium();
        }

        // Get available packages
        const { offerings } = await Purchases.getOfferings();
        const currentOffering = offerings.current;
        if (currentOffering?.availablePackages?.length > 0) {
          const pkg = currentOffering.availablePackages[0];
          setProduct({
            id: pkg.identifier,
            price: pkg.product.priceString,
            title: pkg.product.title,
            package: pkg,
          });
        }
      } catch (err) {
        console.warn('RevenueCat init error:', err);
      }
    };

    if (user) init();
  }, [user?.id, activatePremium]);

  const purchasePro = useCallback(async () => {
    if (!isNative || !product?.package) return;
    setPurchasing(true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: product.package,
      });

      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await activatePremium();
      }
    } catch (err) {
      if (err.code !== 'PURCHASE_CANCELLED') {
        console.error('Purchase error:', err);
      }
    } finally {
      setPurchasing(false);
    }
  }, [product, activatePremium]);

  const restorePurchases = useCallback(async () => {
    if (!isNative) return;
    setRestoring(true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await activatePremium();
      }
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setRestoring(false);
    }
  }, [activatePremium]);

  return {
    product,
    purchasing,
    restoring,
    purchasePro,
    restorePurchases,
    isNative,
  };
}
