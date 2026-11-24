[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Branch,
    [string]$Message = 'Improve guessing arena integration',
    [switch]$Push
)
$ErrorActionPreference='Stop'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw '未找到 Git。' }
& git rev-parse --show-toplevel | Out-Null
if ($LASTEXITCODE -ne 0) { throw '请先进入已有 Git 仓库；本脚本不会初始化仓库或修改远程地址。' }
$current=(& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $current -ne $Branch) { throw '当前分支与 -Branch 不一致，请先检查分支。' }
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { throw '没有已暂存的改动；请先检查文件并手动 git add。' }
if ($LASTEXITCODE -ne 1) { throw '无法检查暂存区。' }
Write-Host '即将提交已暂存的文件：'
& git diff --cached --stat
& git commit -m $Message
if ($LASTEXITCODE -ne 0) { throw '提交失败。' }
if ($Push) {
    & git remote get-url origin | Out-Null
    if ($LASTEXITCODE -ne 0) { throw '未配置 origin；本脚本不会修改远程地址。' }
    & git push -u origin $Branch
    if ($LASTEXITCODE -ne 0) { throw '推送失败。' }
} else { Write-Host '已创建本地提交。未推送；要推送请显式使用 -Push。' }
