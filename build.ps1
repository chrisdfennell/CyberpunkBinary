param(
    [string]$Device = "fenix7",
    [switch]$Run,
    [switch]$Export
)

# 1. Setup Java Environment
$env:JAVA_HOME = "C:\Program Files\Android\openjdk\jdk-21.0.8"
$env:PATH = "C:\Program Files\Android\openjdk\jdk-21.0.8\bin;" + $env:PATH

# 2. Define Garmin SDK Paths
$sdkDir = "C:\Users\christopher.fennell\AppData\Roaming\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-9.1.0-2026-03-09-6a872a80b"
$sdkBin = "$sdkDir\bin"

# 3. Create output directory if it doesn't exist
if (!(Test-Path -Path "bin")) {
    New-Item -ItemType Directory -Path "bin" | Out-Null
}

# 4. Build the project
$monkeyc = Join-Path $sdkBin "monkeyc.bat"
$junglePath = Join-Path $PSScriptRoot "monkey.jungle"
$keyPath = Join-Path $PSScriptRoot "developer_key.der"

if ($Export) {
    Write-Host "Packaging application for Connect IQ Store (.iq)..." -ForegroundColor Cyan
    $outputPath = Join-Path $PSScriptRoot "bin\BinaryWatchFace.iq"
    & $monkeyc -e -f $junglePath -o $outputPath -y $keyPath
} else {
    Write-Host "Building for device: $Device..." -ForegroundColor Cyan
    $outputPath = Join-Path $PSScriptRoot "bin\BinaryWatchFace.prg"
    & $monkeyc -f $junglePath -o $outputPath -y $keyPath -d $Device
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Compilation failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

if ($Export) {
    Write-Host "Package Succeeded! Output: bin\BinaryWatchFace.iq" -ForegroundColor Green
} else {
    Write-Host "Build Succeeded! Output: bin\BinaryWatchFace.prg" -ForegroundColor Green
}

# 5. Launch in Simulator if requested
if ($Run) {
    Write-Host "Checking if Simulator is running..." -ForegroundColor Cyan
    $simProcess = Get-Process -Name "simulator" -ErrorAction SilentlyContinue
    if (!$simProcess) {
        Write-Host "Starting Connect IQ Simulator..." -ForegroundColor Cyan
        $simulator = Join-Path $sdkBin "simulator.exe"
        Start-Process -FilePath $simulator
        Start-Sleep -Seconds 4 # Give it a moment to boot
    } else {
        Write-Host "Simulator is already running." -ForegroundColor Cyan
    }

    Write-Host "Deploying to $Device in simulator (copying to space-free path to support settings)..." -ForegroundColor Cyan
    $tempDir = "C:\Garmin_Temp"
    if (!(Test-Path -Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir | Out-Null
    }
    $tempPrg = Join-Path $tempDir "BinaryWatchFace.prg"
    Copy-Item $outputPath $tempPrg -Force
    
    $settingsSrc = Join-Path $PSScriptRoot "bin\BinaryWatchFace-settings.json"
    $settingsNames = @(
        "BinaryWatchFace-settings.json",
        "BinaryWatchFace.json",
        "Binary Watch-settings.json",
        "Binary Watch.json",
        "Binary_Watch-settings.json",
        "Binary_Watch.json",
        "BINARYWATCHFACE.json",
        "9b0af51a-2c01-42bc-bb85-e3df17893ec6.json",
        "9b0af51a-2c01-42bc-bb85-e3df17893ec6-settings.json"
    )
    foreach ($name in $settingsNames) {
        Copy-Item $settingsSrc (Join-Path $tempDir $name) -Force
    }

    $monkeydo = Join-Path $sdkBin "monkeydo.bat"
    & $monkeydo $tempPrg $Device
}
