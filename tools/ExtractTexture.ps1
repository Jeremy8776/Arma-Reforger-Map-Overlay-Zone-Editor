# MapSave Texture Extractor Helper Script
# This script searches all PAK files for a texture and extracts/converts it
# Can be run from Workbench (automated) or manually (interactive)

param(
    [Parameter(Mandatory = $false)]
    [string]$ResourcePath,  # e.g., "UI/Textures/Map/worlds/Arland/ArlandRasterized.edds" or just "ArlandRasterized"
    
    [Parameter(Mandatory = $false)]
    [string]$OutputDir,     # e.g., "C:/Users/.../MapSave_Exports"
    
    [Parameter(Mandatory = $false)]
    [string]$ToolsDir,      # Directory containing PakInspector.exe and edds2image.exe
    
    [Parameter(Mandatory = $false)]
    [string]$ScanDir,       # Directory containing PAK files to scan. Defaults to GameDir/addons/data if empty.
    
    [string]$GameDir = "C:\Program Files (x86)\Steam\steamapps\common\Arma Reforger",
    
    [string]$OpenFolder = "1"  # "1" to open folder after export, "0" to skip
)

$ErrorActionPreference = "Continue"

# --- Setup Tools Directory ---
# If ToolsDir wasn't passed, or if the passed one doesn't have the files, try PSScriptRoot
if (-not $ToolsDir -or -not (Test-Path (Join-Path $ToolsDir "PakInspector.exe"))) {
    if ($PSScriptRoot) {
        $ToolsDir = $PSScriptRoot
    }
    else {
        # Fallback for some PS environments where PSScriptRoot might be empty (rare)
        $ToolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    }
}

$pakInspector = Join-Path $ToolsDir "PakInspector.exe"
$edds2image = Join-Path $ToolsDir "edds2image.exe"

Write-Host "=== MapSave Texture Extractor ===" -ForegroundColor Cyan
Write-Host "Tools Dir: $ToolsDir" -ForegroundColor Gray
Write-Host "PakInspector: $pakInspector" -ForegroundColor Gray

