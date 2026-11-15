# One-time publish: creates github.com/notsoweedy/papers-decoded, pushes this folder,
# and turns on GitHub Pages. It then rebuilds the personal website and pushes its docs/
# folder to notsoweedy.github.io, so the site's "papers/" link goes live.
# Safe to run again; it skips steps that are already done.
param(
    [switch]$SkipWebsite,
    [string]$WebsiteDir = "$env:USERPROFILE\personal-website",
    [string]$Hugo = "$env:USERPROFILE\tools\hugo-0.169.0\hugo.exe"
)
$ErrorActionPreference = 'Continue'
$Owner = 'notsoweedy'
$Repo = 'papers-decoded'
$SiteUrl = "https://$Owner.github.io/$Repo/"
Set-Location $PSScriptRoot

$gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
if (-not $gh) {
    foreach ($p in @("$env:ProgramFiles\GitHub CLI\gh.exe", "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe")) {
        if (Test-Path $p) { $gh = $p; break }
    }
}
if (-not $gh) {
    Write-Host 'Installing the GitHub CLI...'
    winget install --id GitHub.cli -e --silent --accept-package-agreements --accept-source-agreements
    $gh = "$env:ProgramFiles\GitHub CLI\gh.exe"
    if (-not (Test-Path $gh)) { throw 'GitHub CLI install failed. Install it from https://cli.github.com and run this script again.' }
}

& $gh auth status --hostname github.com *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Sign in to GitHub as notsoweedy. A browser window will open; paste the one-time code shown here.'
    & $gh auth login --hostname github.com --git-protocol https --web --scopes repo
    if ($LASTEXITCODE -ne 0) { throw 'GitHub sign-in did not finish. Run this script again.' }
}
$login = (& $gh api user --jq .login).Trim()
if ($login -ne $Owner) {
    throw "You're signed in to GitHub as '$login', not '$Owner'. Run 'gh auth login' and sign in as $Owner, then run this script again."
}
& $gh auth setup-git | Out-Null

if (-not (Test-Path .git)) { throw 'This folder is not a Git repository. Run: git init -b main, then commit.' }
if (git status --porcelain) {
    git add -A
    git commit -m "Update guides" | Out-Null
}

& $gh repo view "$Owner/$Repo" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating github.com/$Owner/$Repo..."
    & $gh repo create "$Owner/$Repo" --public `
        --description 'Papers and essays on systems for ML, rebuilt as interactive guides anyone can follow.' `
        --homepage $SiteUrl
    if ($LASTEXITCODE -ne 0) { throw 'Creating the repository failed.' }
}

if (-not (git remote | Select-String -Quiet '^origin$')) {
    git remote add origin "https://github.com/$Owner/$Repo.git"
}
git push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed.' }

& $gh api "repos/$Owner/$Repo/pages" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Turning on GitHub Pages...'
    & $gh api -X POST "repos/$Owner/$Repo/pages" -f 'source[branch]=main' -f 'source[path]=/' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Turning on Pages failed. In the repo, open Settings > Pages and publish branch 'main', folder '/ (root)'." }
}

Write-Host ''
Write-Host "Published. The site will be live in about a minute at $SiteUrl"
Write-Host "Repository: https://github.com/$Owner/$Repo"

if ($SkipWebsite) { return }

# Same as the README's manual upload: rebuild docs/ and copy it over the live repo's docs/.
# Files are added or overwritten, never deleted.
Write-Host ''
Write-Host 'Updating notsoweedy.github.io with the new papers/ link...'
if (-not (Test-Path $Hugo)) { throw "Hugo not found at $Hugo. Pass -Hugo <path to hugo.exe>, or run with -SkipWebsite." }
& $Hugo --source $WebsiteDir --gc --minify --destination (Join-Path $WebsiteDir 'docs')
if ($LASTEXITCODE -ne 0) { throw 'Website build failed.' }

$tmp = Join-Path $env:TEMP "notsoweedy-site-$(Get-Random)"
git clone --quiet --depth 1 "https://github.com/$Owner/$Owner.github.io.git" $tmp
if ($LASTEXITCODE -ne 0) { throw 'Could not clone the website repository.' }
try {
    Copy-Item (Join-Path $WebsiteDir 'docs\*') (Join-Path $tmp 'docs') -Recurse -Force
    git -C $tmp add docs
    if (git -C $tmp status --porcelain) {
        git -C $tmp -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit --quiet -m 'Rebuild site: link papers-decoded'
        git -C $tmp push --quiet
        if ($LASTEXITCODE -ne 0) { throw 'Pushing the website failed.' }
        Write-Host 'Website updated. https://notsoweedy.github.io/ will show the papers/ link in about a minute.'
    } else {
        Write-Host 'Website already up to date.'
    }
} finally {
    Set-Location $PSScriptRoot
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
