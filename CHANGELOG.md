# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-21

### Added
- **Coordinate System Support**: Added "Invert Y Axis" option to support Arma Reforger's coordinate system (North = +Z) seamlessly.
- **Improved Calibration**: Updated the calibration tool to automatically calculate scale and origin with the new axis inversion logic.

### Fixed
- Addressed coordinate mismatch between Canvas (Y down) and Game World (Z up).

## [1.0.0] - 2026-01-21

### Added
- **Visual Zone Editor**:
    - Draw zones on custom map overlays using geometric shapes (Circle, Rectangle) or the Pen tool for complex polygons.
    - Support for multiple zone types: Safe, Restricted, PvP, Spawn, Objective, and Custom.
    - Visual styling options for zones (colors, dashed/dotted borders).
    - Grid snapping (`S` hotkey) and coordinate tracking.
    - Freehand drawing tool.
- **Export Capabilities**:
    - **Workbench Plugin**: Export directly to a `.c` script that acts as an Arma Reforger Workbench Plugin, automating the creation of Trigger Entities in the World Editor.
    - **Game Mode Component**: Export to `SCR_ZoneManagerComponent.c` for direct code integration into game modes.
    - **Map Overlay**: Export the map canvas as a high-quality `.tiff` image.
    - **JSON Project**: Save and load project state to `.json` files.
- **Tools & UI**:
    - Undo/Redo functionality.
    - Loop closing with visual feedback for the Pen tool.
    - Interactive map navigation (Pan, Zoom, Fit View).
    - Dark mode, tactical aesthetic UI.
- **Documentation**:
    - Comprehensive `docs.html` guide included in the application.
    - Branded `README.md` with usage instructions.

### Changed
- Rebranded application to **ARMOZE** (Arma Reforger Map Overlay Zone Editor).
- Updated logo to a vector-based tactical hex design.
