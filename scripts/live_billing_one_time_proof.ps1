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
  [switch]$AutoPoll,
  [switch]$PromptForSecret,
  [switch]$PromptForSupabaseServiceRole,
  [switch]$CacheStripeSecretOnly,
  [switch]$CacheSupabaseCredentialOnly,
  [switch]$PreflightOnly,
  [switch]$DisableOneTimeSecretCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$OneTimeStripeSecretCachePath = Join-Path $RepoRoot ".codex-qa\roleforge-stripe-secret.dpapi"
$OneTimeSupabaseCredentialCachePath = Join-Path $RepoRoot ".codex-qa\roleforge-supabase-admin.dpapi"
$LiveBillingProofEvidencePath = Join-Path $RepoRoot ".codex-qa\live-billing-proof.json"
if (-not $NodePath) {
  $BundledNode = "C:\Users\ashmi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  $NodePath = if (Test-Path $BundledNode) { $BundledNode } else { "node" }
}

function Import-LocalProofEnv {
  $envPath = Join-Path $RepoRoot ".env.local"
  if (-not (Test-Path -LiteralPath $envPath)) {
    return
  }

  $allowedKeys = @(
    "ROLEFORGE_STRIPE_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ACCESS_TOKEN"
  )

  foreach ($line in Get-Content -LiteralPath $envPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }
    if ($trimmed -notmatch "^([A-Za-z_][A-Za-z0-9_]*)=(.*)$") {
      continue
    }

    $name = $Matches[1]
    if ($allowedKeys -notcontains $name) {
      continue
    }
    if ([Environment]::GetEnvironmentVariable($name, "Process")) {
      continue
    }

    $value = $Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ($value) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

Import-LocalProofEnv

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

function Write-LiveBillingProofEvidence {
  param(
    [Parameter(Mandatory = $true)]$Proof,
    [Parameter(Mandatory = $true)]$Cleanup,
    [Parameter(Mandatory = $true)][string]$Interval
  )

  $evidenceDir = Split-Path -Parent $LiveBillingProofEvidencePath
  New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

  [ordered]@{
    completedAt = (Get-Date).ToUniversalTime().ToString("o")
    productionUrl = "https://roleforgeai.vercel.app"
    interval = $Interval
    checkoutMode = "live"
    checkoutSessionPrefix = $Proof.checkoutSessionPrefix
    proofUserIdMasked = $Proof.userIdMasked
    premiumActive = $true
    webhookVerified = $true
    cleanupUserDeleted = [bool]$Cleanup.userDeleted
    cleanupSubscriptionCanceled = [bool]$Cleanup.subscriptionCanceled
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $LiveBillingProofEvidencePath

  Write-Host "Wrote non-secret live billing proof evidence to .codex-qa\live-billing-proof.json."
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

$SecretCameFromClipboard = $false
$StripeSecretCacheUsed = $false
$SupabaseCredentialCacheUsed = $false

function Get-ClipboardTextSafe {
  try {
    $value = Get-Clipboard -Raw
    if ($null -eq $value) {
      return ""
    }
    return "$value"
  } catch {
    return ""
  }
}

function Clear-SecretClipboard {
  param(
    [string]$Text = ""
  )

  if (
    $Text -match "^sk_(live|test)_[A-Za-z0-9_\-]+$" -or
    $Text -match "^(sb_secret_|sbp_|eyJ)[A-Za-z0-9_\-.]+$" -or
    $SecretCameFromClipboard
  ) {
    Set-Clipboard -Value ""
  }
}

function Save-OneTimeSecretCache {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Description
  )

  if ($DisableOneTimeSecretCache) {
    return
  }

  $cacheDir = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
  Add-Type -AssemblyName System.Security
  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  $protected = [Security.Cryptography.ProtectedData]::Protect(
    $bytes,
    $null,
    [Security.Cryptography.DataProtectionScope]::CurrentUser
  )
  [Convert]::ToBase64String($protected) | Set-Content -LiteralPath $Path
  Write-Host "Stored $Description in a Windows-encrypted one-time cache for this proof run."
}

function Read-OneTimeSecretCache {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Description
  )

  if ($DisableOneTimeSecretCache -or -not (Test-Path -LiteralPath $Path)) {
    return ""
  }

  Add-Type -AssemblyName System.Security
  try {
    $protected = [Convert]::FromBase64String((Get-Content -LiteralPath $Path -Raw).Trim())
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect(
      $protected,
      $null,
      [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $value = [Text.Encoding]::UTF8.GetString($bytes)
  } catch {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    throw "The encrypted one-time $Description cache could not be decrypted and was removed. Secret value was not printed."
  }

  return $value.Trim()
}

function Save-OneTimeStripeSecret {
  param(
    [Parameter(Mandatory = $true)][string]$Value
  )

  Save-OneTimeSecretCache -Path $OneTimeStripeSecretCachePath -Value $Value -Description "the live Stripe secret"
}

function Read-OneTimeStripeSecret {
  $value = Read-OneTimeSecretCache -Path $OneTimeStripeSecretCachePath -Description "Stripe secret"
  if (-not $value) {
    return ""
  }

  if ($value -match "^sk_live_[A-Za-z0-9_\-]+$") {
    $script:StripeSecretCacheUsed = $true
    return $value.Trim()
  }

  Remove-Item -LiteralPath $OneTimeStripeSecretCachePath -Force -ErrorAction SilentlyContinue
  throw "The encrypted one-time Stripe secret cache was not valid and was removed. Secret value was not printed."
}

function Clear-OneTimeStripeSecret {
  Remove-Item -LiteralPath $OneTimeStripeSecretCachePath -Force -ErrorAction SilentlyContinue
}

function Save-OneTimeSupabaseCredential {
  param(
    [Parameter(Mandatory = $true)][string]$Value
  )

  Save-OneTimeSecretCache -Path $OneTimeSupabaseCredentialCachePath -Value $Value -Description "the Supabase admin credential"
}

function Read-OneTimeSupabaseCredential {
  $value = Read-OneTimeSecretCache -Path $OneTimeSupabaseCredentialCachePath -Description "Supabase admin credential"
  if (-not $value) {
    return $false
  }

  if ($value -match "^(sb_secret_|eyJ)[A-Za-z0-9_\-.]+$") {
    $script:SupabaseCredentialCacheUsed = $true
    $env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY = $value.Trim()
    return $true
  }

  if ($value -match "^sbp_[A-Za-z0-9_\-.]+$") {
    $script:SupabaseCredentialCacheUsed = $true
    $env:SUPABASE_ACCESS_TOKEN = $value.Trim()
    return $true
  }

  Remove-Item -LiteralPath $OneTimeSupabaseCredentialCachePath -Force -ErrorAction SilentlyContinue
  throw "The encrypted one-time Supabase admin credential cache was not valid and was removed. Secret value was not printed."
}

function Clear-OneTimeSupabaseCredential {
  Remove-Item -LiteralPath $OneTimeSupabaseCredentialCachePath -Force -ErrorAction SilentlyContinue
}

function Read-SupabaseCredentialFromClipboard {
  if ($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -or $env:SUPABASE_SERVICE_ROLE_KEY -or $env:SUPABASE_ACCESS_TOKEN) {
    return
  }

  $clipboard = (Get-ClipboardTextSafe).Trim()
  if ($clipboard -match "^(sb_secret_|eyJ)[A-Za-z0-9_\-.]+$") {
    $script:SecretCameFromClipboard = $true
    Save-OneTimeSupabaseCredential $clipboard
    $env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY = $clipboard
    Clear-SecretClipboard $clipboard
    Write-Host "Loaded Supabase service-role access from clipboard. Secret value was not printed."
    return
  }

  if ($clipboard -match "^sbp_[A-Za-z0-9_\-.]+$") {
    $script:SecretCameFromClipboard = $true
    Save-OneTimeSupabaseCredential $clipboard
    $env:SUPABASE_ACCESS_TOKEN = $clipboard
    Clear-SecretClipboard $clipboard
    Write-Host "Loaded Supabase access token from clipboard. Secret value was not printed."
  }
}

function Read-SupabaseServiceRole {
  if ($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -or $env:SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  Read-SupabaseCredentialFromClipboard
  if ($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -or $env:SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  if (Read-OneTimeSupabaseCredential) {
    if ($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -or $env:SUPABASE_SERVICE_ROLE_KEY) {
      Write-Host "Loaded Supabase service-role access from the Windows-encrypted one-time cache. Secret value was not printed."
      return
    }
    if ($env:SUPABASE_ACCESS_TOKEN) {
      Write-Host "Loaded Supabase access token from the Windows-encrypted one-time cache. Secret value was not printed."
    }
  }

  if ($env:SUPABASE_ACCESS_TOKEN) {
    Set-ServiceRoleFromSupabaseCli
    if ($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -or $env:SUPABASE_SERVICE_ROLE_KEY) {
      return
    }
  }

  if (-not $PromptForSupabaseServiceRole) {
    return
  }

  $secure = Read-Host "Paste the Supabase service-role key" -AsSecureString
  $prompted = ConvertFrom-SecureStringForProcess $secure
  $trimmed = $prompted.Trim()
  if ($trimmed -match "^(sb_secret_|eyJ)[A-Za-z0-9_\-.]+$") {
    Save-OneTimeSupabaseCredential $trimmed
    $env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY = $trimmed
    return
  }

  throw "Supabase service-role key did not look valid. Secret value was not printed."
}

function Read-LiveStripeSecret {
  $envSecret = @($env:ROLEFORGE_STRIPE_SECRET_KEY, $env:STRIPE_SECRET_KEY) | Where-Object { $_ -and $_.Trim() -match "^sk_live_[A-Za-z0-9_\-]+$" } | Select-Object -First 1
  if ($envSecret) {
    return $envSecret.Trim()
  }

  $cachedSecret = Read-OneTimeStripeSecret
  if ($cachedSecret) {
    Write-Host "Loaded the live Stripe secret from the Windows-encrypted one-time cache. Secret value was not printed."
    return $cachedSecret
  }

  $clipboard = (Get-ClipboardTextSafe).Trim()
  if ($clipboard -match "^sk_live_[A-Za-z0-9_\-]+$") {
    $script:SecretCameFromClipboard = $true
    Save-OneTimeStripeSecret $clipboard
    Clear-SecretClipboard $clipboard
    return $clipboard
  }
  if ($clipboard -match "^sk_test_[A-Za-z0-9_\-]+$") {
    Clear-SecretClipboard $clipboard
  }

  if ($PromptForSecret) {
    $secure = Read-Host "Paste the live Stripe secret key" -AsSecureString
    $prompted = ConvertFrom-SecureStringForProcess $secure
    if ($prompted -match "^sk_live_[A-Za-z0-9_\-]+$") {
      return $prompted.Trim()
    }
  }

  throw "No live Stripe secret key was available. Put exactly one sk_live_ value on the clipboard, set ROLEFORGE_STRIPE_SECRET_KEY, or rerun with -PromptForSecret. Secret value was not printed."
}

function Test-NodeRuntimeAvailable {
  if (Test-Path -LiteralPath $NodePath) {
    return $true
  }
  return [bool](Get-Command $NodePath -ErrorAction SilentlyContinue)
}

function Test-OneTimeSecretCache {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Kind
  )

  if ($DisableOneTimeSecretCache) {
    return [ordered]@{ present = $false; usable = $false; status = "disabled" }
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    return [ordered]@{ present = $false; usable = $false; status = "absent" }
  }

  Add-Type -AssemblyName System.Security
  try {
    $protected = [Convert]::FromBase64String((Get-Content -LiteralPath $Path -Raw).Trim())
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect(
      $protected,
      $null,
      [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $value = [Text.Encoding]::UTF8.GetString($bytes).Trim()
  } catch {
    return [ordered]@{ present = $true; usable = $false; status = "unreadable" }
  }

  if ($Kind -eq "stripe") {
    return [ordered]@{
      present = $true
      usable = [bool]($value -match "^sk_live_[A-Za-z0-9_\-]+$")
      status = if ($value -match "^sk_live_[A-Za-z0-9_\-]+$") { "live" } else { "invalid" }
    }
  }

  return [ordered]@{
    present = $true
    usable = [bool]($value -match "^(sb_secret_|sbp_|eyJ)[A-Za-z0-9_\-.]+$")
    status = if ($value -match "^sbp_[A-Za-z0-9_\-.]+$") { "access-token" } elseif ($value -match "^(sb_secret_|eyJ)[A-Za-z0-9_\-.]+$") { "service-role" } else { "invalid" }
  }
}

function Write-PreflightLine {
  param(
    [Parameter(Mandatory = $true)][bool]$Ok,
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Detail
  )

  $prefix = if ($Ok) { "PASS" } else { "FAIL" }
  Write-Host "$prefix ${Label}: $Detail"
}

function Test-LiveBillingProofPreflight {
  $nodeOk = Test-NodeRuntimeAvailable
  $clipboard = (Get-ClipboardTextSafe).Trim()
  $stripeCache = Test-OneTimeSecretCache -Path $OneTimeStripeSecretCachePath -Kind "stripe"
  $supabaseCache = Test-OneTimeSecretCache -Path $OneTimeSupabaseCredentialCachePath -Kind "supabase"

  $stripeEnvReady = [bool]((@($env:ROLEFORGE_STRIPE_SECRET_KEY, $env:STRIPE_SECRET_KEY) | Where-Object { $_ -and $_.Trim() -match "^sk_live_[A-Za-z0-9_\-]+$" } | Select-Object -First 1))
  $stripeClipboardReady = [bool]($clipboard -match "^sk_live_[A-Za-z0-9_\-]+$")
  $stripeReady = $stripeEnvReady -or [bool]$stripeCache.usable -or $stripeClipboardReady

  $supabaseEnvReady = [bool]((@($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY, $env:SUPABASE_SERVICE_ROLE_KEY, $env:SUPABASE_ACCESS_TOKEN) | Where-Object { $_ -and $_.Trim() -match "^(sb_secret_|sbp_|eyJ)[A-Za-z0-9_\-.]+$" } | Select-Object -First 1))
  $supabaseClipboardReady = [bool]($clipboard -match "^(sb_secret_|sbp_|eyJ)[A-Za-z0-9_\-.]+$")
  $supabaseReady = $supabaseEnvReady -or [bool]$supabaseCache.usable -or $supabaseClipboardReady

  $evidenceExists = Test-Path -LiteralPath $LiveBillingProofEvidencePath

  Write-Host "RoleForge live billing proof preflight"
  Write-PreflightLine -Ok $nodeOk -Label "Node runtime" -Detail $(if ($nodeOk) { "available" } else { "not found at configured path" })
  Write-PreflightLine -Ok $stripeReady -Label "Live Stripe secret source" -Detail $(if ($stripeEnvReady) { "server-only environment variable present" } elseif ($stripeCache.usable) { "Windows-encrypted one-time cache is usable" } elseif ($stripeClipboardReady) { "clipboard contains a live-looking key; value was not printed or cleared" } elseif ($stripeCache.present) { "cache is present but $($stripeCache.status)" } else { "missing; use -CacheStripeSecretOnly or set ROLEFORGE_STRIPE_SECRET_KEY" })
  Write-PreflightLine -Ok $supabaseReady -Label "Supabase admin source" -Detail $(if ($supabaseEnvReady) { "server-only environment variable or access token present" } elseif ($supabaseCache.usable) { "Windows-encrypted one-time cache is usable as $($supabaseCache.status)" } elseif ($supabaseClipboardReady) { "clipboard contains a service-role key or access token; value was not printed or cleared" } elseif ($supabaseCache.present) { "cache is present but $($supabaseCache.status)" } else { "missing; use -CacheSupabaseCredentialOnly, set a service-role env var, or ensure Supabase CLI auth is available for the full proof" })
  Write-PreflightLine -Ok $evidenceExists -Label "Existing proof evidence" -Detail $(if ($evidenceExists) { ".codex-qa\live-billing-proof.json exists; audit will verify freshness" } else { "not found; a completed checkout proof still needs to write it" })

  if ($clipboard -match "^sk_test_[A-Za-z0-9_\-]+$") {
    Write-Host "WARN Clipboard contains a Stripe test key. It was not printed or cleared by preflight."
  }
  if (-not $SkipVercelUpdate) {
    Write-Host "INFO Full proof will update Vercel STRIPE_SECRET_KEY and redeploy unless -SkipVercelUpdate or -SkipRedeploy is used."
  }

  return ($nodeOk -and $stripeReady -and $supabaseReady)
}

if ($PreflightOnly) {
  $ok = Test-LiveBillingProofPreflight
  if (-not $ok) {
    exit 1
  }
  exit 0
}

Push-Location $RepoRoot
$proofUserId = ""
$proofEvidence = $null
$cleanupEvidence = $null
$secret = ""
$exitCode = 0
$keepOneTimeSecretCache = $false

try {
  if ($CacheSupabaseCredentialOnly) {
    Read-SupabaseServiceRole
    $supabaseCredential = @($env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY, $env:SUPABASE_SERVICE_ROLE_KEY, $env:SUPABASE_ACCESS_TOKEN) | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1
    if (-not $supabaseCredential) {
      throw "No Supabase admin credential was available. Put exactly one service-role key or Supabase access token on the clipboard, or rerun with -PromptForSupabaseServiceRole. Secret value was not printed."
    }
    Save-OneTimeSupabaseCredential $supabaseCredential.Trim()
    $keepOneTimeSecretCache = $true
    Write-Host "Cached the Supabase admin credential for one proof retry and cleared it from the clipboard. Secret value was not printed."
  } else {
    $secret = Read-LiveStripeSecret
    $env:STRIPE_SECRET_KEY = $secret
    $env:ROLEFORGE_STRIPE_SECRET_KEY = $secret

    if ($CacheStripeSecretOnly) {
      Save-OneTimeStripeSecret $secret
      $keepOneTimeSecretCache = $true
      Write-Host "Cached the live Stripe secret for one proof retry and cleared it from the clipboard. Secret value was not printed."
    } else {
      if (-not $SkipVercelUpdate) {
        $secret | & $NodePath "scripts\set_vercel_billing_env.mjs" "STRIPE_SECRET_KEY"
        if ($LASTEXITCODE -ne 0) {
          throw "Failed to update STRIPE_SECRET_KEY in Vercel Production."
        }
      }

      if (-not $SkipRedeploy -and -not $SkipVercelUpdate) {
        Invoke-Vercel @("deploy", "--prod", "--scope", "team_kEe4HW272D5nYJDD92amj55H", "--yes")
      }

      try {
        Set-ServiceRoleFromSupabaseCli
      } catch {
        Read-SupabaseServiceRole
        if (-not $env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -and -not $env:SUPABASE_SERVICE_ROLE_KEY) {
          throw $_
        }
      }

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
      if ($AutoPoll) {
        Write-Host "Waiting up to $WaitSeconds seconds for Stripe webhook Premium activation."
      } else {
        Read-Host "Press Enter after Stripe Checkout returns to RoleForge"
      }

      $check = Invoke-NodeJson @("scripts\check_premium_entitlement.mjs", "--user-id", $proofUserId, "--wait-seconds", "$WaitSeconds")
      if (-not $check.ok) {
        throw "Premium entitlement did not activate before timeout. Last plan=$($check.plan), billingStatus=$($check.billingStatus)."
      }
      Write-Host "Premium entitlement is active for the proof user."
      $proofEvidence = $proof
    }
  }
} catch {
  $exitCode = 1
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  if ($proofUserId -and -not $KeepProofUser) {
    try {
      $cleanupEvidence = Invoke-NodeJson @("scripts\live_checkout_entitlement_test.mjs", "cleanup", "--user-id", $proofUserId)
      $cleanupEvidence | ConvertTo-Json -Depth 4 | Out-Host
      if ($proofEvidence -and $cleanupEvidence.userDeleted) {
        Write-LiveBillingProofEvidence -Proof $proofEvidence -Cleanup $cleanupEvidence -Interval $Interval
      }
    } catch {
      Write-Warning "Proof cleanup failed: $($_.Exception.Message)"
    }
  }

  Remove-Item Env:\STRIPE_SECRET_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\ROLEFORGE_STRIPE_SECRET_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Remove-Item Env:\ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  }
  Clear-SecretClipboard
  if ($exitCode -eq 0 -and -not $keepOneTimeSecretCache) {
    Clear-OneTimeStripeSecret
    Clear-OneTimeSupabaseCredential
  } elseif ($StripeSecretCacheUsed -or $SupabaseCredentialCacheUsed -or (Test-Path -LiteralPath $OneTimeStripeSecretCachePath) -or (Test-Path -LiteralPath $OneTimeSupabaseCredentialCachePath)) {
    Write-Host "Encrypted one-time secret cache kept for retry. It will be deleted after a successful proof cleanup."
  }
  $secret = ""
  Pop-Location
}

if ($exitCode -ne 0) {
  exit $exitCode
}
