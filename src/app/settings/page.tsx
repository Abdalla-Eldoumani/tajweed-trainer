"use client";

import { Card } from "@/components/ui/Card";
import { useSettings } from "@/hooks/useSettings";
import { RECITERS } from "@/lib/audio-api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-sm text-text-muted mt-2">Customize your learning experience.</p>
      </div>

      {/* Reciter */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">Reciter</h2>
        <div className="space-y-2" role="radiogroup" aria-label="Choose reciter">
          {RECITERS.map((reciter) => (
            <label
              key={reciter.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                settings.reciter === reciter.id
                  ? "bg-primary/10 dark:bg-primary-light/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <input
                type="radio"
                name="reciter"
                value={reciter.id}
                checked={settings.reciter === reciter.id}
                onChange={() => updateSettings({ reciter: reciter.id })}
                className="accent-primary"
                aria-label={reciter.name}
              />
              <div>
                <p className="text-sm font-medium">{reciter.name}</p>
                <p className="text-xs text-text-muted">{reciter.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Playback Speed */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">Playback Speed</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Playback speed">
          {[0.5, 0.75, 1.0].map((speed) => (
            <button
              key={speed}
              onClick={() => updateSettings({ playbackSpeed: speed })}
              className={cn(
                "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                settings.playbackSpeed === speed
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              role="radio"
              aria-checked={settings.playbackSpeed === speed}
              aria-label={`${speed}x speed`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </Card>

      {/* Font Size */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">Arabic Font Size</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Arabic font size">
          {([
            { value: "normal", label: "Normal" },
            { value: "large", label: "Large" },
            { value: "xlarge", label: "X-Large" },
          ] as const).map((size) => (
            <button
              key={size.value}
              onClick={() => updateSettings({ fontSize: size.value })}
              className={cn(
                "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                settings.fontSize === size.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              role="radio"
              aria-checked={settings.fontSize === size.value}
              aria-label={`${size.label} font size`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Display Options */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">Display Options</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Show Transliteration</span>
            <input
              type="checkbox"
              checked={settings.showTransliteration}
              onChange={(e) => updateSettings({ showTransliteration: e.target.checked })}
              className="accent-primary w-4 h-4"
              aria-label="Show transliteration"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Show Translation</span>
            <input
              type="checkbox"
              checked={settings.showTranslation}
              onChange={(e) => updateSettings({ showTranslation: e.target.checked })}
              className="accent-primary w-4 h-4"
              aria-label="Show translation"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Dark Mode</span>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => updateSettings({ darkMode: e.target.checked })}
              className="accent-primary w-4 h-4"
              aria-label="Toggle dark mode"
            />
          </label>
        </div>
      </Card>
    </div>
  );
}
