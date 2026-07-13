param(
  [Parameter(Mandatory = $false)]
  [ValidatePattern("^\d+\.\d+\.\d+$")]
  [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$installerUrl = "https://github.com/Nulera/Atena-multi-agent/releases/download/v$Version/Atena_${Version}_x64-setup.exe"

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "WinGet não está instalado neste Windows."
}

if (-not (Get-Command wingetcreate -ErrorAction SilentlyContinue)) {
  Write-Host "Instalando o gerador oficial de manifestos do WinGet..."
  winget install --id Microsoft.WingetCreate --exact --accept-package-agreements --accept-source-agreements
}

Write-Host "Criando o manifesto AtenaProject.Atena a partir de:"
Write-Host $installerUrl
Write-Host ""
Write-Host "Use PackageIdentifier: AtenaProject.Atena"
Write-Host "Use Publisher: Atena Project"
Write-Host "Use PackageName: Atena"
Write-Host ""

wingetcreate new $installerUrl
