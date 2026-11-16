$ErrorActionPreference = 'Stop'
$env:AGAP_CAPACITOR_LOCAL_TEST = 'true'

npm run build
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

npx cap sync android
exit $LASTEXITCODE
