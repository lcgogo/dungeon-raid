# 地牢突袭 · Windows PowerShell 版一站式脚本
# 用法：
#   方式1（推荐）: dr.bat <命令> [参数]
#   方式2: powershell -ExecutionPolicy Bypass -File dr.ps1 <命令> [参数]
#
# 命令列表：
#   test                跑全部烟测/回归（test/*.js）
#   deploy              部署当前文件到 Cloudflare Pages（dev 站更新）
#   release             晋级正式版：先过版本闸门，再同步 dev→prod + 提交 + push + 部署 + GitHub Release
#                       运行前请把提交说明写入 COMMIT_MSG.txt
#   gh-release [vX.Y.Z] 创建/更新 GitHub Release
#   integrity           核对正式版引擎 sha256 是否与 engines.json 登记一致
#   check-version [from to impact]  校验版本闸门（默认读正式版→开发版；impact=patch|verify）
#   classify <id> <ai|human>  把某条成绩在 人类榜↔AI榜 之间改判（需 $env:ADMIN_SECRET）
#   delete <id>         删除某条成绩（需 $env:ADMIN_SECRET）
#   prune [天数=30] [保留版本数=5]  手动清理旧版本+陈旧录像（需 $env:ADMIN_SECRET）
#   wipe                清空整个榜单（危险，需输入 YES 确认；需 $env:ADMIN_SECRET）
#   seed-debug          申请一枚调试种子（需 $env:DEBUG_SEED_SECRET；可绕过上传门槛）
#   backfill-releases   为 CHANGELOG 里每个版本补打 tag+release
#   bind-domains        把自定义域名绑定到 Pages 项目
#   help                显示本说明

$ErrorActionPreference = "Stop"

$PROJ = "dungeon-raid"
$ACCT = "5f2bcd334702a2c76245d5832c0cf767"

# ============ 辅助函数 ============

function sha256_of($file) {
    $hash = Get-FileHash $file -Algorithm SHA256
    return $hash.Hash.ToLower()
}

function ver_of($file) {
    $content = Get-Content $file -Raw
    if ($content -match "const VERSION='(v[\d\.]+)'") {
        return $matches[1]
    }
    return ""
}

function require_commit_msg {
    if (-not (Test-Path "COMMIT_MSG.txt")) {
        Write-Host "❌ 缺少 COMMIT_MSG.txt（提交说明）" -ForegroundColor Red
        Write-Host "   请在项目根目录创建 COMMIT_MSG.txt，内容为提交说明（可多行）"
        exit 1
    }
}

function require_verify_secret {
    if (-not $env:VERIFY_SECRET) {
        Write-Host "❌ 缺少环境变量 VERIFY_SECRET" -ForegroundColor Red
        exit 1
    }
}

function require_admin_secret {
    if (-not $env:ADMIN_SECRET) {
        Write-Host "❌ 缺少环境变量 ADMIN_SECRET" -ForegroundColor Red
        exit 1
    }
}

function require_debug_seed_secret {
    if (-not $env:DEBUG_SEED_SECRET) {
        Write-Host "❌ 缺少环境变量 DEBUG_SEED_SECRET" -ForegroundColor Red
        exit 1
    }
}

function cmd_check_version {
    node version-gate.js @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# ============ 各命令实现 ============

# ---------- integrity ----------
function cmd_integrity {
    $ver = ver_of "dungeon-raid.html"
    $hash = sha256_of "dungeon-raid.html"
    $engines = @{}
    if (Test-Path "engines.json") {
        $engines = Get-Content "engines.json" -Raw | ConvertFrom-Json
        # ConvertFrom-Json 返回的是 PSCustomObject，转成 hashtable
        $h = @{}
        $engines.PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value }
        $engines = $h
    }
    $want = if ($engines.ContainsKey($ver)) { $engines[$ver] } else { "" }

    Write-Host "正式版 $ver"
    Write-Host "  实际 sha256: $hash"
    Write-Host "  登记 sha256: $(if ($want) { $want } else { '（engines.json 无此版本）' })"
    if (-not $want) {
        Write-Host "  ⚠️ 未登记（新版本？发版时会自动写入）" -ForegroundColor Yellow
        return
    }
    if ($hash -eq $want) {
        Write-Host "  ✅ 一致，文件未被改动" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 不一致！文件与登记版本不符" -ForegroundColor Red
        exit 1
    }
}

