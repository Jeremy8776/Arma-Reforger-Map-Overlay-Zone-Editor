# ARMOZE - Arma Reforger Map Overlay Zone Editor

<div align="center">
  <img src="logo.svg" alt="ARMOZE Logo - Arma Reforger Zone Editor" width="120" height="auto">
  <br><br>
  <b>The Ultimate Visual Zone Designer for Arma Reforger</b>
  <br>
  <i>Draw, design, and export map zones for your Reforger server in minutes.</i>
  <br><br>
  
  ![Version](https://img.shields.io/badge/version-1.3.1-blue.svg)
  ![License](https://img.shields.io/badge/license-MIT-green.svg)
  ![Arma Reforger](https://img.shields.io/badge/Arma_Reforger-Compatible-orange.svg)
  ![Platform](https://img.shields.io/badge/platform-Web_Browser-lightgrey.svg)
  
  <br>
  
  [**Live Demo**](https://jeremy8776.github.io/Arma-Reforger-Map-Overlay-Zone-Editor/) · [**Documentation**](https://jeremy8776.github.io/Arma-Reforger-Map-Overlay-Zone-Editor/docs.html) · [**Changelog**](CHANGELOG.md)
  
</div>

---

## What is ARMOZE?

**ARMOZE** (Arma Reforger Map Overlay Zone Editor) is a **free, open-source web application** that allows Arma Reforger modders and server administrators to visually create and manage map zones without writing a single line of code.

Instead of manually calculating coordinates or scripting trigger areas, simply:
1. Load your map image
2. Draw your zones visually
3. Export directly to game-ready formats

## Key Features

### Visual Zone Drawing Tools
- **Circle Tool** - Perfect for radial safe zones and spawn areas
- **Rectangle Tool** - Ideal for base boundaries and capture points
- **Polygon/Pen Tool** - Create complex irregular shapes with precision
- **Freehand Tool** - Sketch natural boundaries quickly
- **Grid Snapping** - Align zones perfectly with toggleable snap grid

### Zone Types
- Safe Zones
- Restricted Areas
- PvP Zones
- Spawn Points
- Objectives
- Custom Zones
- 20+ Military Markers (Infantry, Armor, Artillery, Medical, etc.)

### Export Formats
| Format | Description | Use Case |
|--------|-------------|----------|
| **Workbench Plugin** | Auto-generates trigger entities | Import zones directly into World Editor |
| **EnfusionScript** | Drop-in GameMode component | Runtime zone detection in scripts |
| **PNG/TIFF Overlay** | Transparent image export | Map overlays and UI textures |
| **JSON Project** | Save/load project files | Collaboration and backups |

### Professional Features
- **Undo/Redo** - Full history support (Ctrl+Z / Ctrl+Y)
- **Copy/Paste** - Duplicate zones quickly (Ctrl+C / Ctrl+V)
- **Multi-Tab Support** - Work with multiple maps simultaneously
- **Label Customization** - Colors, sizes, shadows, and backgrounds
- **Map Calibration** - Precise coordinate alignment tool

## Quick Start

### Option 1: Use Online (Recommended)
Visit the live demo: **[ARMOZE Web App](https://jeremy8776.github.io/Arma-Reforger-Map-Overlay-Zone-Editor/)**

### Option 2: Run Locally
```bash
git clone https://github.com/Jeremy8776/Arma-Reforger-Map-Overlay-Zone-Editor.git
cd Arma-Reforger-Map-Overlay-Zone-Editor
# Open index.html in your browser, or use a local server:
npx serve .
```

## Workflow Example

### Creating Zones for Your Server

1. **Export your map** from Arma Reforger Workbench (or use a satellite screenshot)
2. **Drag & drop** the image into ARMOZE
3. **Select a tool** (Circle, Rectangle, Pen, etc.)
4. **Draw your zones** - safe areas, PvP zones, spawn points
5. **Customize** names, colors, and zone types
6. **Export** to your preferred format

### Importing into World Editor

1. Click **Export → Workbench Plugin**
2. Save the `.c` file to: `YourMod/scripts/WorkbenchGame/WorldEditor/`
3. In Reforger World Editor, press **Ctrl + Shift + I**
4. Your zones appear as real trigger entities!

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Select Tool | `V` |
| Rectangle | `R` |
| Circle | `C` |
| Line | `L` |
| Pen Tool | `P` |
| Freehand | `D` |
| Grid Snap | `S` |
| Fit View | `F` |
| Zoom In/Out | `+` / `-` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` |
| Copy | `Ctrl + C` |
| Paste | `Ctrl + V` |
| Duplicate | `Ctrl + D` |
| Delete | `Delete` |
| Export | `Ctrl + E` |

## Screenshots

<div align="center">
  <i>Coming soon - Screenshots of the editor in action</i>
</div>

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Styling**: CSS3 with custom design system
- **Icons**: Lucide Icons
- **No Dependencies**: Runs entirely in the browser

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Jeremy8776/Arma-Reforger-Map-Overlay-Zone-Editor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Jeremy8776/Arma-Reforger-Map-Overlay-Zone-Editor/discussions)

---

<div align="center">
  <b>Made for the Arma Reforger Community</b>
  <br>
  <sub>If this tool helped you, consider giving it a ⭐ on GitHub!</sub>
</div>
