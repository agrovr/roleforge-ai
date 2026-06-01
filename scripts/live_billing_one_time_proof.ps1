[CmdletBinding()]
param(
  [ValidateSet("month", "year")]
  [string]$Interval = "month",

  [int]$WaitSeconds = 120,

  [string]$NodePath = $env:ROLEFORGE_NODE_PATH,

  [switch]$SkipVercelUpdate,
  [switch]$SkipRedeploy,
  [switch]$KeepProofUser,
  [switch]$CopyPromoCode,
  [switch]$PromptForSecret
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $NodePath) {
  $BundledNode = "C:\Users\ashmi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  $NodePath = if (Test-Path $BundledNode) { $BundledNode } else { "node" }
}

function Invoke-NodeJson {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $output = & $NodePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Node command failed: $($Arguments -join ' ')"
  }
  return ($output | Out-String | ConvertFrom-Json)
}

function Set-ServiceRoleFromSupabaseCli {
  if ($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -or $env:SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  $keysJson = (npx supabase projects api-keys --project-ref ijdspodwpkuhwszmvqip --output json) | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "Could not read Supabase service-role key. Run supabase login or set ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY for this shell."
  }

  $serviceKey = (($keysJson | ConvertFrom-Json) | Where-Object { $_.id -eq "service_role" } | Select-Object -First 1).api_key
  if (-not $serviceKey) {
    throw "Supabase API keys did not include a service_role key."
  }

  $env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY = $serviceKey
}

function Invoke-Vercel {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & npx vercel @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Vercel command failed: vercel $($Arguments -join ' ')"
  }
}

function ConvertFrom-SecureStringForProcess {
  param(
    [Parameter(Mandatory = $true)][securestring]$Value
  )

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Read-LiveStripeSecret {
  $envSecret = @($env:ROLEFORGE_STRIPE_SECRET_KEY, $env:STRIPE_SECRET_KEY) | Where-Object { $_ -and $_.Trim() -match "^sk_live_[A-Za-z0-9_]+$" } | Select-Object -First 1
  if ($envSecret) {
    return $envSecret.Trim()
  }

  $clipboard = (Get-Clipboard -Raw).Trim()
  if ($clipboard -match "^sk_live_[A-Za-z0-9_]+$") {
    Set-Clipboard -Value ""
    return $clipboard
  }

  if ($PromptForSecret) {
    $secure = Read-Host "Paste the live Stripe secret key" -AsSecureString
    $prompted = ConvertFrom-SecureStringForProcess $secure
    if ($prompted -match "^sk_live_[A-Za-z0-9_]+$") {
      return $prompted.Trim()
    }
  }

  throw "No live Stripe secret key was available. Put exactly one sk_live_ value on the clipboard, set ROLEFORGE_STRIPE_SECRET_KEY, or rerun with -PromptForSecret. Secret value was not printed."
}

Push-Location $RepoRoot
$proofUserId = ""
$secret = ""
$exitCode = 0

try {
  $secret = Read-LiveStripeSecret
  $env:STRIPE_SECRET_KEY = $secret
  $env:ROLEFORGE_STRIPE_SECRET_KEY = $secret

  if (-not $SkipVercelUpdate) {
    $secret | & $NodePath "scripts\set_vercel_billing_env.mjs" "STRIPE_SECRET_KEY"
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to update STRIPE_SECRET_KEY in Vercel Production."
    }
  }

  if (-not $SkipRedeploy -and -not $SkipVercelUpdate) {
    Invoke-Vercel @("deploy", "--prod", "--scope", "team_kEe4HW272D5nYJDD92amj55H", "--yes")
  }

  Set-ServiceRoleFromSupabaseCli

  $promo = Invoke-NodeJson @("scripts\create_live_promo_code.mjs", "--expires-hours", "24", "--max-redemptions", "1")
  Write-Host "Created one-use live promo code: $($promo.code)"
  if ($CopyPromoCode) {
    Set-Clipboard -Value $promo.code
    Write-Host "Promo code copied to clipboard. The Stripe secret key is no longer on the clipboard."
  }

  $proof = Invoke-NodeJson @("scripts\live_checkout_entitlement_test.mjs", "start", "--interval", $Interval)
  $proofUserId = $proof.userId
  Write-Host "Temporary proof user: $($proof.email)"
  Write-Host "Checkout URL: $($proof.checkoutUrl)"
  Write-Host "Use the promo code above in Stripe Checkout, complete checkout, then return here."
  Start-Process $proof.checkoutUrl
  Read-Host "Press Enter after Stripe Checkout returns to RoleForge"

  $check = Invoke-NodeJson @("scripts\check_premium_entitlement.mjs", "--user-id", $proofUserId, "--wait-seconds", "$WaitSeconds")
  if (-not $check.ok) {
    throw "Premium entitlement did not activate before timeout. Last plan=$($check.plan), billingStatus=$($check.billingStatus)."
  }
  Write-Host "Premium entitlement is active for the proof user."
} catch {
  $exitCode = 1
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  if ($proofUserId -and -not $KeepProofUser) {
    try {
      & $NodePath "scripts\live_checkout_entitlement_test.mjs" "cleanup" "--user-id" $proofUserId | Out-Host
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "Proof cleanup command exited with code $LASTEXITCODE."
      }
    } catch {
      Write-Warning "Proof cleanup failed: $($_.Exception.Message)"
    }
  }

  Remove-Item Env:\STRIPE_SECRET_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\ROLEFORGE_STRIPE_SECRET_KEY -ErrorAction SilentlyContinue
  if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Remove-Item Env:\ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  }
  $secret = ""
  Pop-Location
}

if ($exitCode -ne 0) {
  exit $exitCode
}