# ---------- classify ----------
function cmd_classify($id, $agent) {
    if (-not $id -or ($agent -ne "ai" -and $agent -ne "human")) {
        Write-Host "用法: `$env:ADMIN_SECRET='...' .\dr.bat classify <id> <ai|human>"
        exit 1
    }
    require_admin_secret
    $body = @{ id = $id; agent = $agent } | ConvertTo-Json -Compress
    curl -s -X POST "https://api.dungeonraid.win/classify?k=$env:ADMIN_SECRET" `
        -H "Content-Type: application/json" -d $body
    Write-Host ""
}

# ---------- delete ----------
function cmd_delete($id) {
    if (-not $id) {
        Write-Host "用法: `$env:ADMIN_SECRET='...' .\dr.bat delete <id>"
        exit 1
    }
    require_admin_secret
    $body = @{ op = "del"; id = $id } | ConvertTo-Json -Compress
    curl -s -X POST "https://api.dungeonraid.win/admin?k=$env:ADMIN_SECRET" `
        -H "Content-Type: application/json" -d $body
    Write-Host ""
}

# ---------- prune ----------
function cmd_prune($days=30, $keep=5) {
    require_admin_secret
    $body = @{ op = "prune"; days = [int]$days; keep = [int]$keep } | ConvertTo-Json -Compress
    curl -s -X POST "https://api.dungeonraid.win/admin?k=$env:ADMIN_SECRET" `
        -H "Content-Type: application/json" -d $body
    Write-Host ""
}

# ---------- wipe ----------
function cmd_wipe {
    require_admin_secret
    Write-Host "⚠️  将删除 scores 表【全部】成绩（人类榜+AI榜+破关榜，不可恢复）。输入 YES 确认: " -NoNewline
    $ans = Read-Host
    if ($ans -ne "YES") { Write-Host "已取消"; exit 1 }
    $body = @{ op = "wipe"; confirm = "YES" } | ConvertTo-Json -Compress
    curl -s -X POST "https://api.dungeonraid.win/admin?k=$env:ADMIN_SECRET" `
        -H "Content-Type: application/json" -d $body
    Write-Host ""
}

# ---------- seed-debug ----------
function cmd_seed_debug {
    require_debug_seed_secret
    curl -s -X POST "https://api.dungeonraid.win/seed-debug?k=$env:DEBUG_SEED_SECRET" `
        -H "Content-Type: application/json"
    Write-Host ""
}

# ---------- test ----------
function cmd_test {
    $fail = 0
    $tests = @("finaltest", "milestonetest", "savetest", "sticktest")
    foreach ($t in $tests) {
        Write-Host ("{0,-14}" -f $t) -NoNewline
        $jsPath = "test\$t.js"
        node $jsPath > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PASS" -ForegroundColor Green
        } else {
            Write-Host "FAIL" -ForegroundColor Red
            $fail = 1
        }
    }
    exit $fail
}

# ---------- embed-changelog ----------
function cmd_embed_changelog($files) {
    if (-not $files -or $files.Count -eq 0) { $files = @("dungeon-raid-dev.html") }
    $argList = @()
    foreach ($f in $files) { $argList += $f }
    node embed-changelog.js @argList
}

# ---------- deploy ----------
function cmd_deploy {
    # dev 站更新前先注入最新更新日志（只动 dev）
    cmd_embed_changelog @("dungeon-raid-dev.html")

    if (Test-Path "public") { Remove-Item "public" -Recurse -Force }
    New-Item -ItemType Directory -Path "public\functions" -Force > $null

    $prodVer = ver_of "dungeon-raid.html"
    $devVer = ver_of "dungeon-raid-dev.html"
    $home = Get-Content "index.html" -Raw
    $home = $home.Replace('<small>Play · Release<span id="prodVer"></span></small>', "<small>Play · Release · $prodVer</small>")
    $home = $home.Replace('<a class="dev" href="./dungeon-raid-dev.html">🚧 开发版 DEV · 最新 / 独立存档<span id="devVer"></span></a>', ('<a class="dev" href="./dungeon-raid-dev.html">🚧 开发版 DEV · 最新 / 独立存档 · {0}</a>' -f $devVer))
    if ($home.Contains("fetch('versions.json'") -or $home.Contains('id="prodVer"') -or $home.Contains('id="devVer"')) {
        throw "homepage version injection failed"
    }
    $home | Out-File "public\index.html" -Encoding utf8

    # public/ 里放：
    #   index.html         = 首页（版本号已在构建期注入）
    #   dungeon-raid.html = 正式版（显式访问）
    #   dungeon-raid-dev.html = dev 版（dev 域名通过 Cloudflare Pages 设置指向此文件）
    Copy-Item "dungeon-raid.html" "public\dungeon-raid.html"
    Copy-Item "dungeon-raid-dev.html" "public\dungeon-raid-dev.html"
    Copy-Item "apple-touch-icon.png" "public\apple-touch-icon.png" -Force
    Copy-Item "icon-192.png" "public\icon-192.png" -Force
    Copy-Item "icon-512.png" "public\icon-512.png" -Force
    Copy-Item "manifest.webmanifest" "public\manifest.webmanifest" -Force
    Copy-Item "pages\functions\_middleware.js" "public\functions\" -Force

    Write-Host "public/ 内容（应只有网页文件，无私钥）:"
    Get-ChildItem "public" -Recurse | Format-Table Name, Length

    # 创建 Pages 项目（已存在则忽略错误）
    npx --yes wrangler pages project create $PROJ --production-branch=main 2>$null
    # 部署
    npx --yes wrangler pages deploy public --project-name=$PROJ --branch=main --commit-dirty=true
}