# --- Validate Tools ---
if (-not (Test-Path $pakInspector)) {
    Write-Host "ERROR: PakInspector.exe not found at: $pakInspector" -ForegroundColor Red
    Write-Host "Ensure this script is in the Tools folder with the executables."
    Read-Host "Press Enter to exit"
    exit 1
}
if (-not (Test-Path $edds2image)) {
    Write-Host "ERROR: edds2image.exe not found at: $edds2image" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# --- Interactive Mode Input ---
# If ResourcePath is not provided via arguments, we assume interactive mode
$interactiveMode = [string]::IsNullOrWhiteSpace($ResourcePath)

if ($interactiveMode) {
    Write-Host "Interactive Mode Enabled" -ForegroundColor Green
    Write-Host ""
    
    # 1. Ask for Scan Directory
    $defaultScan = Join-Path $GameDir "addons\data"
    Write-Host "Enter directory to scan for PAK files."
    Write-Host "Default: $defaultScan" -ForegroundColor Gray
    $inputScan = Read-Host "Scan Directory [Press Enter for Default]"
    
    if (-not [string]::IsNullOrWhiteSpace($inputScan)) {
        $ScanDir = $inputScan.Trim('"').Trim('''')
    }
    else {
        $ScanDir = $defaultScan
    }
    
    # 2. Ask for Output Directory
    $defaultOut = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "MapSave_Exports"
    Write-Host ""
    Write-Host "Enter output directory."
    Write-Host "Default: $defaultOut" -ForegroundColor Gray
    $inputOut = Read-Host "Output Directory [Press Enter for Default]"
    
    if (-not [string]::IsNullOrWhiteSpace($inputOut)) {
        $OutputDir = $inputOut.Trim('"').Trim('''')
    }
    else {
        $OutputDir = $defaultOut
    }
}

# Ensure output directory exists
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

# Define temp working directory
$tempDir = Join-Path $OutputDir "_temp_extract"

# --- Scan for PAKs ---
Write-Host "Scanning for PAK files in: $ScanDir" -ForegroundColor Cyan
if (Test-Path $ScanDir) {
    $pakFiles = Get-ChildItem -Path $ScanDir -Filter "*.pak" -Recurse
    Write-Host "Found $($pakFiles.Count) PAK files." -ForegroundColor Green
}
else {
    Write-Host "WARNING: Scan Directory not found!" -ForegroundColor Yellow
    $pakFiles = @()
}

# --- Main Loop ---
$doLoop = $true

do {
    # 3. Ask for Search Term (Interactive Mode)
    # If not interactive (ResourcePath passed), we just run once and exit
    if ($interactiveMode) {
        Write-Host ""
        $searchTerm = Read-Host "What are you looking for? (e.g. 'M4A1', 'Arland', 'Tree')"
        
        if ([string]::IsNullOrWhiteSpace($searchTerm)) {
            Write-Host "No search term entered. Exiting." -ForegroundColor Yellow
            break
        }
    }
    else {
        $searchTerm = $ResourcePath
    }

    # Escape regex special characters for safe matching
    $searchPattern = [regex]::Escape($searchTerm)
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($searchTerm)

    Write-Host ""
    Write-Host "Configuration:"
    Write-Host "  Search: $searchTerm"
    Write-Host "  Scan:   $ScanDir"
    Write-Host "  Output: $OutputDir"
    Write-Host ""

    # --- Search ---
    Write-Host "Scanning PAK files for '$searchTerm'..." -ForegroundColor Yellow

    # Store matches as objects: { Pak, Path }
    $allMatches = @()

    foreach ($pak in $pakFiles) {
        # Check if the output contains our term loosely first
        # We assume pakFiles is already populated from the setup phase
        $inspectOutput = & $pakInspector inspect $pak.FullName 2>&1
        
        if ($inspectOutput -match $searchPattern) {
            $lines = $inspectOutput -split "`r`n"
            foreach ($line in $lines) {
                if ($line -match $searchPattern -and $line -notmatch "^\.\.\.") {
                    # Clean up line to get just the internal path
                    $cleanPath = $line.Trim()
                    if ($cleanPath.Contains("  ")) {
                        $cleanPath = ($cleanPath -split '\s+')[0]
                    }
                    
                    # Add to results
                    $allMatches += [PSCustomObject]@{
                        Pak      = $pak
                        Path     = $cleanPath
                        FileName = [System.IO.Path]::GetFileName($cleanPath)
                    }
                }
            }
        }
    }

    if ($allMatches.Count -eq 0) {
        Write-Host "No matches found for '$searchTerm'." -ForegroundColor Red
        if (-not $interactiveMode) {
            exit 1
        }
    }
    else {
        # --- Selection ---
        $selectedMatch = $null
        $foundPak = $null
        $foundPath = $null
        
        if ($allMatches.Count -eq 1) {
            $selectedMatch = $allMatches[0]
            Write-Host "Found 1 match: $($selectedMatch.Path)" -ForegroundColor Green
            $foundPak = $selectedMatch.Pak
            $foundPath = $selectedMatch.Path
            $fileName = [System.IO.Path]::GetFileNameWithoutExtension($selectedMatch.FileName)
        }
        else {
            # Simple deduplication just in case
            $uniqueMatches = $allMatches | Sort-Object Path -Unique
            
            Write-Host ""
            Write-Host "Found $($uniqueMatches.Count) matches. Please select one:" -ForegroundColor Cyan
            
            $i = 1
            foreach ($m in $uniqueMatches) {
                Write-Host "  [$i] $($m.Path)  (in $($m.Pak.Name))"
                $i++
            }
            
            $selection = 0
            while ($selection -lt 1 -or $selection -gt $uniqueMatches.Count) {
                Write-Host ""
                $inputStr = Read-Host "Select a number (1-$($uniqueMatches.Count))"
                if ([int]::TryParse($inputStr, [ref]$selection)) {
                    if ($selection -lt 1 -or $selection -gt $uniqueMatches.Count) {
                        Write-Host "Invalid selection." -ForegroundColor Red
                    }
                }
            }
            
            $selectedMatch = $uniqueMatches[$selection - 1]
            $foundPak = $selectedMatch.Pak
            $foundPath = $selectedMatch.Path
            $fileName = [System.IO.Path]::GetFileNameWithoutExtension($selectedMatch.FileName)
            
            Write-Host "Selected: $($foundPath)" -ForegroundColor Green
        }

        # Normalize path for extraction
        $foundPath = $foundPath.Replace("\", "/")
        
        # --- Extract ---
        Write-Host "Extracting..." -ForegroundColor Yellow
        
        # Clean temp dir for this run
        if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
        New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
        

        
        # Method 1: Extract with filter (-f)
        & $pakInspector extract $foundPak.FullName $tempDir -f $foundPath 2>&1 | Out-Null
        $extractedFiles = Get-ChildItem $tempDir -Recurse -Filter "*.edds" -ErrorAction SilentlyContinue

        # Method 2: Try -f -r (raw) flag
        if (-not $extractedFiles -or $extractedFiles.Count -eq 0) {
            & $pakInspector extract $foundPak.FullName $tempDir -f $foundPath -r 2>&1 | Out-Null
            $extractedFiles = Get-ChildItem $tempDir -Recurse -Filter "*.edds" -ErrorAction SilentlyContinue
        }
        
        if ($extractedFiles) {
            $extractedFile = $extractedFiles[0].FullName
            $extractedDir = [System.IO.Path]::GetDirectoryName($extractedFile)
            $extractedName = [System.IO.Path]::GetFileName($extractedFile)
            
            Write-Host "  Extracted: $extractedName" -ForegroundColor Green
            
            # --- Convert ---
            Write-Host "Converting to Image..." -ForegroundColor Yellow
            
            Push-Location $extractedDir
            $convertOutput = & $edds2image $extractedName 2>&1
            Pop-Location
            
            # edds2image often creates subfolders (png/, tif/) for output. 
            $allImages = @(Get-ChildItem $extractedDir -Recurse | Where-Object { $_.Extension -match "\.(png|tif|tga|jpg)$" })
            
            if ($allImages.Count -gt 0) {
                # Prioritize PNG, then TIF, then others
                $bestImage = $allImages | Sort-Object { 
                    switch ($_.Extension) {
                        ".png" { 1 }
                        ".tif" { 2 }
                        ".tga" { 3 }
                        Default { 9 }
                    }
                } | Select-Object -First 1

                $outputImage = $bestImage.FullName
                $ext = [System.IO.Path]::GetExtension($outputImage)
                
                # Ensure unique output name if file exists
                $baseOutput = Join-Path $OutputDir "$fileName$ext"
                $finalOutput = $baseOutput
                $counter = 1
                while (Test-Path $finalOutput) {
                    $finalOutput = Join-Path $OutputDir "${fileName}_${counter}$ext"
                    $counter++
                }
                
                Copy-Item $outputImage $finalOutput -Force
                
                Write-Host ""
                Write-Host "SUCCESS! Exported to: $finalOutput" -ForegroundColor Green
                
                if ($OpenFolder -eq "1" -and -not $interactiveMode) {
                    Invoke-Item $OutputDir
                }
            }
            else {
                Write-Host "ERROR: Conversion failed. No image found." -ForegroundColor Red
            }
        }
        else {
            Write-Host "ERROR: Extraction failed. No .edds files found." -ForegroundColor Red
        }
    }

    # Loop check
    if ($interactiveMode) {
        Write-Host ""
        $choice = Read-Host "Do you want to extract another file? (Y/N)"
        if ($choice -notmatch "^[Yy]") {
            $doLoop = $false
        }
    }
    else {
        # One-shot mode, exit loop
        $doLoop = $false
    }

} while ($doLoop)

# Cleanup temp directory
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Goodbye!" -ForegroundColor Gray
if ($interactiveMode) {
    Read-Host "Press Enter to close..."
}
