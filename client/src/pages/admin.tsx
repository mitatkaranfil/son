import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  getTasks as getAllTasks, 
  getBoostTypes as getAllBoostTypes, 
  createTask, 
  updateTask, 
  deleteTask,
  createBoostType,
  updateBoostType,
  deleteBoostType
} from "@/lib/api";
import { Task, BoostType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Admin authentication placeholder
// In a real app, this would verify admin credentials
const isAdmin = true;

const Admin: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boosts, setBoosts] = useState<BoostType[]>([]);
  const [activeTab, setActiveTab] = useState("tasks");
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  useEffect(() => {
    // Check if user is admin
    if (!isAdmin) {
      navigate("/");
      return;
    }
    
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log("Loading admin data...");
      
      // Try API first
      try {
        console.log("Trying to load tasks from API");
        const response = await fetch("/api/admin/tasks?test=true", {
          headers: {
            "X-Test-Mode": "true"
          }
        });
        if (response.ok) {
          const tasksData = await response.json();
          console.log("Tasks loaded from API:", tasksData);
          setTasks(tasksData);
        } else {
          console.warn("Failed to load tasks from API, falling back to Firebase");
          // Fallback to Firebase
          const tasksData = await getAllTasks();
          console.log("Tasks loaded from Firebase:", tasksData);
          setTasks(tasksData);
        }
      } catch (apiError) {
        console.warn("API error loading tasks, falling back to Firebase:", apiError);
        const tasksData = await getAllTasks();
        console.log("Tasks loaded from Firebase:", tasksData);
        setTasks(tasksData);
      }
      
      // Try API for boosts
      try {
        console.log("Trying to load boosts from API");
        const response = await fetch("/api/admin/boosts?test=true", {
          headers: {
            "X-Test-Mode": "true"
          }
        });
        if (response.ok) {
          const boostsData = await response.json();
          console.log("Boosts loaded from API:", boostsData);
          setBoosts(boostsData);
        } else {
          console.warn("Failed to load boosts from API, falling back to Firebase");
          // Fallback to Firebase
          const boostsData = await getAllBoostTypes();
          console.log("Boosts loaded from Firebase:", boostsData);
          setBoosts(boostsData);
        }
      } catch (apiError) {
        console.warn("API error loading boosts, falling back to Firebase:", apiError);
        const boostsData = await getAllBoostTypes();
        console.log("Boosts loaded from Firebase:", boostsData);
        setBoosts(boostsData);
      }
      
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Veri Yükleme Hatası",
        description: "Admin verisi yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Task form schema
  const taskFormSchema = z.object({
    title: z.string().min(3, "Başlık en az 3 karakter olmalıdır"),
    description: z.string().min(5, "Açıklama en az 5 karakter olmalıdır"),
    type: z.enum(["daily", "weekly", "special"]),
    points: z.coerce.number().min(1, "Puan en az 1 olmalıdır"),
    requiredAmount: z.coerce.number().min(1, "Gerekli miktar en az 1 olmalıdır"),
    isActive: z.boolean().default(true),
    telegramAction: z.string().optional(),
    telegramTarget: z.string().optional().nullable(),
  });
  
  // Boost form schema
  const boostFormSchema = z.object({
    name: z.string().min(3, "İsim en az 3 karakter olmalıdır"),
    description: z.string().min(5, "Açıklama en az 5 karakter olmalıdır"),
    multiplier: z.coerce.number().min(100, "Çarpan en az 100 olmalıdır (1x)"),
    durationHours: z.coerce.number().min(1, "Süre en az 1 saat olmalıdır"),
    price: z.coerce.number().min(1, "Fiyat en az 1 olmalıdır"),
    isActive: z.boolean().default(true),
    iconName: z.string().default("rocket"),
    colorClass: z.string().default("blue"),
    isPopular: z.boolean().default(false),
  });
  
  // Task management
  const handleAddTask = async (data: z.infer<typeof taskFormSchema>) => {
    try {
      console.log("Adding task with data:", JSON.stringify(data));
      
      // Try API first
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Task added via API:", result);
          toast({
            title: "Görev Eklendi",
            description: "Yeni görev başarıyla eklendi.",
          });
          loadData();
          return;
        } else {
          console.warn("Failed to add task via API, falling back to Firebase");
        }
      } catch (apiError) {
        console.warn("API error adding task, falling back to Firebase:", apiError);
      }
      
      // Firebase fallback
      const result = await createTask(data);
      console.log("Task added via Firebase:", result);
      
      toast({
        title: "Görev Eklendi",
        description: "Yeni görev başarıyla eklendi.",
      });
      loadData();
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Görev Ekleme Hatası",
        description: "Yeni görev eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateTask = async (id: string, data: z.infer<typeof taskFormSchema>) => {
    try {
      console.log("Updating task with ID:", id, "and data:", JSON.stringify(data));
      
      // Make sure telegramTarget is null if empty
      if (data.telegramTarget === "") {
        data.telegramTarget = null;
      }
      
      // Try API first
      try {
        const response = await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Task updated via API:", result);
          toast({
            title: "Görev Güncellendi",
            description: "Görev başarıyla güncellendi.",
          });
          loadData();
          return;
        } else {
          console.warn("Failed to update task via API, falling back to Firebase");
        }
      } catch (apiError) {
        console.warn("API error updating task, falling back to Firebase:", apiError);
      }
      
      // Firebase fallback
      await updateTask(id, data);
      console.log("Task updated via Firebase");
      
      toast({
        title: "Görev Güncellendi",
        description: "Görev başarıyla güncellendi.",
      });
      loadData();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Görev Güncelleme Hatası",
        description: "Görev güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteTask = async (id: string) => {
    try {
      console.log("Deleting task with ID:", id);
      
      // Try API first
      try {
        const response = await fetch(`/api/tasks/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          console.log("Task deleted via API");
          toast({
            title: "Görev Silindi",
            description: "Görev başarıyla silindi.",
          });
          loadData();
          return;
        } else {
          console.warn("Failed to delete task via API, falling back to Firebase");
        }
      } catch (apiError) {
        console.warn("API error deleting task, falling back to Firebase:", apiError);
      }
      
      // Firebase fallback
      await deleteTask(id);
      console.log("Task deleted via Firebase");
      
      toast({
        title: "Görev Silindi",
        description: "Görev başarıyla silindi.",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Görev Silme Hatası",
        description: "Görev silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Boost management
  const handleAddBoost = async (data: z.infer<typeof boostFormSchema>) => {
    try {
      await createBoostType(data);
      toast({
        title: "Boost Eklendi",
        description: "Yeni boost başarıyla eklendi.",
      });
      loadData();
    } catch (error) {
      console.error("Error adding boost:", error);
      toast({
        title: "Boost Ekleme Hatası",
        description: "Yeni boost eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateBoost = async (id: string, data: z.infer<typeof boostFormSchema>) => {
    try {
      console.log("Updating boost with ID:", id, "and data:", JSON.stringify(data));
      
      // Try API first
      try {
        const response = await fetch(`/api/boosts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Boost updated via API:", result);
          toast({
            title: "Boost Güncellendi",
            description: "Boost başarıyla güncellendi.",
          });
          loadData();
          return;
        } else {
          console.warn("Failed to update boost via API, falling back to Firebase");
        }
      } catch (apiError) {
        console.warn("API error updating boost, falling back to Firebase:", apiError);
      }
      
      // Firebase fallback
      await updateBoostType(id, data);
      console.log("Boost updated via Firebase");
      
      toast({
        title: "Boost Güncellendi",
        description: "Boost başarıyla güncellendi.",
      });
      loadData();
    } catch (error) {
      console.error("Error updating boost:", error);
      toast({
        title: "Boost Güncelleme Hatası",
        description: "Boost güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteBoost = async (id: string) => {
    try {
      console.log("Deleting boost with ID:", id);
      
      // Try API first
      try {
        const response = await fetch(`/api/boosts/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          console.log("Boost deleted via API");
          toast({
            title: "Boost Silindi",
            description: "Boost başarıyla silindi.",
          });
          loadData();
          return;
        } else {
          console.warn("Failed to delete boost via API, falling back to Firebase");
        }
      } catch (apiError) {
        console.warn("API error deleting boost, falling back to Firebase:", apiError);
      }
      
      // Firebase fallback
      await deleteBoostType(id);
      console.log("Boost deleted via Firebase");
      
      toast({
        title: "Boost Silindi",
        description: "Boost başarıyla silindi.",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting boost:", error);
      toast({
        title: "Boost Silme Hatası",
        description: "Boost silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  // Task Dialog Component
  const TaskDialog: React.FC<{
    task?: Task;
    onSubmit: (data: z.infer<typeof taskFormSchema>) => void;
    buttonText: string;
  }> = ({ task, onSubmit, buttonText }) => {
    // Create a clean default object without type errors
    const getDefaultValues = () => {
      if (task) {
        // Convert task data to match the schema
        return {
          title: task.title,
          description: task.description,
          type: task.type as "daily" | "weekly" | "special",
          points: task.points,
          requiredAmount: task.requiredAmount,
          isActive: task.isActive,
          telegramAction: task.telegramAction || "",
          telegramTarget: task.telegramTarget || "",
        };
      }
      
      return {
        title: "",
        description: "",
        type: "daily" as const,
        points: 10,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "",
        telegramTarget: "",
      };
    };
    
    const form = useForm<z.infer<typeof taskFormSchema>>({
      resolver: zodResolver(taskFormSchema),
      defaultValues: getDefaultValues(),
    });
    
    const [isOpen, setIsOpen] = useState(false);
    
    const handleFormSubmit = (data: z.infer<typeof taskFormSchema>) => {
      console.log("Task form submitted with data:", JSON.stringify(data));
      
      // Make sure telegramTarget is null if empty
      if (data.telegramTarget === "") {
        data.telegramTarget = null;
      }
      
      onSubmit(data);
      setIsOpen(false);
    };
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant={task ? "outline" : "default"}>{buttonText}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{task ? "Görevi Düzenle" : "Yeni Görev Ekle"}</DialogTitle>
            <DialogDescription>
              {task ? "Görev bilgilerini düzenle" : "Yeni bir görev ekle"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl>
                      <Input placeholder="Görev başlığı" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Görev açıklaması" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tür</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Görev türü" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Günlük</SelectItem>
                          <SelectItem value="weekly">Haftalık</SelectItem>
                          <SelectItem value="special">Özel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puan</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Puan değeri"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requiredAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gerekli Miktar</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Gerekli miktar"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Aktif</FormLabel>
                        <FormDescription>
                          Görevin kullanıcılara gösterilip gösterilmeyeceği
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="telegramAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram Aksiyonu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Telegram aksiyonu (ör: join_channel)"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      open_app, send_message, join_channel, invite_friends vb.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="telegramTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram Hedefi</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Telegram hedefi (ör: @kanal_adi)"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Grup veya kanal adresi
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">Kaydet</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Boost Dialog Component
  const BoostDialog: React.FC<{
    boost?: BoostType;
    onSubmit: (data: z.infer<typeof boostFormSchema>) => void;
    buttonText: string;
  }> = ({ boost, onSubmit, buttonText }) => {
    const form = useForm<z.infer<typeof boostFormSchema>>({
      resolver: zodResolver(boostFormSchema),
      defaultValues: boost || {
        name: "",
        description: "",
        multiplier: 150,
        durationHours: 24,
        price: 500,
        isActive: true,
        iconName: "rocket",
        colorClass: "blue",
        isPopular: false,
      },
    });
    
    const [isOpen, setIsOpen] = useState(false);
    
    const handleFormSubmit = (data: z.infer<typeof boostFormSchema>) => {
      onSubmit(data);
      setIsOpen(false);
    };
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant={boost ? "outline" : "default"}>{buttonText}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{boost ? "Boost Düzenle" : "Yeni Boost Ekle"}</DialogTitle>
            <DialogDescription>
              {boost ? "Boost bilgilerini düzenle" : "Yeni bir boost ekle"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İsim</FormLabel>
                    <FormControl>
                      <Input placeholder="Boost ismi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Boost açıklaması" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Çarpan (x100)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Çarpan (150 = 1.5x)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        150 = 1.5x, 200 = 2x, 300 = 3x
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="durationHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Süre (Saat)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Süre (saat)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiyat</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Fiyat"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Aktif</FormLabel>
                        <FormDescription>
                          Boostun mağazada gösterilip gösterilmeyeceği
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="iconName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İkon Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="İkon adı" {...field} />
                      </FormControl>
                      <FormDescription>
                        Remix Icon ismi (ör: rocket)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="colorClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renk Sınıfı</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Renk seç" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="blue">Mavi</SelectItem>
                          <SelectItem value="purple">Mor</SelectItem>
                          <SelectItem value="yellow">Sarı</SelectItem>
                          <SelectItem value="red">Kırmızı</SelectItem>
                          <SelectItem value="green">Yeşil</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="isPopular"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Popüler</FormLabel>
                      <FormDescription>
                        Bu boostu popüler olarak işaretle
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">Kaydet</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="tasks">Görevler</TabsTrigger>
          <TabsTrigger value="boosts">Boostlar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Görev Yönetimi</CardTitle>
                  <CardDescription>
                    Tüm görevleri görüntüle, ekle, düzenle veya sil
                  </CardDescription>
                </div>
                <TaskDialog
                  onSubmit={handleAddTask}
                  buttonText="Yeni Görev Ekle"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Yükleniyor...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Puan</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            {task.type === "daily"
                              ? "Günlük"
                              : task.type === "weekly"
                              ? "Haftalık"
                              : "Özel"}
                          </TableCell>
                          <TableCell>{task.points}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                task.isActive
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {task.isActive ? "Aktif" : "Pasif"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <TaskDialog
                                task={task}
                                onSubmit={(data) => handleUpdateTask(task.id, data)}
                                buttonText="Düzenle"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                Sil
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Henüz görev yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="boosts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Boost Yönetimi</CardTitle>
                  <CardDescription>
                    Tüm boostları görüntüle, ekle, düzenle veya sil
                  </CardDescription>
                </div>
                <BoostDialog
                  onSubmit={handleAddBoost}
                  buttonText="Yeni Boost Ekle"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Yükleniyor...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İsim</TableHead>
                      <TableHead>Çarpan</TableHead>
                      <TableHead>Süre</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boosts.length > 0 ? (
                      boosts.map((boost) => (
                        <TableRow key={boost.id}>
                          <TableCell className="font-medium">{boost.name}</TableCell>
                          <TableCell>{boost.multiplier / 100}x</TableCell>
                          <TableCell>{boost.durationHours} saat</TableCell>
                          <TableCell>{boost.price} puan</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                boost.isActive
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {boost.isActive ? "Aktif" : "Pasif"}
                            </span>
                            {boost.isPopular && (
                              <span className="ml-2 px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                                Popüler
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <BoostDialog
                                boost={boost}
                                onSubmit={(data) => handleUpdateBoost(boost.id, data)}
                                buttonText="Düzenle"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteBoost(boost.id)}
                              >
                                Sil
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Henüz boost yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => navigate("/")}>
          Ana Sayfaya Dön
        </Button>
      </div>
    </div>
  );
};

export default Admin;