# ---------- gh-release ----------
function cmd_gh_release($VER="") {
    if (-not $VER) {
        $VER = ver_of "dungeon-raid.html"
    }
    if (-not $VER) {
        Write-Host "⚠️ 无法解析版本号，跳过 GitHub Release" -ForegroundColor Yellow
        return
    }
    # 从 CHANGELOG.md 提取该版本的 notes
    $cl = Get-Content "CHANGELOG.md" -Raw
    $notesFile = "RELNOTES_$VER.txt"
    $inSec = $false
    $notes = @()
    foreach ($line in ($cl -split "`r?`n")) {
        if ($line -match "^## \[$VER\]") { $inSec = $true; continue }
        if ($inSec) {
            if ($line -match "^## \[") { break }
            $notes += $line
        }
    }
    if ($notes.Count -eq 0) { $notes = @($VER) }
    $notes | Out-File $notesFile -Encoding utf8

    $existing = gh release view $VER 2>&1
    if ($LASTEXITCODE -eq 0) {
        gh release edit $VER --title $VER --notes-file $notesFile
        Write-Host "🔖 GitHub Release $VER 已更新"
    } else {
        gh release create $VER --title $VER --notes-file $notesFile --target main
        Write-Host "🔖 GitHub Release $VER 已创建"
    }
    Remove-Item $notesFile -Force -ErrorAction SilentlyContinue
}

# ---------- release ----------
function cmd_release {
    require_commit_msg
    cmd_check_version

    # 0) 把最新 CHANGELOG 摘要注入 dev
    cmd_embed_changelog @("dungeon-raid-dev.html")

    # 1) 同步 dev → 正式版（两文件仅 const DEV 一行不同）
    Copy-Item "dungeon-raid-dev.html" "dungeon-raid.html" -Force
    # 把 DEV=true 改成 DEV=false
    $content = Get-Content "dungeon-raid.html" -Raw
    $content = $content -replace "const DEV=true;", "const DEV=false;   // release build (DEV=false); dev build is dungeon-raid-dev.html (DEV=true)"
    Set-Content "dungeon-raid.html" $content -NoNewline -Encoding UTF8

    Write-Host "两文件差异（应仅 DEV 一行）:"
    git diff --no-index dungeon-raid.html dungeon-raid-dev.html 2>$null

    # 2) 登记正式版引擎 sha256
    $ver = ver_of "dungeon-raid.html"
    $hash = sha256_of "dungeon-raid.html"
    if (-not (Test-Path "engines")) { New-Item -ItemType Directory -Path "engines" -Force > $null }
    Copy-Item "dungeon-raid.html" ("engines\{0}.html" -f $ver) -Force
    $engines = @{}
    if (Test-Path "engines.json") {
        $raw = Get-Content "engines.json" -Raw | ConvertFrom-Json
        $raw.PSObject.Properties | ForEach-Object { $engines[$_.Name] = $_.Value }
    }
    $engines[$ver] = $hash
    $engines | ConvertTo-Json -Compress:$false | Out-File "engines.json" -Encoding utf8
    Write-Host "🔏 engines.json 登记 $ver → $hash（快照: engines\$ver.html）"

    # 3) 提交 + 推送（需要 GIT_SSL_NO_VERIFY=1）
    $env:GIT_SSL_NO_VERIFY = "1"
    git add -A
    git commit -F COMMIT_MSG.txt
    git push

    # 4) 部署 Pages
    cmd_deploy

    # 5) GitHub Release
    cmd_gh_release

    Write-Host "✅ 发版完成。" -ForegroundColor Green
}

