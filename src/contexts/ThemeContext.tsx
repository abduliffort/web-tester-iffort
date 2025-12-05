"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const htmlElement = document.documentElement;

    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        htmlElement.classList.remove("light");
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
        htmlElement.classList.add("light");
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      if (initialTheme === "dark") {
        htmlElement.classList.remove("light");
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
        htmlElement.classList.add("light");
      }
    }
  }, []);

  // Update dark class whenever theme changes
  useEffect(() => {
    if (mounted) {
      // console.log('🔄 Theme changed to:', theme);
      const htmlElement = document.documentElement;

      if (theme === "dark") {
        htmlElement.classList.remove("light");
        htmlElement.classList.add("dark");
        // console.log('🌙 Dark class ADDED to <html>');
      } else {
        htmlElement.classList.remove("dark");
        htmlElement.classList.add("light");
        // console.log('☀️ Light class ADDED to <html>');
      }
      // console.log('📋 HTML classes:', htmlElement.className);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    // console.log('🎨 Theme Toggle Clicked! Current:', theme, '→ New:', newTheme);
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    // console.log('✅ Theme saved to localStorage:', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
