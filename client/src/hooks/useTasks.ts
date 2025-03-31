import { useState, useEffect } from "react";
import { getTasks, getUserTasks, updateUserTaskProgress } from "@/lib/api";
import { Task, UserTask, TaskFilter } from "@/types";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { openTelegramLink, hapticFeedback } from "@/lib/telegram";

export const useTasks = () => {
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  
  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get all tasks using API endpoint instead of Firebase
        try {
          console.log("Trying to load tasks from API");
          const response = await fetch("/api/tasks");
          if (response.ok) {
            const tasksData = await response.json();
            console.log("Tasks loaded from API:", tasksData);
            setTasks(tasksData);
          } else {
            console.warn("Failed to load tasks from API, falling back to Firebase");
            // Fallback to Firebase
            const allTasks = await getTasks();
            setTasks(allTasks);
          }
        } catch (apiError) {
          console.warn("API error loading tasks, falling back to Firebase:", apiError);
          const allTasks = await getTasks();
          setTasks(allTasks);
        }
        
        // Get user's progress on tasks
        try {
          console.log("Trying to load user tasks from API");
          const response = await fetch(`/api/users/${user.id}/tasks`);
          if (response.ok) {
            const userTasksData = await response.json();
            console.log("User tasks loaded from API:", userTasksData);
            setUserTasks(userTasksData);
          } else {
            console.warn("Failed to load user tasks from API, falling back to Firebase");
            // Fallback to Firebase
            const userTasksData = await getUserTasks(user.id);
            setUserTasks(userTasksData);
          }
        } catch (apiError) {
          console.warn("API error loading user tasks, falling back to Firebase:", apiError);
          const userTasksData = await getUserTasks(user.id);
          setUserTasks(userTasksData);
        }
        
      } catch (error) {
        console.error("Error loading tasks:", error);
        toast({
          title: "Hata",
          description: "Görevler yüklenirken bir hata oluştu.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTasks();
  }, [user, toast]);
  
  // Filter tasks based on active filter
  const filteredTasks = tasks.filter(task => {
    if (activeFilter === "all") return true;
    return task.type === activeFilter;
  });
  
  // Get user progress for a task
  const getUserTaskProgress = (taskId: string): UserTask | undefined => {
    return userTasks.find(ut => ut.taskId === taskId);
  };
  
  // Handle task action (e.g., navigating to Telegram group)
  const handleTaskAction = async (task: Task) => {
    if (!user) return;
    
    try {
      console.log("Handling task action for task:", task);
      
      // Handle different task actions
      switch (task.telegramAction) {
        case "open_app":
          // Auto-complete this task as the app is already open
          try {
            console.log("Trying to update task progress via API");
            const response = await fetch(`/api/users/${user.id}/tasks/${task.id}/progress`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ progress: task.requiredAmount }),
            });
            
            if (response.ok) {
              console.log("Task progress updated via API");
              await refreshUser();
              hapticFeedback("success");
              toast({
                title: "Görev Tamamlandı",
                description: `${task.points} puan kazandınız!`,
                variant: "default"
              });
            } else {
              console.warn("Failed to update task progress via API, falling back to Firebase");
              await updateUserTaskProgress(user.id, task.id, task.requiredAmount);
              await refreshUser();
              hapticFeedback("success");
              toast({
                title: "Görev Tamamlandı",
                description: `${task.points} puan kazandınız!`,
                variant: "default"
              });
            }
          } catch (apiError) {
            console.warn("API error updating task progress, falling back to Firebase:", apiError);
            await updateUserTaskProgress(user.id, task.id, task.requiredAmount);
            await refreshUser();
            hapticFeedback("success");
            toast({
              title: "Görev Tamamlandı",
              description: `${task.points} puan kazandınız!`,
              variant: "default"
            });
          }
          break;
          
        case "send_message":
          if (task.telegramTarget) {
            try {
              // Open the Telegram link and attempt to mark as complete
              openTelegramLink(task.telegramTarget);
              
              // Update task progress
              try {
                const response = await fetch(`/api/users/${user.id}/tasks/${task.id}/progress`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ progress: 1 }), // Increment by 1
                });
                
                if (response.ok) {
                  console.log(`Task progress updated for ${task.telegramAction}`);
                  toast({
                    title: "Görev İlerlemesi",
                    description: "Görev ilerlemesi güncellendi.",
                  });
                  await refreshUser();
                }
              } catch (progressError) {
                console.error("Error updating task progress:", progressError);
              }
            } catch (linkError) {
              console.error("Error opening Telegram link:", linkError);
            }
          }
          break;
          
        case "join_channel":
          if (task.telegramTarget) {
            try {
              console.log("Opening channel link:", task.telegramTarget);
              
              // Open the Telegram link
              openTelegramLink(task.telegramTarget);
              
              // Mark task as complete
              try {
                // Complete the task directly
                await fetch(`/api/users/${user.id}/tasks/${task.id}/progress`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ progress: task.requiredAmount }),
                });
                
                toast({
                  title: "Görev Tamamlanıyor",
                  description: "Kanala katıldıktan sonra görev tamamlanacak",
                });
                
                await refreshUser();
              } catch (progressError) {
                console.error("Error updating channel join task progress:", progressError);
              }
            } catch (linkError) {
              console.error("Error opening Telegram channel link:", linkError);
            }
          }
          break;
          
        case "invite_friends":
          // This will be handled by a different component
          break;
          
        default:
          console.warn(`Unknown task action: ${task.telegramAction}`);
      }
      
      // Update user tasks after task action
      try {
        console.log("Trying to reload user tasks from API after action");
        const response = await fetch(`/api/users/${user.id}/tasks`);
        if (response.ok) {
          const userTasksData = await response.json();
          console.log("User tasks reloaded from API:", userTasksData);
          setUserTasks(userTasksData);
        } else {
          console.warn("Failed to reload user tasks from API, falling back to Firebase");
          const updatedUserTasks = await getUserTasks(user.id);
          setUserTasks(updatedUserTasks);
        }
      } catch (apiError) {
        console.warn("API error reloading user tasks, falling back to Firebase:", apiError);
        const updatedUserTasks = await getUserTasks(user.id);
        setUserTasks(updatedUserTasks);
      }
      
    } catch (error) {
      console.error("Error handling task action:", error);
      toast({
        title: "Hata",
        description: "Görev işlenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  // Update task progress
  const updateTaskProgress = async (taskId: string, progress: number) => {
    if (!user) return;
    
    try {
      await updateUserTaskProgress(user.id, taskId, progress);
      
      // Refresh user tasks
      const updatedUserTasks = await getUserTasks(user.id);
      setUserTasks(updatedUserTasks);
      
      // Refresh user data for updated points
      await refreshUser();
      
    } catch (error) {
      console.error("Error updating task progress:", error);
      toast({
        title: "Hata",
        description: "Görev ilerlemesi güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  return {
    tasks: filteredTasks,
    userTasks,
    isLoading,
    activeFilter,
    setActiveFilter,
    getUserTaskProgress,
    handleTaskAction,
    updateTaskProgress
  };
};

export default useTasks;
