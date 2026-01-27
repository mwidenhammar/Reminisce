import { Image, BookOpen, Mic } from "lucide-react";
import { ReactNode } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface TabNavigationProps {
  activeTab: "gallery" | "library" | "capture" | null;
  onTabChange: (tab: "gallery" | "library" | "capture") => void;
}

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const { t } = useTranslation();

  const tabs: { id: "gallery" | "library" | "capture"; icon: ReactNode; descriptionKey: string }[] = [
    { id: "gallery", icon: <Image className="w-6 h-6" />, descriptionKey: "browsePhotos" },
    { id: "library", icon: <BookOpen className="w-6 h-6" />, descriptionKey: "savedMemories" },
    { id: "capture", icon: <Mic className="w-6 h-6" />, descriptionKey: "writeOrRecord" },
  ];

  return (
    <nav className="flex items-center bg-card/95 backdrop-blur-md border-b border-border/50">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-6 py-3 transition-all flex flex-col items-center gap-1 ${
            activeTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-foreground/80 hover:text-foreground hover:bg-muted/30"
          } ${index < tabs.length - 1 ? "border-r border-border/50" : ""}`}
        >
          {tab.icon}
          <span className="text-xs italic opacity-80">{t('nav', tab.descriptionKey)}</span>
        </button>
      ))}
    </nav>
  );
};

export default TabNavigation;
