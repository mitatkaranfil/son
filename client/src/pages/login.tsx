import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Lock, User } from "lucide-react";

// Basit bir alert gösterme fonksiyonu
const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
  alert(`${type === 'success' ? '✓' : '⚠️'} ${message}`);
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      showAlert("Kullanıcı adı ve şifre gereklidir");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });
      
      if (response.ok) {
        showAlert("Giriş Başarılı. Yönlendiriliyorsunuz...", "success");
        
        // Kullanıcıyı ana sayfaya yönlendir
        setTimeout(() => {
          setLocation("/");
        }, 1000);
      } else {
        const data = await response.json();
        showAlert(data.message || "Kullanıcı adı veya şifre hatalı");
      }
    } catch (error) {
      showAlert("Sunucuya bağlanırken bir hata oluştu. Lütfen tekrar deneyin.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Giriş Yap</CardTitle>
          <CardDescription className="text-center">
            Yönetici paneline erişmek için giriş yapın
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  type="text"
                  placeholder="Kullanıcı Adı"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  type="password"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </Button>
          </CardFooter>
        </form>
        
        <div className="p-4 text-center text-sm">
          <a href="/telegram" className="text-blue-500 hover:underline">
            Telegram ile Giriş Yap
          </a>
        </div>
      </Card>
    </div>
  );
} 