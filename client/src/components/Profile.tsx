import React, { useState, useEffect } from "react";
import useUser from "@/hooks/useUser";
import { getUserReferrals } from "@/lib/api";
import { formatDate, formatPoints, formatTimeSinceJoin } from "@/lib/mining";
import { Referral } from "@/types";
import { shareWithTelegram, showAlert, hapticFeedback } from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const Profile: React.FC = () => {
  const { user, currentMiningSpeed } = useUser();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadReferrals = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const referralsData = await getUserReferrals(user.id);
        setReferrals(referralsData);
      } catch (error) {
        console.error("Error loading referrals:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReferrals();
  }, [user]);
  
  const copyReferralCode = async () => {
    if (!user) return;
    
    try {
      await navigator.clipboard.writeText(user.referralCode);
      hapticFeedback("success");
      showAlert("Referans kodu kopyalandı!");
    } catch (error) {
      console.error("Error copying referral code:", error);
      hapticFeedback("error");
      showAlert("Kopyalama başarısız. Lütfen manuel olarak kopyalayın.");
    }
  };
  
  const shareReferralLink = () => {
    if (!user) return;
    
    // Create Telegram app link with startapp parameter containing user's Telegram ID
    const telegramLink = `https://t.me/cosmofy_bot/app?startapp=${user.telegramId}`;
    
    // Create share message
    const shareMessage = `🚀 Cosmofy ile madencilik oyununa katıl ve birlikte kripto kazan!\n\nBu linkten katıl: ${telegramLink}`;
    
    // Share with Telegram
    try {
      shareWithTelegram(shareMessage);
    } catch (error) {
      console.error("Error sharing referral link:", error);
      // Fallback to clipboard
      navigator.clipboard.writeText(shareMessage)
        .then(() => showAlert("Referans linki kopyalandı!"))
        .catch(() => showAlert("Referans linki paylaşılamadı."));
    }
  };
  
  if (!user) return null;
  
  return (
    <section id="profile-section" className="px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Profil</h2>
      
      <Card className="bg-dark-card rounded-lg shadow mb-4">
        <CardContent className="p-4">
          <div className="flex items-center mb-4">
            {user.photoUrl ? (
              <img 
                src={user.photoUrl} 
                alt={`${user.firstName}'s Avatar`}
                className="w-16 h-16 rounded-full mr-4" 
              />
            ) : (
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                <span className="text-primary font-medium text-xl">
                  {user.firstName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{user.firstName}</h3>
              <div className="text-gray-400">ID: <span>{user.telegramId}</span></div>
              <div className="flex items-center mt-1">
                <i className="ri-vip-crown-fill mr-1 text-secondary"></i>
                <span className="font-mono font-medium">Seviye {user.level}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-dark-lighter rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs mb-1">Toplam Puan</div>
              <div className="font-mono font-medium">{formatPoints(user.points)}</div>
            </div>
            <div className="bg-dark-lighter rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs mb-1">Kazım Hızı</div>
              <div className="font-mono font-medium text-secondary">{currentMiningSpeed}/s</div>
            </div>
            <div className="bg-dark-lighter rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs mb-1">Referanslar</div>
              <div className="font-mono font-medium">{user.referralCount || 0}</div>
            </div>
          </div>
          
          <div className="border-t border-dark-lighter pt-4">
            <h4 className="font-medium mb-2">Üyelik Bilgileri</h4>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-400">Katılım Tarihi</span>
              <span>{formatDate(user.joinDate as Date)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-400">Toplam Görev</span>
              <span>{user.completedTasksCount}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-400">Boost Kullanımı</span>
              <span>{user.boostUsageCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Referral System */}
      <Card className="bg-dark-card rounded-lg shadow">
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">Referans Sistemi</h3>
          <p className="text-sm text-gray-400 mb-4">
            Arkadaşlarını davet et, her arkadaşın için 100 puan ve %5 ek kazım hızı kazan!
          </p>
          
          <div className="bg-dark-lighter rounded-lg p-3 mb-4">
            <div className="text-xs text-gray-400 mb-1">Referans Linkin</div>
            <div className="flex items-center justify-between">
              <code className="font-mono bg-dark p-2 rounded text-primary flex-1 overflow-x-auto text-xs">
                https://t.me/cosmofy_bot/app?startapp={user.telegramId}
              </code>
              <button 
                className="ml-2 p-2 bg-primary/20 text-primary rounded"
                onClick={() => {
                  navigator.clipboard.writeText(`https://t.me/cosmofy_bot/app?startapp=${user.telegramId}`)
                    .then(() => showAlert("Referans linki kopyalandı!"))
                    .catch(() => showAlert("Kopyalama başarısız. Lütfen manuel olarak kopyalayın."));
                }}
              >
                <i className="ri-file-copy-line"></i>
              </button>
            </div>
          </div>
          
          <Button
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition flex items-center justify-center"
            onClick={shareReferralLink}
          >
            <i className="ri-share-forward-line mr-2"></i>
            Arkadaşlarına Davet Gönder
          </Button>
          
          {/* Recent Referrals */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Son Referanslar</h4>
            
            {isLoading ? (
              // Loading state
              Array(3).fill(0).map((_, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-dark-lighter">
                  <div className="flex items-center">
                    <Skeleton className="w-8 h-8 rounded-full mr-2" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-10" />
                </div>
              ))
            ) : referrals.length > 0 ? (
              // Referrals list
              referrals.slice(0, 3).map((referral) => (
                <div 
                  key={referral.id} 
                  className="flex items-center justify-between py-2 border-b border-dark-lighter"
                >
                  <div className="flex items-center">
                    {referral.referred?.photoUrl ? (
                      <img 
                        src={referral.referred.photoUrl} 
                        alt={referral.referred.firstName} 
                        className="w-8 h-8 rounded-full mr-2" 
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mr-2">
                        <span className="text-primary text-xs">
                          {referral.referred?.firstName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{referral.referred?.firstName}</div>
                      <div className="text-xs text-gray-400">
                        {formatTimeSinceJoin(referral.createdAt as Date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-green-400 text-sm">+{referral.points}</div>
                </div>
              ))
            ) : (
              // No referrals
              <div className="py-4 text-center text-gray-400 text-sm border-b border-dark-lighter">
                Henüz referans yok. Arkadaşlarını davet et!
              </div>
            )}
            
            {referrals.length > 3 && (
              <button 
                className="mt-3 w-full py-2 bg-dark-lighter hover:bg-dark-lighter/80 text-gray-300 rounded-lg text-sm transition"
                onClick={() => showAlert("Bu özellik henüz tam olarak uygulanmadı.")}
              >
                Tüm Referansları Görüntüle
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Profile;
