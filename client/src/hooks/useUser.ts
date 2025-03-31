import { useState, useEffect, useContext, useMemo } from "react";
import { UserContext } from "@/context/UserContext";
import { formatTimeRemaining, isMiningAvailable } from "@/lib/mining";

// Kullanıcı verisi için cache
let cachedUserData = null;
let cachedUserTime = 0;
const USER_CACHE_TTL = 30 * 1000; // 30 saniye cache süresi

// Custom hook to access user data and functionality
const useUser = () => {
  const { user, isLoading, error, activeBoosts, refreshUser, claimMiningRewards } = useContext(UserContext);
  
  // Madencilik hızını optimize etmek için useMemo kullan
  const currentMiningSpeed = useMemo(() => {
    if (!user) return 0;
    
    let speed = user.miningSpeed;
    
    // Apply boost multipliers
    activeBoosts.forEach(boost => {
      if (boost.boostType) {
        speed = Math.floor(speed * (boost.boostType.multiplier / 100));
      }
    });
    
    return speed;
  }, [user, activeBoosts]);
  
  // Sonraki madencilik zamanını hesapla
  const nextMiningTime = useMemo(() => {
    if (!user?.lastMiningTime) return "Şimdi";
    
    const lastMining = new Date(user.lastMiningTime);
    if (isMiningAvailable(lastMining)) {
      return "Şimdi";
    }
    
    const nextTime = new Date(lastMining);
    nextTime.setHours(nextTime.getHours() + 1);
    
    return formatTimeRemaining(nextTime);
  }, [user?.lastMiningTime]);
  
  // Madencilik durumunu hesapla
  const miningStatus = useMemo(() => {
    if (!user) {
      return { text: "Yükleniyor", className: "text-gray-400" };
    }
    
    // Madencilik emre amade mi kontrol et
    if (user.lastMiningTime && isMiningAvailable(user.lastMiningTime as Date)) {
      return { text: "Hazır", className: "text-green-400" };
    }
    
    // Boost durumuna göre sınıf belirle
    const hasActiveBoost = activeBoosts.length > 0;
    
    return {
      text: hasActiveBoost ? "Boost Aktif" : "Normal",
      className: hasActiveBoost ? "text-accent" : "text-primary"
    };
  }, [user, activeBoosts]);
  
  // Performansı iyileştirmek için yenileme fonksiyonunu önbelleğe alın
  const performRefresh = async () => {
    const now = Date.now();
    
    // Sadece 30 saniyede bir yenile
    if (cachedUserTime > 0 && now - cachedUserTime < USER_CACHE_TTL) {
      console.log("Using cached user data");
      return;
    }
    
    await refreshUser();
    cachedUserTime = now;
  };
  
  return {
    user,
    isLoading,
    error,
    activeBoosts,
    refreshUser: performRefresh,
    claimMiningRewards,
    currentMiningSpeed,
    nextMiningTime,
    miningStatus
  };
};

export default useUser;
