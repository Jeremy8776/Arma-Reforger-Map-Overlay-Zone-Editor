# Exporting & Integration

Once you have designed your zones, it's time to get them into Arma Reforger.

## Method 1: Workbench Plugin (Recommended)
This method automatically creates real **Trigger Entities** in your World Editor.

### 1. Export
1.  Click the **Export** button in the top right.
2.  Choose **Workbench Plugin (.c)** format.
3.  Download the `ImportZonesPlugin.c` file.

### 2. Install
1.  Locate your mod folder.
2.  Place the file into: `YourMod/scripts/WorkbenchGame/WorldEditor/`.
3.  *Note: You may need to create these folders if they don't exist.*
4.  Restart the Reforger Workbench.

### 3. Run
1.  Open your terrain in the **World Editor**.
2.  In the top menu, go to **Plugins** -> **Import Zones from Editor**.
    *   *Shortcut*: `Ctrl + Shift + I`
3.  Done! Your zones are now entities in the world hierarchy.

---

## Method 2: Game Mode Component (Scripting)
Use this if you want to handle zones purely via script logic (e.g., checking if a player is in a zone) without physical entities.

1.  Select **EnfusionScript (.c)** format in the Export menu.
2.  Download `SCR_ZoneManagerComponent.c`.
3.  Place it in `YourMod/scripts/Game/GameMode/`.
4.  In World Editor, select your `SCR_BaseGameMode` entity.
5.  Add Component -> Select `SCR_ZoneManagerComponent`.

Your game mode now has awareness of all your custom zones!

---

## Method 3: Image Overlay
Export a visual representation of your zones to use as an in-game map texture or loading screen.

1.  Select **Image Overlay (.png)** or **TIFF**.
2.  Configure settings:
    *   **Texture Suffix**: `_A` (Alpha), `_BCR` (Color), or `_BCA`.
    *   **Resize to Power of 2**: Recommended for game engine compatibility (e.g., 2048x2048).
3.  Download and import into Workbench as a texture resource.