# ---------- backfill-releases ----------
function cmd_backfill_releases {
    git push > $null 2>&1
    $changelog = Get-Content "CHANGELOG.md" -Raw
    $versions = [regex]::Matches($changelog, '(?m)^## \[(v[\d\.]+)\]') | ForEach-Object { $_.Groups[1].Value }
    foreach ($V in $versions) {
        $COMMIT = git log --format='%H %s' | Select-String $V | Select-Object -First 1
        if (-not $COMMIT) {
            Write-Host "⚠️  $V 找不到对应提交，跳过"
            continue
        }
        $COMMIT_HASH = ($COMMIT -split ' ')[0]
        $existing = gh release view $V 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "↩︎  $V 已存在，跳过"
            continue
        }
        # 提取该版本的 changelog notes
        $inSec = $false
        $notes = @()
        foreach ($line in ($changelog -split "`r?`n")) {
            if ($line -match "^## \[$V\]") { $inSec = $true; continue }
            if ($inSec) {
                if ($line -match "^## \[") { break }
                $notes += $line
            }
        }
        $notesFile = "RELNOTES_$V.txt"
        $notes | Out-File $notesFile -Encoding utf8
        gh release create $V --target $COMMIT_HASH --title $V --notes-file $notesFile
        Remove-Item $notesFile -Force -ErrorAction SilentlyContinue
        Write-Host "✓  $V → $($COMMIT_HASH.Substring(0,8))"
    }
    Write-Host "✅ 完成。"
}

# ---------- bind-domains ----------
function cmd_bind_domains {
    # 找 wrangler config
    $cfgPaths = @(
        "$env:USERPROFILE\AppData\Roaming\.wrangler\config\default.toml",
        "$env:USERPROFILE\.config\.wrangler\config\default.toml"
    )
    $cfg = $cfgPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $cfg) {
        Write-Host "找不到 wrangler config，先 npx wrangler login" -ForegroundColor Red
        exit 1
    }
    $toml = Get-Content $cfg -Raw
    $TOKEN = [regex]::Match($toml, 'oauth_token\s*=\s*"([^"]+)"').Groups[1].Value
    if (-not $TOKEN) {
        Write-Host "找不到 wrangler oauth_token" -ForegroundColor Red
        exit 1
    }
    foreach ($D in @("dungeonraid.win", "dev.dungeonraid.win")) {
        Write-Host "绑定 $D ..."
        $body = @{ name = $D } | ConvertTo-Json -Compress
        curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/$PROJ/domains" `
            -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d $body `
            | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j.success?'  ✓ 已绑定 '+(j.result&&j.result.name):'  ✗ '+JSON.stringify(j.errors));}catch(e){console.log('  解析失败:',s.slice(0,200));}})"
    }
    Write-Host "完成。证书签发可能要一两分钟。"
}

# ---------- help ----------
function cmd_help {
    Write-Host @"
用法: dr.bat <命令> [参数]

命令列表:
  test                跑全部烟测/回归（test/*.js）
  deploy              部署当前文件到 Cloudflare Pages（dev 站更新）
  release             晋级正式版（需提前创建 COMMIT_MSG.txt）
  gh-release [vX.Y.Z] 创建/更新 GitHub Release
  integrity           核对正式版引擎 sha256 是否与 engines.json 登记一致
  check-version [from to impact]  校验版本闸门（默认读正式版→开发版）
  classify <id> <ai|human>  改判成绩所属榜单（需 ADMIN_SECRET）
  delete <id>         删除某条成绩（需 ADMIN_SECRET）
  prune [天数] [保留数]  手动清理旧版本+陈旧录像（需 ADMIN_SECRET）
  wipe                清空整个榜单（需输入 YES 确认；需 ADMIN_SECRET）
  seed-debug          申请调试 seed（需 DEBUG_SEED_SECRET）
  backfill-releases   为 CHANGELOG 里每个版本补打 tag+release
  bind-domains        绑定自定义域名到 Pages 项目
  help                显示本说明
"@
}

# ---------- main ----------
$cmd = if ($args.Count -gt 0) { $args[0] } else { "help" }
$restArgs = @()
if ($args.Count -gt 1) { $restArgs = $args[1..($args.Count-1)] }

switch ($cmd) {
    "test"              { cmd_test }
    "deploy"            { cmd_deploy }
    "release"           { cmd_release }
    "gh-release"        { cmd_gh_release @restArgs }
    "integrity"         { cmd_integrity }
    "check-version"     { cmd_check_version @restArgs }
    "embed-changelog"   { cmd_embed_changelog @restArgs }
    "classify"          { cmd_classify $restArgs[0] $restArgs[1] }
    "delete"            { cmd_delete $restArgs[0] }
    "prune"             { cmd_prune $restArgs[0] $restArgs[1] }
    "wipe"              { cmd_wipe }
    "seed-debug"        { cmd_seed_debug }
    "backfill-releases" { cmd_backfill_releases }
    "bind-domains"      { cmd_bind_domains }
    default             { cmd_help }
}
