import { Plus } from "../../../shared/ui/icons";
import { useUiStore } from "../../../shared/lib/ui-store";
import {
  // AttentionCount,
  PlaceLink,
  places,
  // useAttentionCount,
} from "./Navigation";

/**
 * Phone/tablet navigation (<1024px): the five places in a dock that floats
 * above the page, with Planning raised in the middle as the moonstone, and
 * creating as one floating button above it. Not a shrunken rail — it replaces it.
 */
export function TabBar() {
  const openCreate = useUiStore((state) => state.openCreate);
  // const attention = useAttentionCount();
  if (useUiStore((state) => state.focused)) return null;

  return (
    <>
      <nav className="tabbar" aria-label="ناوبری اصلی">
        <div className="tabbar-dock">
          {places.map((place) => {
            const Icon = place.icon;
            const ai = place.to === "/planning";
            return (
              <PlaceLink key={place.to} place={place} className="tab-item">
                <span className={ai ? "tab-ai mb-1.5" : "tab-icon"}>
                  <Icon size={ai ? 22 : 21} aria-hidden="true" />
                </span>
                {place.label}
                {place.to === "/today"}
              </PlaceLink>
            );
          })}
        </div>
      </nav>
      <button
        className="create-fab"
        type="button"
        onClick={() => openCreate("menu")}
        aria-label="افزودن"
      >
        <Plus size={22} aria-hidden="true" />
      </button>
    </>
  );
}
